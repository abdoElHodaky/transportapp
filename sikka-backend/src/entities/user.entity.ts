import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Trip } from './trip.entity';
import { Wallet } from './wallet.entity';
import { Rating } from './rating.entity';

export enum UserRole {
  PASSENGER = 'passenger',
  DRIVER = 'driver',
  ADMIN = 'admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification',
}

export enum VehicleType {
  SEDAN = 'sedan',
  SUV = 'suv',
  HATCHBACK = 'hatchback',
  MOTORCYCLE = 'motorcycle',
  TRUCK = 'truck',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  phone: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true, unique: true })
  email: string;

  @Column({ nullable: true })
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.PASSENGER,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING_VERIFICATION,
  })
  status: UserStatus;

  @Column({ default: false })
  phoneVerified: boolean;

  @Column({ nullable: true })
  profilePicture: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ default: 0 })
  totalTrips: number;

  @Column({ default: false })
  isOnline: boolean;

  @Column({ default: false })
  isAvailable: boolean;

  // Driver-specific fields
  @Column({
    type: 'enum',
    enum: VehicleType,
    nullable: true,
  })
  vehicleType: VehicleType;

  @Column({ nullable: true })
  vehicleModel: string;

  @Column({ nullable: true })
  vehiclePlateNumber: string;

  @Column({ nullable: true })
  vehicleColor: string;

  @Column({ nullable: true })
  drivingLicenseNumber: string;

  @Column({ nullable: true })
  vehicleRegistrationNumber: string;

  // Location fields
  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  currentLatitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  currentLongitude: number;

  @Column({ nullable: true })
  currentAddress: string;

  // OTP fields
  @Column({ nullable: true })
  otpCode: string;

  @Column({ nullable: true })
  otpExpiresAt: Date;

  @Column({ default: 0 })
  otpAttempts: number;

  // Refresh token
  @Column({ nullable: true })
  refreshToken: string;

  // Timestamps
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  lastLoginAt: Date;

  // Relationships
  @OneToMany(() => Trip, (trip) => trip.passenger)
  passengerTrips: Trip[];

  @OneToMany(() => Trip, (trip) => trip.driver)
  driverTrips: Trip[];

  @OneToOne(() => Wallet, (wallet) => wallet.user, { cascade: true })
  @JoinColumn()
  wallet: Wallet;

  @OneToMany(() => Rating, (rating) => rating.ratedBy)
  ratingsGiven: Rating[];

  @OneToMany(() => Rating, (rating) => rating.ratedUser)
  ratingsReceived: Rating[];
}

