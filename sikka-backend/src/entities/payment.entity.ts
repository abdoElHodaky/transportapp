import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { Trip } from './trip.entity';
import { User } from './user.entity';

export enum PaymentMethod {
  WALLET = 'wallet',
  EBS = 'ebs',
  CYBERPAY = 'cyberpay',
  CASH = 'cash',
  CARD = 'card',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

export enum PaymentType {
  TRIP_PAYMENT = 'trip_payment',
  WALLET_TOPUP = 'wallet_topup',
  REFUND = 'refund',
  COMMISSION = 'commission',
  PENALTY = 'penalty',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: PaymentType,
    default: PaymentType.TRIP_PAYMENT,
  })
  type: PaymentType;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
  })
  method: PaymentMethod;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  platformCommission: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  driverEarnings: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  processingFee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountAmount: number;

  // Gateway information
  @Column({ nullable: true })
  gatewayTransactionId: string;

  @Column({ nullable: true })
  gatewayReference: string;

  @Column({ nullable: true })
  gatewayResponse: string;

  @Column({ nullable: true })
  gatewayStatus: string;

  // Refund information
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  refundedAmount: number;

  @Column({ nullable: true })
  refundReason: string;

  @Column({ nullable: true })
  refundedAt: Date;

  @Column({ nullable: true })
  refundTransactionId: string;

  // Payment metadata
  @Column({ nullable: true })
  description: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  // Failure information
  @Column({ nullable: true })
  failureReason: string;

  @Column({ nullable: true })
  failureCode: string;

  @Column({ default: 0 })
  retryCount: number;

  @Column({ nullable: true })
  lastRetryAt: Date;

  // Processing timestamps
  @Column({ nullable: true })
  processedAt: Date;

  @Column({ nullable: true })
  completedAt: Date;

  @Column({ nullable: true })
  failedAt: Date;

  // Timestamps
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @OneToOne(() => Trip, (trip) => trip.payment, { nullable: true })
  @JoinColumn({ name: 'tripId' })
  trip: Trip;

  @Column({ nullable: true })
  tripId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  // Driver for commission payments
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'driverId' })
  driver: User;

  @Column({ nullable: true })
  driverId: string;
}

