import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Wallet } from './wallet.entity';
import { User } from './user.entity';
import { Trip } from './trip.entity';

export enum TransactionType {
  CREDIT = 'credit',
  DEBIT = 'debit',
  TOPUP = 'topup',
  TRIP_PAYMENT = 'trip_payment',
  TRIP_EARNING = 'trip_earning',
  REFUND = 'refund',
  COMMISSION = 'commission',
  PENALTY = 'penalty',
  WITHDRAWAL = 'withdrawal',
  BONUS = 'bonus',
  CASHBACK = 'cashback',
}

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REVERSED = 'reversed',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  fee: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  balanceBefore: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  balanceAfter: number;

  @Column({ nullable: true, length: 500 })
  description: string;

  @Column({ nullable: true })
  reference: string; // External reference (payment gateway, etc.)

  @Column({ nullable: true })
  externalTransactionId: string;

  // Metadata for additional information
  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  // Failure information
  @Column({ nullable: true })
  failureReason: string;

  @Column({ nullable: true })
  failureCode: string;

  // Processing information
  @Column({ nullable: true })
  processedAt: Date;

  @Column({ nullable: true })
  completedAt: Date;

  @Column({ nullable: true })
  failedAt: Date;

  @Column({ nullable: true })
  reversedAt: Date;

  // Reversal information
  @Column({ nullable: true })
  reversalReason: string;

  @Column({ nullable: true })
  reversalTransactionId: string;

  // Timestamps
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Wallet, (wallet) => wallet.transactions, { nullable: false })
  @JoinColumn({ name: 'walletId' })
  wallet: Wallet;

  @Column()
  walletId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  // Optional trip reference for trip-related transactions
  @ManyToOne(() => Trip, { nullable: true })
  @JoinColumn({ name: 'tripId' })
  trip: Trip;

  @Column({ nullable: true })
  tripId: string;

  // For transfer transactions (from one user to another)
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'fromUserId' })
  fromUser: User;

  @Column({ nullable: true })
  fromUserId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'toUserId' })
  toUser: User;

  @Column({ nullable: true })
  toUserId: string;
}
