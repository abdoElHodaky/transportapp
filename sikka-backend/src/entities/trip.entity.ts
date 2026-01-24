import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { Payment } from './payment.entity';
import { Rating } from './rating.entity';

export enum TripStatus {
  REQUESTED = 'requested',
  ACCEPTED = 'accepted',
  DRIVER_ARRIVED = 'driver_arrived',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum TripType {
  STANDARD = 'standard',
  PREMIUM = 'premium',
  SHARED = 'shared',
  DELIVERY = 'delivery',
}

export enum CancellationReason {
  PASSENGER_CANCELLED = 'passenger_cancelled',
  DRIVER_CANCELLED = 'driver_cancelled',
  NO_DRIVER_AVAILABLE = 'no_driver_available',
  PAYMENT_FAILED = 'payment_failed',
  SYSTEM_CANCELLED = 'system_cancelled',
}

@Entity('trips')
export class Trip {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: TripStatus,
    default: TripStatus.REQUESTED,
  })
  status: TripStatus;

  @Column({
    type: 'enum',
    enum: TripType,
    default: TripType.STANDARD,
  })
  type: TripType;

  // Passenger relationship
  @ManyToOne(() => User, (user) => user.passengerTrips, { nullable: false })
  @JoinColumn({ name: 'passengerId' })
  passenger: User;

  @Column()
  passengerId: string;

  // Driver relationship (nullable until trip is accepted)
  @ManyToOne(() => User, (user) => user.driverTrips, { nullable: true })
  @JoinColumn({ name: 'driverId' })
  driver: User;

  @Column({ nullable: true })
  driverId: string;

  // Pickup location
  @Column({ type: 'decimal', precision: 10, scale: 8 })
  pickupLatitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  pickupLongitude: number;

  @Column()
  pickupAddress: string;

  // Dropoff location
  @Column({ type: 'decimal', precision: 10, scale: 8 })
  dropoffLatitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  dropoffLongitude: number;

  @Column()
  dropoffAddress: string;

  // Fare information
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  estimatedFare: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  actualFare: number;

  // Distance information
  @Column({ type: 'decimal', precision: 8, scale: 2 })
  estimatedDistance: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  actualDistance: number;

  // Duration information
  @Column({ nullable: true })
  estimatedDuration: number; // in minutes

  @Column({ nullable: true })
  actualDuration: number; // in minutes

  // Trip notes and special instructions
  @Column({ nullable: true, length: 500 })
  passengerNotes: string;

  @Column({ nullable: true, length: 500 })
  driverNotes: string;

  // Cancellation information
  @Column({
    type: 'enum',
    enum: CancellationReason,
    nullable: true,
  })
  cancellationReason: CancellationReason;

  @Column({ nullable: true })
  cancelledBy: string; // User ID who cancelled

  @Column({ nullable: true })
  cancellationNotes: string;

  @Column({ nullable: true })
  cancelledAt: Date;

  // Trip timeline
  @Column({ nullable: true })
  driverAcceptedAt: Date;

  @Column({ nullable: true })
  driverArrivedAt: Date;

  @Column({ nullable: true })
  tripStartedAt: Date;

  @Column({ nullable: true })
  tripCompletedAt: Date;

  // Estimated arrival time
  @Column({ nullable: true })
  estimatedArrivalTime: Date;

  // Promo code and discounts
  @Column({ nullable: true })
  promoCode: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountAmount: number;

  // Timestamps
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @OneToOne(() => Payment, (payment) => payment.trip, { cascade: true })
  payment: Payment;

  @OneToMany(() => Rating, (rating) => rating.trip)
  ratings: Rating[];
}

