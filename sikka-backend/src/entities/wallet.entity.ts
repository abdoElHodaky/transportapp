import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { Transaction } from './transaction.entity';

export enum WalletStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  FROZEN = 'frozen',
}

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  balance: number;

  @Column({ type: 'varchar', length: 3, default: 'SDG' })
  currency: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalEarnings: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalSpent: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalTopups: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalWithdrawals: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  pendingAmount: number; // Amount in pending transactions

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  reservedAmount: number; // Amount reserved for ongoing trips

  @Column({
    type: 'enum',
    enum: WalletStatus,
    default: WalletStatus.ACTIVE,
  })
  status: WalletStatus;

  // Limits and restrictions
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 10000 })
  dailySpendLimit: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 50000 })
  monthlySpendLimit: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  dailySpentAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  monthlySpentAmount: number;

  @Column({ nullable: true })
  lastSpendResetDate: Date;

  // PIN and security
  @Column({ nullable: true })
  pin: string; // Hashed PIN for wallet transactions

  @Column({ default: false })
  pinEnabled: boolean;

  @Column({ default: 0 })
  failedPinAttempts: number;

  @Column({ nullable: true })
  pinLockedUntil: Date;

  // Timestamps
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  lastTransactionAt: Date;

  // Relationships
  @OneToOne(() => User, (user) => user.wallet, { nullable: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @OneToMany(() => Transaction, (transaction) => transaction.wallet)
  transactions: Transaction[];

  // Helper methods (these would be implemented in a service)
  canSpend(amount: number): boolean {
    return (
      this.status === WalletStatus.ACTIVE &&
      this.balance >= amount &&
      this.dailySpentAmount + amount <= this.dailySpendLimit &&
      this.monthlySpentAmount + amount <= this.monthlySpendLimit
    );
  }

  getAvailableBalance(): number {
    return this.balance - this.reservedAmount - this.pendingAmount;
  }
}
