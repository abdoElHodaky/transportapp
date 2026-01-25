import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trip, TripStatus, TripType } from '../../entities/trip.entity';
import { User, UserRole, UserStatus } from '../../entities/user.entity';
import { Rating } from '../../entities/rating.entity';

@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(Trip)
    private tripRepository: Repository<Trip>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Rating)
    private ratingRepository: Repository<Rating>,
  ) {}

  async requestTrip(passengerId: string, tripRequestDto: {
    pickupAddress: string;
    pickupLatitude: number;
    pickupLongitude: number;
    dropoffAddress: string;
    dropoffLatitude: number;
    dropoffLongitude: number;
    type?: TripType;
  }) {
    // Validate passenger
    const passenger = await this.userRepository.findOne({
      where: { id: passengerId, role: UserRole.PASSENGER, status: UserStatus.ACTIVE },
    });

    if (!passenger) {
      throw new NotFoundException('Passenger not found or inactive');
    }

    // Calculate estimated fare and distance
    const distance = this.calculateDistance(
      tripRequestDto.pickupLatitude,
      tripRequestDto.pickupLongitude,
      tripRequestDto.dropoffLatitude,
      tripRequestDto.dropoffLongitude,
    );

    const fareCalculation = this.calculateFare(distance, tripRequestDto.type || TripType.STANDARD);

    // Create trip
    const trip = this.tripRepository.create({
      passengerId,
      status: TripStatus.SEARCHING_DRIVER,
      type: tripRequestDto.type || TripType.STANDARD,
      pickupAddress: tripRequestDto.pickupAddress,
      pickupLatitude: tripRequestDto.pickupLatitude,
      pickupLongitude: tripRequestDto.pickupLongitude,
      dropoffAddress: tripRequestDto.dropoffAddress,
      dropoffLatitude: tripRequestDto.dropoffLatitude,
      dropoffLongitude: tripRequestDto.dropoffLongitude,
      estimatedDistance: distance,
      estimatedDuration: Math.ceil(distance * 2.5), // Rough estimate: 2.5 minutes per km
      estimatedFare: fareCalculation.total,
      baseFare: fareCalculation.baseFare,
      distanceFare: fareCalculation.distanceFare,
      timeFare: fareCalculation.timeFare,
      surgeFare: fareCalculation.surgeFare,
      surgeMultiplier: fareCalculation.surgeMultiplier,
    });

    const savedTrip = await this.tripRepository.save(trip);

    // TODO: Find nearby drivers and notify them
    // TODO: Implement WebSocket notifications

    return {
      message: 'Trip requested successfully',
      trip: {
        id: savedTrip.id,
        status: savedTrip.status,
        pickup: {
          address: savedTrip.pickupAddress,
          latitude: savedTrip.pickupLatitude,
          longitude: savedTrip.pickupLongitude,
        },
        dropoff: {
          address: savedTrip.dropoffAddress,
          latitude: savedTrip.dropoffLatitude,
          longitude: savedTrip.dropoffLongitude,
        },
        estimatedFare: savedTrip.estimatedFare,
        estimatedDistance: savedTrip.estimatedDistance,
        estimatedDuration: savedTrip.estimatedDuration,
        createdAt: savedTrip.createdAt,
      },
    };
  }

  async acceptTrip(tripId: string, driverId: string) {
    // Validate driver
    const driver = await this.userRepository.findOne({
      where: { 
        id: driverId, 
        role: UserRole.DRIVER, 
        status: UserStatus.ACTIVE,
        isOnline: true,
        isAvailable: true,
      },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found or not available');
    }

    // Find trip
    const trip = await this.tripRepository.findOne({
      where: { id: tripId, status: TripStatus.SEARCHING_DRIVER },
      relations: ['passenger'],
    });

    if (!trip) {
      throw new NotFoundException('Trip not found or already assigned');
    }

    // Assign driver to trip
    trip.driverId = driverId;
    trip.status = TripStatus.DRIVER_ASSIGNED;
    trip.driverAssignedAt = new Date();

    const updatedTrip = await this.tripRepository.save(trip);

    // Mark driver as unavailable
    driver.isAvailable = false;
    await this.userRepository.save(driver);

    // TODO: Notify passenger via WebSocket

    return {
      message: 'Trip accepted successfully',
      trip: {
        id: updatedTrip.id,
        status: updatedTrip.status,
        driverAssignedAt: updatedTrip.driverAssignedAt,
      },
    };
  }

  async updateTripStatus(tripId: string, userId: string, statusDto: {
    status: TripStatus;
    latitude?: number;
    longitude?: number;
  }) {
    const trip = await this.tripRepository.findOne({
      where: { id: tripId },
      relations: ['passenger', 'driver'],
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    // Validate user can update this trip
    if (trip.passengerId !== userId && trip.driverId !== userId) {
      throw new ForbiddenException('You are not authorized to update this trip');
    }

    // Validate status transition
    if (!this.isValidStatusTransition(trip.status, statusDto.status)) {
      throw new BadRequestException(`Invalid status transition from ${trip.status} to ${statusDto.status}`);
    }

    // Update trip status and timestamps
    trip.status = statusDto.status;

    switch (statusDto.status) {
      case TripStatus.DRIVER_ARRIVED:
        // Driver has arrived at pickup location
        trip.driverArrivedAt = new Date();
        break;
      case TripStatus.IN_PROGRESS:
        trip.tripStartedAt = new Date();
        break;
      case TripStatus.COMPLETED:
        trip.tripCompletedAt = new Date();
        if (trip.tripStartedAt) {
          trip.actualDuration = Math.ceil((trip.tripCompletedAt.getTime() - trip.tripStartedAt.getTime()) / (1000 * 60));
        }
        // TODO: Process payment
        // TODO: Make driver available again
        if (trip.driver) {
          trip.driver.isAvailable = true;
          trip.driver.totalTrips += 1;
          await this.userRepository.save(trip.driver);
        }
        if (trip.passenger) {
          trip.passenger.totalTrips += 1;
          await this.userRepository.save(trip.passenger);
        }
        break;
      case TripStatus.CANCELLED:
        trip.cancelledAt = new Date();
        // TODO: Make driver available again if assigned
        if (trip.driver) {
          trip.driver.isAvailable = true;
          await this.userRepository.save(trip.driver);
        }
        break;
    }

    const updatedTrip = await this.tripRepository.save(trip);

    // TODO: Notify relevant parties via WebSocket

    return {
      message: 'Trip status updated successfully',
      trip: {
        id: updatedTrip.id,
        status: updatedTrip.status,
        updatedAt: updatedTrip.updatedAt,
      },
    };
  }

  async getTripDetails(tripId: string, userId: string) {
    const trip = await this.tripRepository.findOne({
      where: { id: tripId },
      relations: ['passenger', 'driver', 'ratings'],
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    // Validate user can view this trip
    if (trip.passengerId !== userId && trip.driverId !== userId) {
      throw new ForbiddenException('You are not authorized to view this trip');
    }

    return {
      message: 'Trip details retrieved successfully',
      trip: {
        id: trip.id,
        status: trip.status,
        type: trip.type,
        passenger: trip.passenger ? {
          id: trip.passenger.id,
          name: trip.passenger.name,
          phone: trip.passenger.phone,
          rating: trip.passenger.rating,
        } : null,
        driver: trip.driver ? {
          id: trip.driver.id,
          name: trip.driver.name,
          phone: trip.driver.phone,
          rating: trip.driver.rating,
          vehicleType: trip.driver.vehicleType,
          vehicleModel: trip.driver.vehicleModel,
          vehiclePlateNumber: trip.driver.vehiclePlateNumber,
          vehicleColor: trip.driver.vehicleColor,
        } : null,
        pickup: {
          address: trip.pickupAddress,
          latitude: trip.pickupLatitude,
          longitude: trip.pickupLongitude,
        },
        dropoff: {
          address: trip.dropoffAddress,
          latitude: trip.dropoffLatitude,
          longitude: trip.dropoffLongitude,
        },
        fare: {
          estimated: trip.estimatedFare,
          actual: trip.actualFare,
          breakdown: {
            baseFare: trip.baseFare,
            distanceFare: trip.distanceFare,
            timeFare: trip.timeFare,
            surgeFare: trip.surgeFare,
            surgeMultiplier: trip.surgeMultiplier,
          },
        },
        distance: {
          estimated: trip.estimatedDistance,
          actual: trip.actualDistance,
        },
        duration: {
          estimated: trip.estimatedDuration,
          actual: trip.actualDuration,
        },
        timestamps: {
          createdAt: trip.createdAt,
          driverAssignedAt: trip.driverAssignedAt,
          driverArrivedAt: trip.driverArrivedAt,
          tripStartedAt: trip.tripStartedAt,
          tripCompletedAt: trip.tripCompletedAt,
          cancelledAt: trip.cancelledAt,
        },
        ratings: trip.ratings,
      },
    };
  }

  async getTripHistory(userId: string, page: number = 1, limit: number = 10) {
    const [trips, total] = await this.tripRepository.findAndCount({
      where: [
        { passengerId: userId },
        { driverId: userId },
      ],
      relations: ['passenger', 'driver'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      message: 'Trip history retrieved successfully',
      trips: trips.map(trip => ({
        id: trip.id,
        status: trip.status,
        type: trip.type,
        pickup: trip.pickupAddress,
        dropoff: trip.dropoffAddress,
        fare: trip.actualFare || trip.estimatedFare,
        distance: trip.actualDistance || trip.estimatedDistance,
        duration: trip.actualDuration || trip.estimatedDuration,
        createdAt: trip.createdAt,
        completedAt: trip.tripCompletedAt,
        cancelledAt: trip.cancelledAt,
        passenger: trip.passenger ? {
          id: trip.passenger.id,
          name: trip.passenger.name,
        } : null,
        driver: trip.driver ? {
          id: trip.driver.id,
          name: trip.driver.name,
          rating: trip.driver.rating,
        } : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async rateTrip(tripId: string, userId: string, ratingDto: {
    rating: number;
    comment?: string;
  }) {
    const trip = await this.tripRepository.findOne({
      where: { id: tripId, status: TripStatus.COMPLETED },
      relations: ['passenger', 'driver'],
    });

    if (!trip) {
      throw new NotFoundException('Trip not found or not completed');
    }

    // Validate user can rate this trip
    if (trip.passengerId !== userId && trip.driverId !== userId) {
      throw new ForbiddenException('You are not authorized to rate this trip');
    }

    // Determine who is being rated
    const ratedUserId = trip.passengerId === userId ? trip.driverId : trip.passengerId;
    
    if (!ratedUserId) {
      throw new BadRequestException('Cannot determine who to rate');
    }

    // Check if rating already exists
    const existingRating = await this.ratingRepository.findOne({
      where: {
        tripId,
        ratingUserId: userId,
        ratedUserId,
      },
    });

    if (existingRating) {
      throw new BadRequestException('You have already rated this trip');
    }

    // Create rating
    const rating = this.ratingRepository.create({
      tripId,
      ratingUserId: userId,
      ratedUserId,
      rating: ratingDto.rating,
      comment: ratingDto.comment,
    });

    const savedRating = await this.ratingRepository.save(rating);

    // Update user's average rating
    await this.updateUserRating(ratedUserId);

    return {
      message: 'Trip rated successfully',
      rating: {
        id: savedRating.id,
        tripId: savedRating.tripId,
        rating: savedRating.rating,
        comment: savedRating.comment,
        createdAt: savedRating.createdAt,
      },
    };
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private calculateFare(distance: number, type: TripType) {
    const baseFare = 5.0; // Base fare in SDG
    const perKmRate = type === TripType.PREMIUM ? 3.0 : 2.0; // Rate per km
    const surgeMultiplier = 1.0; // TODO: Implement dynamic surge pricing

    const distanceFare = distance * perKmRate;
    const timeFare = 0; // TODO: Implement time-based fare
    const surgeFare = (baseFare + distanceFare) * (surgeMultiplier - 1);
    const total = baseFare + distanceFare + timeFare + surgeFare;

    return {
      baseFare,
      distanceFare,
      timeFare,
      surgeFare,
      surgeMultiplier,
      total: Math.round(total * 100) / 100,
    };
  }

  private isValidStatusTransition(currentStatus: TripStatus, newStatus: TripStatus): boolean {
    const validTransitions = {
      [TripStatus.SEARCHING_DRIVER]: [TripStatus.DRIVER_ASSIGNED, TripStatus.CANCELLED],
      [TripStatus.DRIVER_ASSIGNED]: [TripStatus.DRIVER_ARRIVED, TripStatus.CANCELLED],
      [TripStatus.DRIVER_ARRIVED]: [TripStatus.IN_PROGRESS, TripStatus.CANCELLED],
      [TripStatus.IN_PROGRESS]: [TripStatus.COMPLETED, TripStatus.CANCELLED],
      [TripStatus.COMPLETED]: [],
      [TripStatus.CANCELLED]: [],
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  private async updateUserRating(userId: string) {
    const ratings = await this.ratingRepository.find({
      where: { ratedUserId: userId },
    });

    if (ratings.length === 0) return;

    const totalRating = ratings.reduce((sum, rating) => sum + rating.rating, 0);
    const averageRating = totalRating / ratings.length;

    await this.userRepository.update(userId, {
      rating: Math.round(averageRating * 100) / 100,
      totalRatings: ratings.length,
    });
  }
}
