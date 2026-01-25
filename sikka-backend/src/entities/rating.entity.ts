import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Trip } from './trip.entity';

export enum RatingType {
  PASSENGER_TO_DRIVER = 'passenger_to_driver',
  DRIVER_TO_PASSENGER = 'driver_to_passenger',
}

@Entity('ratings')
export class Rating {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: RatingType,
  })
  type: RatingType;

  @Column({ type: 'decimal', precision: 2, scale: 1 })
  rating: number; // 1.0 to 5.0

  @Column({ nullable: true, length: 500 })
  comment: string;

  // Specific rating categories (optional)
  @Column({ type: 'decimal', precision: 2, scale: 1, nullable: true })
  punctualityRating: number;

  @Column({ type: 'decimal', precision: 2, scale: 1, nullable: true })
  cleanlinessRating: number;

  @Column({ type: 'decimal', precision: 2, scale: 1, nullable: true })
  safetyRating: number;

  @Column({ type: 'decimal', precision: 2, scale: 1, nullable: true })
  communicationRating: number;

  @Column({ type: 'decimal', precision: 2, scale: 1, nullable: true })
  vehicleConditionRating: number;

  // Flags for inappropriate content
  @Column({ default: false })
  isFlagged: boolean;

  @Column({ nullable: true })
  flagReason: string;

  @Column({ nullable: true })
  flaggedAt: Date;

  @Column({ nullable: true })
  flaggedBy: string; // Admin user ID

  // Response from the rated user
  @Column({ nullable: true, length: 500 })
  response: string;

  @Column({ nullable: true })
  respondedAt: Date;

  // Timestamps
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Trip, (trip) => trip.ratings, { nullable: false })
  @JoinColumn({ name: 'tripId' })
  trip: Trip;

  @Column()
  tripId: string;

  @ManyToOne(() => User, (user) => user.ratingsGiven, { nullable: false })
  @JoinColumn({ name: 'ratedById' })
  ratedBy: User;

  @Column()
  ratedById: string;

  @ManyToOne(() => User, (user) => user.ratingsReceived, { nullable: false })
  @JoinColumn({ name: 'ratedUserId' })
  ratedUser: User;

  @Column()
  ratedUserId: string;
}
