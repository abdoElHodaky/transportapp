import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Trip } from './trip.entity';

export enum LocationType {
  DRIVER_LOCATION = 'driver_location',
  TRIP_PICKUP = 'trip_pickup',
  TRIP_DROPOFF = 'trip_dropoff',
  TRIP_ROUTE = 'trip_route',
  USER_FAVORITE = 'user_favorite',
}

@Entity('locations')
@Index(['latitude', 'longitude']) // Spatial index for location queries
@Index(['userId', 'type']) // Index for user location queries
@Index(['tripId', 'type']) // Index for trip location queries
export class Location {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: LocationType,
  })
  type: LocationType;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  longitude: number;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  postalCode: string;

  // Additional location details
  @Column({ nullable: true })
  placeName: string; // e.g., "Home", "Office", "Airport"

  @Column({ nullable: true })
  placeId: string; // Google Places ID or similar

  // For driver location tracking
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  heading: number; // Direction in degrees (0-360)

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  speed: number; // Speed in km/h

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  accuracy: number; // GPS accuracy in meters

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  altitude: number; // Altitude in meters

  // For route tracking
  @Column({ nullable: true })
  routeIndex: number; // Order in route sequence

  @Column({ nullable: true })
  distanceFromPrevious: number; // Distance from previous point in meters

  @Column({ nullable: true })
  timeFromPrevious: number; // Time from previous point in seconds

  // Metadata
  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  // Timestamps
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  userId: string;

  @ManyToOne(() => Trip, { nullable: true })
  @JoinColumn({ name: 'tripId' })
  trip: Trip;

  @Column({ nullable: true })
  tripId: string;

  // Helper method to calculate distance to another location
  distanceTo(other: Location): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(other.latitude - this.latitude);
    const dLon = this.toRadians(other.longitude - this.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(this.latitude)) *
        Math.cos(this.toRadians(other.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

