import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Location, LocationType } from '../../entities/location.entity';
import { User } from '../../entities/user.entity';
import { Trip, TripStatus } from '../../entities/trip.entity';
import Redis from 'ioredis';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

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
  polyline?: string;
  trafficAware?: boolean;
  alternativeRoutes?: RouteAlternative[];
}

export interface RouteAlternative {
  distance: number;
  duration: number;
  estimatedFare: number;
  trafficDelay?: number;
  routeQuality: 'fastest' | 'shortest' | 'balanced';
}

export interface GeofenceArea {
  id: string;
  name: string;
  type: 'service_area' | 'restricted' | 'surge_pricing';
  coordinates: Array<{ latitude: number; longitude: number }>;
  isActive: boolean;
  metadata?: Record<string, any>;
}

export interface TrafficInfo {
  congestionLevel: 'low' | 'moderate' | 'high' | 'severe';
  averageSpeed: number; // km/h
  delayMinutes: number;
  incidents?: Array<{
    type: 'accident' | 'construction' | 'closure';
    severity: 'minor' | 'major' | 'severe';
    description: string;
  }>;
}

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);
  private redis: Redis;
  private geofenceAreas: Map<string, GeofenceArea> = new Map();

  constructor(
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Trip)
    private tripRepository: Repository<Trip>,
    @InjectDataSource()
    private dataSource: DataSource,
    private configService: ConfigService,
  ) {
    // Initialize Redis for location caching
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: 3,
    });

    // Initialize geofence areas
    this.initializeGeofenceAreas();
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
      type:
        user.role === 'driver'
          ? LocationType.DRIVER_LOCATION
          : LocationType.USER_LOCATION,
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
      name: driver.name,
      phoneNumber: driver.phone,
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
    try {
      // Try to get route from mapping service first
      const mappingRoute = await this.getRouteFromMappingService(routeData);
      if (mappingRoute) {
        return mappingRoute;
      }
    } catch (error) {
      this.logger.warn(
        'Mapping service unavailable, falling back to Haversine calculation',
        error,
      );
    }

    // Fallback to Haversine calculation
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
    const estimatedFare =
      rates.base + distance * rates.perKm + duration * rates.perMinute;

    return {
      distance: Math.round(distance * 100) / 100, // round to 2 decimal places
      duration,
      estimatedFare: Math.round(estimatedFare * 100) / 100,
      trafficAware: false,
    };
  }

  /**
   * Get route information from external mapping service (Google Maps, OpenStreetMap, etc.)
   */
  private async getRouteFromMappingService(
    routeData: RouteCalculationDto,
  ): Promise<RouteResult | null> {
    const mappingProvider = this.configService.get(
      'MAPPING_PROVIDER',
      'openstreetmap',
    );

    switch (mappingProvider) {
      case 'google':
        return this.getGoogleMapsRoute(routeData);
      case 'openstreetmap':
        return this.getOpenStreetMapRoute(routeData);
      case 'mapbox':
        return this.getMapboxRoute(routeData);
      default:
        return null;
    }
  }

  /**
   * Get route from Google Maps Directions API
   */
  private async getGoogleMapsRoute(
    routeData: RouteCalculationDto,
  ): Promise<RouteResult | null> {
    const apiKey = this.configService.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      this.logger.warn('Google Maps API key not configured');
      return null;
    }

    try {
      const response = await axios.get(
        'https://maps.googleapis.com/maps/api/directions/json',
        {
          params: {
            origin: `${routeData.pickupLatitude},${routeData.pickupLongitude}`,
            destination: `${routeData.dropoffLatitude},${routeData.dropoffLongitude}`,
            key: apiKey,
            departure_time: 'now',
            traffic_model: 'best_guess',
            alternatives: true,
          },
          timeout: 5000,
        },
      );

      if (response.data.status === 'OK' && response.data.routes.length > 0) {
        const route = response.data.routes[0];
        const leg = route.legs[0];

        const distance = leg.distance.value / 1000; // Convert to km
        const duration =
          Math.round(leg.duration_in_traffic?.value / 60) ||
          Math.round(leg.duration.value / 60); // Convert to minutes

        // Calculate fare
        const fareRates = {
          standard: { base: 5.0, perKm: 2.5, perMinute: 0.3 },
          premium: { base: 8.0, perKm: 4.0, perMinute: 0.5 },
          shared: { base: 3.0, perKm: 1.8, perMinute: 0.2 },
          delivery: { base: 4.0, perKm: 2.0, perMinute: 0.25 },
        };

        const rates = fareRates[routeData.tripType || 'standard'];
        const estimatedFare =
          rates.base + distance * rates.perKm + duration * rates.perMinute;

        // Extract waypoints
        const waypoints = route.overview_polyline
          ? this.decodePolyline(route.overview_polyline.points)
          : [];

        // Process alternative routes
        const alternativeRoutes: RouteAlternative[] = response.data.routes
          .slice(1, 3)
          .map((altRoute: any) => {
            const altLeg = altRoute.legs[0];
            const altDistance = altLeg.distance.value / 1000;
            const altDuration =
              Math.round(altLeg.duration_in_traffic?.value / 60) ||
              Math.round(altLeg.duration.value / 60);
            const altFare =
              rates.base +
              altDistance * rates.perKm +
              altDuration * rates.perMinute;

            return {
              distance: Math.round(altDistance * 100) / 100,
              duration: altDuration,
              estimatedFare: Math.round(altFare * 100) / 100,
              trafficDelay: altLeg.duration_in_traffic
                ? Math.round(
                    (altLeg.duration_in_traffic.value - altLeg.duration.value) /
                      60,
                  )
                : 0,
              routeQuality:
                altDistance < distance
                  ? 'shortest'
                  : altDuration < duration
                    ? 'fastest'
                    : 'balanced',
            };
          });

        return {
          distance: Math.round(distance * 100) / 100,
          duration,
          estimatedFare: Math.round(estimatedFare * 100) / 100,
          waypoints: waypoints.slice(0, 10), // Limit waypoints for performance
          polyline: route.overview_polyline?.points,
          trafficAware: !!leg.duration_in_traffic,
          alternativeRoutes,
        };
      }
    } catch (error) {
      this.logger.error('Google Maps API error:', error);
    }

    return null;
  }

  /**
   * Get route from OpenStreetMap (OSRM)
   */
  private async getOpenStreetMapRoute(
    routeData: RouteCalculationDto,
  ): Promise<RouteResult | null> {
    try {
      const response = await axios.get(
        'http://router.project-osrm.org/route/v1/driving/' +
          `${routeData.pickupLongitude},${routeData.pickupLatitude};${routeData.dropoffLongitude},${routeData.dropoffLatitude}`,
        {
          params: {
            overview: 'full',
            geometries: 'polyline',
            alternatives: true,
          },
          timeout: 5000,
        },
      );

      if (response.data.code === 'Ok' && response.data.routes.length > 0) {
        const route = response.data.routes[0];

        const distance = route.distance / 1000; // Convert to km
        const duration = Math.round(route.duration / 60); // Convert to minutes

        // Calculate fare
        const fareRates = {
          standard: { base: 5.0, perKm: 2.5, perMinute: 0.3 },
          premium: { base: 8.0, perKm: 4.0, perMinute: 0.5 },
          shared: { base: 3.0, perKm: 1.8, perMinute: 0.2 },
          delivery: { base: 4.0, perKm: 2.0, perMinute: 0.25 },
        };

        const rates = fareRates[routeData.tripType || 'standard'];
        const estimatedFare =
          rates.base + distance * rates.perKm + duration * rates.perMinute;

        // Process alternative routes
        const alternativeRoutes: RouteAlternative[] = response.data.routes
          .slice(1, 3)
          .map((altRoute: any) => {
            const altDistance = altRoute.distance / 1000;
            const altDuration = Math.round(altRoute.duration / 60);
            const altFare =
              rates.base +
              altDistance * rates.perKm +
              altDuration * rates.perMinute;

            return {
              distance: Math.round(altDistance * 100) / 100,
              duration: altDuration,
              estimatedFare: Math.round(altFare * 100) / 100,
              routeQuality:
                altDistance < distance
                  ? 'shortest'
                  : altDuration < duration
                    ? 'fastest'
                    : 'balanced',
            };
          });

        return {
          distance: Math.round(distance * 100) / 100,
          duration,
          estimatedFare: Math.round(estimatedFare * 100) / 100,
          polyline: route.geometry,
          trafficAware: false, // OSRM doesn't provide real-time traffic
          alternativeRoutes,
        };
      }
    } catch (error) {
      this.logger.error('OpenStreetMap OSRM API error:', error);
    }

    return null;
  }

  /**
   * Get route from Mapbox Directions API
   */
  private async getMapboxRoute(
    routeData: RouteCalculationDto,
  ): Promise<RouteResult | null> {
    const accessToken = this.configService.get('MAPBOX_ACCESS_TOKEN');
    if (!accessToken) {
      this.logger.warn('Mapbox access token not configured');
      return null;
    }

    try {
      const response = await axios.get(
        `https://api.mapbox.com/directions/v5/mapbox/driving/` +
          `${routeData.pickupLongitude},${routeData.pickupLatitude};${routeData.dropoffLongitude},${routeData.dropoffLatitude}`,
        {
          params: {
            access_token: accessToken,
            overview: 'full',
            geometries: 'polyline',
            alternatives: true,
            annotations: 'duration,distance',
          },
          timeout: 5000,
        },
      );

      if (response.data.code === 'Ok' && response.data.routes.length > 0) {
        const route = response.data.routes[0];

        const distance = route.distance / 1000; // Convert to km
        const duration = Math.round(route.duration / 60); // Convert to minutes

        // Calculate fare
        const fareRates = {
          standard: { base: 5.0, perKm: 2.5, perMinute: 0.3 },
          premium: { base: 8.0, perKm: 4.0, perMinute: 0.5 },
          shared: { base: 3.0, perKm: 1.8, perMinute: 0.2 },
          delivery: { base: 4.0, perKm: 2.0, perMinute: 0.25 },
        };

        const rates = fareRates[routeData.tripType || 'standard'];
        const estimatedFare =
          rates.base + distance * rates.perKm + duration * rates.perMinute;

        // Process alternative routes
        const alternativeRoutes: RouteAlternative[] = response.data.routes
          .slice(1, 3)
          .map((altRoute: any) => {
            const altDistance = altRoute.distance / 1000;
            const altDuration = Math.round(altRoute.duration / 60);
            const altFare =
              rates.base +
              altDistance * rates.perKm +
              altDuration * rates.perMinute;

            return {
              distance: Math.round(altDistance * 100) / 100,
              duration: altDuration,
              estimatedFare: Math.round(altFare * 100) / 100,
              routeQuality:
                altDistance < distance
                  ? 'shortest'
                  : altDuration < duration
                    ? 'fastest'
                    : 'balanced',
            };
          });

        return {
          distance: Math.round(distance * 100) / 100,
          duration,
          estimatedFare: Math.round(estimatedFare * 100) / 100,
          polyline: route.geometry,
          trafficAware: false, // Mapbox provides traffic-aware routing by default
          alternativeRoutes,
        };
      }
    } catch (error) {
      this.logger.error('Mapbox API error:', error);
    }

    return null;
  }

  async getLocationHistory(userId: string, page = 1, limit = 50) {
    const [locations, total] = await this.locationRepository.findAndCount({
      where: { userId },
      order: { recordedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      locations: locations.map((location) => ({
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
      where: { id: tripId, status: TripStatus.IN_PROGRESS },
      relations: ['driver'],
    });

    if (!trip) {
      throw new NotFoundException('Active trip not found');
    }

    // Create route point
    const routePoint = this.locationRepository.create({
      userId: trip.driverId,
      tripId,
      type: LocationType.TRIP_ROUTE,
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
      where: { tripId, type: LocationType.TRIP_ROUTE },
    });
    routePoint.routeIndex = routeCount + 1;

    // Calculate distance from previous point
    if (routeCount > 0) {
      const previousPoint = await this.locationRepository.findOne({
        where: { tripId, type: LocationType.TRIP_ROUTE },
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

  async isWithinServiceArea(
    latitude: number,
    longitude: number,
  ): Promise<boolean> {
    // Check against dynamic geofence areas first
    const serviceAreas = Array.from(this.geofenceAreas.values()).filter(
      (area) => area.type === 'service_area' && area.isActive,
    );

    for (const area of serviceAreas) {
      if (this.isPointInPolygon(latitude, longitude, area.coordinates)) {
        return true;
      }
    }

    // Fallback to hardcoded Khartoum bounds
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

  /**
   * Check if location is within restricted areas
   */
  async isWithinRestrictedArea(
    latitude: number,
    longitude: number,
  ): Promise<{ restricted: boolean; reason?: string }> {
    const restrictedAreas = Array.from(this.geofenceAreas.values()).filter(
      (area) => area.type === 'restricted' && area.isActive,
    );

    for (const area of restrictedAreas) {
      if (this.isPointInPolygon(latitude, longitude, area.coordinates)) {
        return {
          restricted: true,
          reason:
            area.metadata?.reason ||
            'This area is restricted for ride services',
        };
      }
    }

    return { restricted: false };
  }

  /**
   * Get surge pricing multiplier for location
   */
  async getSurgePricingMultiplier(
    latitude: number,
    longitude: number,
  ): Promise<number> {
    const surgeAreas = Array.from(this.geofenceAreas.values()).filter(
      (area) => area.type === 'surge_pricing' && area.isActive,
    );

    for (const area of surgeAreas) {
      if (this.isPointInPolygon(latitude, longitude, area.coordinates)) {
        return area.metadata?.multiplier || 1.0;
      }
    }

    return 1.0; // No surge pricing
  }

  /**
   * Get traffic information for a location
   */
  async getTrafficInfo(
    latitude: number,
    longitude: number,
    radius: number = 1000, // meters
  ): Promise<TrafficInfo> {
    try {
      // Try to get real traffic data from mapping service
      const trafficData = await this.getTrafficFromMappingService(
        latitude,
        longitude,
        radius,
      );
      if (trafficData) {
        return trafficData;
      }
    } catch (error) {
      this.logger.warn(
        'Traffic service unavailable, using estimated data',
        error,
      );
    }

    // Fallback to estimated traffic based on time of day and location
    return this.estimateTrafficInfo(latitude, longitude);
  }

  /**
   * Get location analytics and heatmap data
   */
  async getLocationAnalytics(
    dateFrom: Date,
    dateTo: Date,
    type: 'pickup' | 'dropoff' | 'driver_activity' = 'pickup',
  ) {
    const query = this.locationRepository
      .createQueryBuilder('location')
      .select([
        'location.latitude',
        'location.longitude',
        'COUNT(*) as activity_count',
        'AVG(location.accuracy) as avg_accuracy',
      ])
      .where('location.recordedAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom,
        dateTo,
      })
      .groupBy('location.latitude, location.longitude')
      .having('COUNT(*) > 5') // Filter out low-activity areas
      .orderBy('activity_count', 'DESC')
      .limit(1000);

    // Filter by location type
    switch (type) {
      case 'pickup':
        query.andWhere('location.type = :type', {
          type: LocationType.TRIP_START,
        });
        break;
      case 'dropoff':
        query.andWhere('location.type = :type', {
          type: LocationType.TRIP_END,
        });
        break;
      case 'driver_activity':
        query.andWhere('location.type = :type', {
          type: LocationType.DRIVER_LOCATION,
        });
        break;
    }

    const results = await query.getRawMany();

    return {
      message: 'Location analytics retrieved successfully',
      analytics: {
        type,
        period: { from: dateFrom, to: dateTo },
        heatmapData: results.map((result) => ({
          latitude: parseFloat(result.latitude),
          longitude: parseFloat(result.longitude),
          intensity: parseInt(result.activity_count),
          accuracy: parseFloat(result.avg_accuracy || '0'),
        })),
        summary: {
          totalDataPoints: results.length,
          totalActivity: results.reduce(
            (sum, r) => sum + parseInt(r.activity_count),
            0,
          ),
          averageAccuracy:
            results.reduce(
              (sum, r) => sum + parseFloat(r.avg_accuracy || '0'),
              0,
            ) / results.length,
        },
      },
    };
  }

  /**
   * Manage geofence areas
   */
  async createGeofenceArea(
    areaData: Omit<GeofenceArea, 'id'>,
  ): Promise<GeofenceArea> {
    const area: GeofenceArea = {
      id: `geofence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...areaData,
    };

    this.geofenceAreas.set(area.id, area);

    // Cache in Redis for persistence across instances
    await this.redis.setex(`geofence:${area.id}`, 86400, JSON.stringify(area));

    this.logger.log(`Created geofence area: ${area.name} (${area.type})`);
    return area;
  }

  async updateGeofenceArea(
    areaId: string,
    updates: Partial<GeofenceArea>,
  ): Promise<GeofenceArea | null> {
    const area = this.geofenceAreas.get(areaId);
    if (!area) {
      return null;
    }

    const updatedArea = { ...area, ...updates };
    this.geofenceAreas.set(areaId, updatedArea);

    // Update in Redis
    await this.redis.setex(
      `geofence:${areaId}`,
      86400,
      JSON.stringify(updatedArea),
    );

    this.logger.log(`Updated geofence area: ${updatedArea.name}`);
    return updatedArea;
  }

  async deleteGeofenceArea(areaId: string): Promise<boolean> {
    const deleted = this.geofenceAreas.delete(areaId);
    if (deleted) {
      await this.redis.del(`geofence:${areaId}`);
      this.logger.log(`Deleted geofence area: ${areaId}`);
    }
    return deleted;
  }

  async getGeofenceAreas(type?: string): Promise<GeofenceArea[]> {
    const areas = Array.from(this.geofenceAreas.values());
    return type ? areas.filter((area) => area.type === type) : areas;
  }

  private async cacheDriverLocation(
    userId: string,
    location: LocationUpdateDto,
  ) {
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
      for (const [driverId, distance] of nearbyDriverIds as [
        string,
        string,
      ][]) {
        const cachedData = await this.redis.get(`driver:location:${driverId}`);
        if (cachedData) {
          const driverLocation = JSON.parse(cachedData);

          // Get driver details from database
          const driver = await this.userRepository.findOne({
            where: { id: driverId, isOnline: true, isAvailable: true },
            select: [
              'id',
              'name',
              'phone',
              'rating',
              'totalTrips',
              'vehicleType',
              'vehicleModel',
              'vehiclePlateNumber',
            ],
          });

          if (driver) {
            drivers.push({
              id: driver.id,
              name: driver.name,
              phoneNumber: driver.phone,
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
      where: { tripId, type: LocationType.TRIP_ROUTE },
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

  /**
   * Initialize default geofence areas
   */
  private async initializeGeofenceAreas() {
    try {
      // Load geofence areas from Redis
      const keys = await this.redis.keys('geofence:*');
      for (const key of keys) {
        const areaData = await this.redis.get(key);
        if (areaData) {
          const area: GeofenceArea = JSON.parse(areaData);
          this.geofenceAreas.set(area.id, area);
        }
      }

      // Create default Khartoum service area if none exists
      const serviceAreas = Array.from(this.geofenceAreas.values()).filter(
        (area) => area.type === 'service_area',
      );

      if (serviceAreas.length === 0) {
        await this.createGeofenceArea({
          name: 'Khartoum Service Area',
          type: 'service_area',
          coordinates: [
            { latitude: 15.3, longitude: 32.3 }, // Southwest
            { latitude: 15.3, longitude: 32.8 }, // Southeast
            { latitude: 15.7, longitude: 32.8 }, // Northeast
            { latitude: 15.7, longitude: 32.3 }, // Northwest
          ],
          isActive: true,
          metadata: {
            description:
              'Main service area covering Khartoum metropolitan area',
            priority: 1,
          },
        });
      }

      this.logger.log(`Initialized ${this.geofenceAreas.size} geofence areas`);
    } catch (error) {
      this.logger.error('Failed to initialize geofence areas:', error);
    }
  }

  /**
   * Check if a point is inside a polygon using ray casting algorithm
   */
  private isPointInPolygon(
    latitude: number,
    longitude: number,
    polygon: Array<{ latitude: number; longitude: number }>,
  ): boolean {
    let inside = false;
    const x = longitude;
    const y = latitude;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].longitude;
      const yi = polygon[i].latitude;
      const xj = polygon[j].longitude;
      const yj = polygon[j].latitude;

      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }

    return inside;
  }

  /**
   * Decode Google Maps polyline
   */
  private decodePolyline(
    encoded: string,
  ): Array<{ latitude: number; longitude: number }> {
    const points: Array<{ latitude: number; longitude: number }> = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
      let b: number;
      let shift = 0;
      let result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }

    return points;
  }

  /**
   * Get traffic data from mapping service
   */
  private async getTrafficFromMappingService(
    latitude: number,
    longitude: number,
    radius: number,
  ): Promise<TrafficInfo | null> {
    const mappingProvider = this.configService.get(
      'MAPPING_PROVIDER',
      'openstreetmap',
    );

    // Only Google Maps provides traffic data
    if (mappingProvider === 'google') {
      return this.getGoogleTrafficInfo(latitude, longitude, radius);
    }

    return null;
  }

  /**
   * Get traffic info from Google Maps
   */
  private async getGoogleTrafficInfo(
    latitude: number,
    longitude: number,
    radius: number,
  ): Promise<TrafficInfo | null> {
    const apiKey = this.configService.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      return null;
    }

    try {
      // Use Google Maps Roads API to get traffic data
      const response = await axios.get(
        'https://roads.googleapis.com/v1/speedLimits',
        {
          params: {
            path: `${latitude},${longitude}`,
            key: apiKey,
          },
          timeout: 3000,
        },
      );

      // This is a simplified implementation
      // In practice, you'd use more sophisticated traffic APIs
      return {
        congestionLevel: 'moderate',
        averageSpeed: 25,
        delayMinutes: 2,
        incidents: [],
      };
    } catch (error) {
      this.logger.error('Google traffic API error:', error);
      return null;
    }
  }

  /**
   * Estimate traffic info based on time and location
   */
  private estimateTrafficInfo(
    latitude: number,
    longitude: number,
  ): TrafficInfo {
    const hour = new Date().getHours();

    // Rush hour logic
    const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
    const isBusinessHours = hour >= 8 && hour <= 18;

    let congestionLevel: 'low' | 'moderate' | 'high' | 'severe';
    let averageSpeed: number;
    let delayMinutes: number;

    if (isRushHour) {
      congestionLevel = 'high';
      averageSpeed = 15;
      delayMinutes = 8;
    } else if (isBusinessHours) {
      congestionLevel = 'moderate';
      averageSpeed = 25;
      delayMinutes = 3;
    } else {
      congestionLevel = 'low';
      averageSpeed = 35;
      delayMinutes = 0;
    }

    return {
      congestionLevel,
      averageSpeed,
      delayMinutes,
      incidents: [],
    };
  }
}
