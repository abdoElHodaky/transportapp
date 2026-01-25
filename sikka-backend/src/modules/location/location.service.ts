import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Location } from '../../entities/location.entity';
import { User } from '../../entities/user.entity';
import { Trip } from '../../entities/trip.entity';
import Redis from 'ioredis';

export interface LocationUpdateDto {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  source?: 'gps' | 'network' | 'manual' | 'estimated';
  batteryLevel?: number;
  networkType?: string;
}

export interface NearbyDriversQuery {
  latitude: number;
  longitude: number;
  radius?: number; // in meters, default 5000
  limit?: number; // default 10
  tripType?: 'standard' | 'premium' | 'shared' | 'delivery';
}

export interface RouteCalculationDto {
  pickupLatitude: number;
  pickupLongitude: number;
  dropoffLatitude: number;
  dropoffLongitude: number;
  tripType?: 'standard' | 'premium' | 'shared' | 'delivery';
}

export interface RouteResult {
  distance: number; // in kilometers
  duration: number; // in minutes
  estimatedFare: number;
  waypoints?: Array<{ latitude: number; longitude: number }>;
}

@Injectable()
export class LocationService {
  private redis: Redis;

  constructor(
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Trip)
    private tripRepository: Repository<Trip>,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {
    // Initialize Redis for location caching
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });
  }

  async updateUserLocation(userId: string, locationData: LocationUpdateDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create location record
    const location = this.locationRepository.create({
      userId,
      type: user.role === 'driver' ? 'driver_location' : 'user_location',
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      altitude: locationData.altitude,
      accuracy: locationData.accuracy,
      speed: locationData.speed,
      heading: locationData.heading,
      source: locationData.source || 'gps',
      batteryLevel: locationData.batteryLevel,
      networkType: locationData.networkType,
      recordedAt: new Date(),
    });

    const savedLocation = await this.locationRepository.save(location);

    // Update user's current location
    await this.userRepository.update(userId, {
      currentLatitude: locationData.latitude,
      currentLongitude: locationData.longitude,
      lastLocationUpdate: new Date(),
    });

    // Cache driver location in Redis for quick access
    if (user.role === 'driver' && user.isOnline && user.isAvailable) {
      await this.cacheDriverLocation(userId, locationData);
    }

    return {
      message: 'Location updated successfully',
      location: {
        id: savedLocation.id,
        latitude: savedLocation.latitude,
        longitude: savedLocation.longitude,
        timestamp: savedLocation.recordedAt,
      },
    };
  }

  async findNearbyDrivers(query: NearbyDriversQuery) {
    const radius = query.radius || 5000; // 5km default
    const limit = query.limit || 10;

    // First try to get from Redis cache
    const cachedDrivers = await this.getCachedNearbyDrivers(
      query.latitude,
      query.longitude,
      radius,
      limit,
    );

    if (cachedDrivers.length > 0) {
      return {
        drivers: cachedDrivers,
        source: 'cache',
        searchRadius: radius,
        count: cachedDrivers.length,
      };
    }

    // Fallback to database query with PostGIS
    const driversQuery = this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.phoneNumber',
        'user.rating',
        'user.totalTrips',
        'user.vehicleType',
        'user.vehicleModel',
        'user.vehiclePlateNumber',
        'user.currentLatitude',
        'user.currentLongitude',
      ])
      .addSelect(
        `ST_Distance(
          ST_MakePoint(user.currentLongitude, user.currentLatitude)::geography,
          ST_MakePoint(:longitude, :latitude)::geography
        ) as distance`,
      )
      .where('user.role = :role', { role: 'driver' })
      .andWhere('user.isOnline = :isOnline', { isOnline: true })
      .andWhere('user.isAvailable = :isAvailable', { isAvailable: true })
      .andWhere('user.status = :status', { status: 'active' })
      .andWhere('user.currentLatitude IS NOT NULL')
      .andWhere('user.currentLongitude IS NOT NULL')
      .andWhere(
        `ST_DWithin(
          ST_MakePoint(user.currentLongitude, user.currentLatitude)::geography,
          ST_MakePoint(:longitude, :latitude)::geography,
          :radius
        )`,
      )
      .setParameters({
        latitude: query.latitude,
        longitude: query.longitude,
        radius,
      })
      .orderBy('user.rating', 'DESC')
      .addOrderBy('distance', 'ASC')
      .limit(limit);

    const drivers = await driversQuery.getRawAndEntities();

    const formattedDrivers = drivers.entities.map((driver, index) => ({
      id: driver.id,
      name: `${driver.firstName} ${driver.lastName}`,
      phoneNumber: driver.phoneNumber,
      rating: driver.rating,
      totalTrips: driver.totalTrips,
      vehicle: {
        type: driver.vehicleType,
        model: driver.vehicleModel,
        plateNumber: driver.vehiclePlateNumber,
      },
      location: {
        latitude: driver.currentLatitude,
        longitude: driver.currentLongitude,
      },
      distance: Math.round(drivers.raw[index].distance), // in meters
      estimatedArrival: this.calculateETA(drivers.raw[index].distance),
    }));

    // Cache the results
    await this.cacheNearbyDriversResult(
      query.latitude,
      query.longitude,
      radius,
      formattedDrivers,
    );

    return {
      drivers: formattedDrivers,
      source: 'database',
      searchRadius: radius,
      count: formattedDrivers.length,
    };
  }

  async calculateRoute(routeData: RouteCalculationDto): Promise<RouteResult> {
    const distance = this.calculateHaversineDistance(
      routeData.pickupLatitude,
      routeData.pickupLongitude,
      routeData.dropoffLatitude,
      routeData.dropoffLongitude,
    );

    // Estimate duration based on average speed (30 km/h in urban areas)
    const averageSpeed = 30; // km/h
    const duration = Math.round((distance / averageSpeed) * 60); // in minutes

    // Calculate fare based on trip type
    const fareRates = {
      standard: { base: 5.0, perKm: 2.5, perMinute: 0.3 },
      premium: { base: 8.0, perKm: 4.0, perMinute: 0.5 },
      shared: { base: 3.0, perKm: 1.8, perMinute: 0.2 },
      delivery: { base: 4.0, perKm: 2.0, perMinute: 0.25 },
    };

    const rates = fareRates[routeData.tripType || 'standard'];
    const estimatedFare = rates.base + (distance * rates.perKm) + (duration * rates.perMinute);

    return {
      distance: Math.round(distance * 100) / 100, // round to 2 decimal places
      duration,
      estimatedFare: Math.round(estimatedFare * 100) / 100,
    };
  }

  async getLocationHistory(userId: string, page = 1, limit = 50) {
    const [locations, total] = await this.locationRepository.findAndCount({
      where: { userId },
      order: { recordedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      locations: locations.map(location => ({
        id: location.id,
        type: location.type,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        speed: location.speed,
        recordedAt: location.recordedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async trackTripRoute(tripId: string, locationData: LocationUpdateDto) {
    const trip = await this.tripRepository.findOne({
      where: { id: tripId, status: 'in_progress' },
      relations: ['driver'],
    });

    if (!trip) {
      throw new NotFoundException('Active trip not found');
    }

    // Create route point
    const routePoint = this.locationRepository.create({
      userId: trip.driverId,
      tripId,
      type: 'trip_route',
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      altitude: locationData.altitude,
      accuracy: locationData.accuracy,
      speed: locationData.speed,
      heading: locationData.heading,
      source: locationData.source || 'gps',
      recordedAt: new Date(),
    });

    // Calculate route index (sequence number)
    const routeCount = await this.locationRepository.count({
      where: { tripId, type: 'trip_route' },
    });
    routePoint.routeIndex = routeCount + 1;

    // Calculate distance from previous point
    if (routeCount > 0) {
      const previousPoint = await this.locationRepository.findOne({
        where: { tripId, type: 'trip_route' },
        order: { routeIndex: 'DESC' },
      });

      if (previousPoint) {
        const distance = this.calculateHaversineDistance(
          previousPoint.latitude,
          previousPoint.longitude,
          locationData.latitude,
          locationData.longitude,
        );
        routePoint.distanceFromPrevious = distance * 1000; // convert to meters
        
        const timeDiff = Date.now() - previousPoint.recordedAt.getTime();
        routePoint.timeFromPrevious = Math.round(timeDiff / 1000); // in seconds
      }
    }

    const savedRoutePoint = await this.locationRepository.save(routePoint);

    // Update trip's actual distance
    const totalDistance = await this.calculateTripDistance(tripId);
    await this.tripRepository.update(tripId, {
      actualDistance: totalDistance,
    });

    return {
      message: 'Trip route updated successfully',
      routePoint: {
        id: savedRoutePoint.id,
        latitude: savedRoutePoint.latitude,
        longitude: savedRoutePoint.longitude,
        routeIndex: savedRoutePoint.routeIndex,
        distanceFromPrevious: savedRoutePoint.distanceFromPrevious,
      },
      totalDistance,
    };
  }

  async isWithinServiceArea(latitude: number, longitude: number): Promise<boolean> {
    // Define Khartoum service area boundaries (approximate)
    const khartoumBounds = {
      north: 15.7,
      south: 15.3,
      east: 32.8,
      west: 32.3,
    };

    return (
      latitude >= khartoumBounds.south &&
      latitude <= khartoumBounds.north &&
      longitude >= khartoumBounds.west &&
      longitude <= khartoumBounds.east
    );
  }

  private async cacheDriverLocation(userId: string, location: LocationUpdateDto) {
    const key = `driver:location:${userId}`;
    const data = {
      userId,
      latitude: location.latitude,
      longitude: location.longitude,
      speed: location.speed || 0,
      heading: location.heading || 0,
      accuracy: location.accuracy || 0,
      timestamp: Date.now(),
    };

    await this.redis.setex(key, 30, JSON.stringify(data)); // 30 seconds TTL
    
    // Add to geospatial index for nearby searches
    await this.redis.geoadd(
      'drivers:locations',
      location.longitude,
      location.latitude,
      userId,
    );
  }

  private async getCachedNearbyDrivers(
    latitude: number,
    longitude: number,
    radius: number,
    limit: number,
  ) {
    try {
      // Use Redis GEORADIUS to find nearby drivers
      const nearbyDriverIds = await this.redis.georadius(
        'drivers:locations',
        longitude,
        latitude,
        radius,
        'm',
        'WITHDIST',
        'ASC',
        'COUNT',
        limit,
      );

      const drivers = [];
      for (const [driverId, distance] of nearbyDriverIds) {
        const cachedData = await this.redis.get(`driver:location:${driverId}`);
        if (cachedData) {
          const driverLocation = JSON.parse(cachedData);
          
          // Get driver details from database
          const driver = await this.userRepository.findOne({
            where: { id: driverId, isOnline: true, isAvailable: true },
            select: [
              'id', 'firstName', 'lastName', 'phoneNumber', 'rating',
              'totalTrips', 'vehicleType', 'vehicleModel', 'vehiclePlateNumber'
            ],
          });

          if (driver) {
            drivers.push({
              id: driver.id,
              name: `${driver.firstName} ${driver.lastName}`,
              phoneNumber: driver.phoneNumber,
              rating: driver.rating,
              totalTrips: driver.totalTrips,
              vehicle: {
                type: driver.vehicleType,
                model: driver.vehicleModel,
                plateNumber: driver.vehiclePlateNumber,
              },
              location: {
                latitude: driverLocation.latitude,
                longitude: driverLocation.longitude,
              },
              distance: Math.round(parseFloat(distance)),
              estimatedArrival: this.calculateETA(parseFloat(distance)),
            });
          }
        }
      }

      return drivers;
    } catch (error) {
      console.error('Error getting cached nearby drivers:', error);
      return [];
    }
  }

  private async cacheNearbyDriversResult(
    latitude: number,
    longitude: number,
    radius: number,
    drivers: any[],
  ) {
    const key = `nearby:${latitude}:${longitude}:${radius}`;
    await this.redis.setex(key, 60, JSON.stringify(drivers)); // 1 minute TTL
  }

  private calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private calculateETA(distanceInMeters: number): number {
    // Assume average speed of 30 km/h in urban areas
    const averageSpeed = 30; // km/h
    const distanceInKm = distanceInMeters / 1000;
    return Math.round((distanceInKm / averageSpeed) * 60); // in minutes
  }

  private async calculateTripDistance(tripId: string): Promise<number> {
    const routePoints = await this.locationRepository.find({
      where: { tripId, type: 'trip_route' },
      order: { routeIndex: 'ASC' },
    });

    if (routePoints.length < 2) {
      return 0;
    }

    let totalDistance = 0;
    for (let i = 1; i < routePoints.length; i++) {
      const distance = this.calculateHaversineDistance(
        routePoints[i - 1].latitude,
        routePoints[i - 1].longitude,
        routePoints[i].latitude,
        routePoints[i].longitude,
      );
      totalDistance += distance;
    }

    return Math.round(totalDistance * 100) / 100; // round to 2 decimal places
  }
}
