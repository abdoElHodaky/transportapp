import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Payment, PaymentMethod, PaymentStatus } from '../../entities/payment.entity';
import { Transaction, TransactionType, TransactionStatus } from '../../entities/transaction.entity';
import { Wallet } from '../../entities/wallet.entity';
import { Trip, TripStatus } from '../../entities/trip.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    @InjectRepository(Trip)
    private tripRepository: Repository<Trip>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private dataSource: DataSource,
  ) {}

  async processPayment(tripId: string, paymentDto: {
    method: PaymentMethod;
    gatewayTransactionId?: string;
  }) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find trip with passenger and driver
      const trip = await queryRunner.manager.findOne(Trip, {
        where: { id: tripId, status: TripStatus.COMPLETED },
        relations: ['passenger', 'driver', 'passenger.wallet', 'driver.wallet'],
      });

      if (!trip) {
        throw new NotFoundException('Trip not found or not completed');
      }

      if (!trip.driver) {
        throw new BadRequestException('Trip has no assigned driver');
      }

      // Check if payment already exists
      const existingPayment = await queryRunner.manager.findOne(Payment, {
        where: { tripId },
      });

      if (existingPayment) {
        throw new BadRequestException('Payment already processed for this trip');
      }

      const amount = trip.actualFare || trip.estimatedFare;
      const commissionRate = 0.15; // 15% platform commission
      const platformCommission = Math.round(amount * commissionRate * 100) / 100;
      const driverEarnings = Math.round((amount - platformCommission) * 100) / 100;

      // Create payment record
      const payment = queryRunner.manager.create(Payment, {
        tripId,
        amount,
        method: paymentDto.method,
        status: PaymentStatus.PROCESSING,
        platformCommission,
        driverEarnings,
        commissionRate,
        gatewayTransactionId: paymentDto.gatewayTransactionId,
      });

      let savedPayment = await queryRunner.manager.save(payment);

      // Process payment based on method
      if (paymentDto.method === PaymentMethod.WALLET) {
        // Process wallet payment
        if (!trip.passenger.wallet) {
          throw new BadRequestException('Passenger wallet not found');
        }

        if (trip.passenger.wallet.balance < amount) {
          throw new BadRequestException('Insufficient wallet balance');
        }

        // Deduct from passenger wallet
        trip.passenger.wallet.balance = Math.round((trip.passenger.wallet.balance - amount) * 100) / 100;
        trip.passenger.wallet.totalSpent = Math.round((trip.passenger.wallet.totalSpent + amount) * 100) / 100;
        await queryRunner.manager.save(trip.passenger.wallet);

        // Create passenger transaction
        const passengerTransaction = queryRunner.manager.create(Transaction, {
          walletId: trip.passenger.wallet.id,
          type: TransactionType.TRIP_PAYMENT,
          amount: -amount,
          balanceBefore: trip.passenger.wallet.balance + amount,
          balanceAfter: trip.passenger.wallet.balance,
          status: TransactionStatus.COMPLETED,
          description: `Payment for trip to ${trip.dropoffAddress}`,
          reference: tripId,
        });
        await queryRunner.manager.save(passengerTransaction);

        // Add to driver wallet
        if (!trip.driver.wallet) {
          // Create wallet if doesn't exist
          const driverWallet = queryRunner.manager.create(Wallet, {
            user: trip.driver,
            balance: 0,
            currency: 'SDG',
          });
          trip.driver.wallet = await queryRunner.manager.save(driverWallet);
        }

        trip.driver.wallet.balance = Math.round((trip.driver.wallet.balance + driverEarnings) * 100) / 100;
        trip.driver.wallet.totalEarnings = Math.round((trip.driver.wallet.totalEarnings + driverEarnings) * 100) / 100;
        await queryRunner.manager.save(trip.driver.wallet);

        // Create driver transaction
        const driverTransaction = queryRunner.manager.create(Transaction, {
          walletId: trip.driver.wallet.id,
          type: TransactionType.TRIP_EARNING,
          amount: driverEarnings,
          balanceBefore: trip.driver.wallet.balance - driverEarnings,
          balanceAfter: trip.driver.wallet.balance,
          status: TransactionStatus.COMPLETED,
          description: `Earnings from trip from ${trip.pickupAddress}`,
          reference: tripId,
        });
        await queryRunner.manager.save(driverTransaction);

        // Update payment status
        savedPayment.status = PaymentStatus.COMPLETED;
        savedPayment.processedAt = new Date();
        savedPayment = await queryRunner.manager.save(savedPayment);

      } else {
        // For EBS/CyberPay, we would integrate with external gateway
        // For now, mark as pending and handle async callback
        savedPayment.status = PaymentStatus.PENDING;
        savedPayment = await queryRunner.manager.save(savedPayment);
        
        // TODO: Integrate with EBS/CyberPay API
        // TODO: Handle webhook callbacks for payment confirmation
      }

      await queryRunner.commitTransaction();

      return {
        message: 'Payment processed successfully',
        payment: {
          id: savedPayment.id,
          tripId: savedPayment.tripId,
          amount: savedPayment.amount,
          method: savedPayment.method,
          status: savedPayment.status,
          platformCommission: savedPayment.platformCommission,
          driverEarnings: savedPayment.driverEarnings,
          processedAt: savedPayment.processedAt,
          gatewayTransactionId: savedPayment.gatewayTransactionId,
        },
      };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getWalletBalance(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['wallet'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.wallet) {
      // Create wallet if doesn't exist
      const wallet = this.walletRepository.create({
        user,
        balance: 0,
        currency: 'SDG',
      });
      user.wallet = await this.walletRepository.save(wallet);
    }

    return {
      message: 'Wallet balance retrieved successfully',
      wallet: {
        id: user.wallet.id,
        balance: user.wallet.balance,
        totalEarnings: user.wallet.totalEarnings,
        totalSpent: user.wallet.totalSpent,
        pendingAmount: user.wallet.pendingAmount,
        currency: user.wallet.currency,
        isActive: user.wallet.isActive,
        lastUpdated: user.wallet.updatedAt,
      },
    };
  }

  async topUpWallet(userId: string, topUpDto: {
    amount: number;
    method: PaymentMethod;
    gatewayTransactionId?: string;
  }) {
    if (topUpDto.amount <= 0) {
      throw new BadRequestException('Top-up amount must be greater than 0');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['wallet'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.wallet) {
      // Create wallet if doesn't exist
      const wallet = this.walletRepository.create({
        user,
        balance: 0,
        currency: 'SDG',
      });
      user.wallet = await this.walletRepository.save(wallet);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // For wallet top-up via EBS/CyberPay, we would process the payment first
      // For now, we'll simulate successful payment
      
      const balanceBefore = user.wallet.balance;
      user.wallet.balance = Math.round((user.wallet.balance + topUpDto.amount) * 100) / 100;
      await queryRunner.manager.save(user.wallet);

      // Create transaction record
      const transaction = queryRunner.manager.create(Transaction, {
        walletId: user.wallet.id,
        type: TransactionType.TOPUP,
        amount: topUpDto.amount,
        balanceBefore,
        balanceAfter: user.wallet.balance,
        status: TransactionStatus.COMPLETED,
        description: `Wallet top-up via ${topUpDto.method}`,
        gatewayTransactionId: topUpDto.gatewayTransactionId,
      });

      const savedTransaction = await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      return {
        message: 'Wallet topped up successfully',
        transaction: {
          id: savedTransaction.id,
          type: savedTransaction.type,
          amount: savedTransaction.amount,
          method: topUpDto.method,
          status: savedTransaction.status,
          balanceBefore: savedTransaction.balanceBefore,
          balanceAfter: savedTransaction.balanceAfter,
          description: savedTransaction.description,
          processedAt: savedTransaction.createdAt,
          gatewayTransactionId: savedTransaction.gatewayTransactionId,
        },
      };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException('Failed to process wallet top-up');
    } finally {
      await queryRunner.release();
    }
  }

  async getTransactions(userId: string, page: number = 1, limit: number = 10) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['wallet'],
    });

    if (!user || !user.wallet) {
      throw new NotFoundException('User or wallet not found');
    }

    const [transactions, total] = await this.transactionRepository.findAndCount({
      where: { walletId: user.wallet.id },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      message: 'Transactions retrieved successfully',
      transactions: transactions.map(transaction => ({
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        balanceBefore: transaction.balanceBefore,
        balanceAfter: transaction.balanceAfter,
        status: transaction.status,
        description: transaction.description,
        reference: transaction.reference,
        gatewayTransactionId: transaction.gatewayTransactionId,
        createdAt: transaction.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPaymentHistory(userId: string, page: number = 1, limit: number = 10) {
    // Get payments for trips where user was passenger or driver
    const [payments, total] = await this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.trip', 'trip')
      .leftJoinAndSelect('trip.passenger', 'passenger')
      .leftJoinAndSelect('trip.driver', 'driver')
      .where('trip.passengerId = :userId OR trip.driverId = :userId', { userId })
      .orderBy('payment.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      message: 'Payment history retrieved successfully',
      payments: payments.map(payment => ({
        id: payment.id,
        tripId: payment.tripId,
        amount: payment.amount,
        method: payment.method,
        status: payment.status,
        platformCommission: payment.platformCommission,
        driverEarnings: payment.driverEarnings,
        processedAt: payment.processedAt,
        trip: {
          pickup: payment.trip.pickupAddress,
          dropoff: payment.trip.dropoffAddress,
          completedAt: payment.trip.tripCompletedAt,
        },
        createdAt: payment.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async refundPayment(paymentId: string, refundReason: string) {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId, status: PaymentStatus.COMPLETED },
      relations: ['trip', 'trip.passenger', 'trip.driver', 'trip.passenger.wallet', 'trip.driver.wallet'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found or not eligible for refund');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Refund to passenger wallet
      if (payment.trip.passenger.wallet) {
        payment.trip.passenger.wallet.balance = Math.round((payment.trip.passenger.wallet.balance + payment.amount) * 100) / 100;
        await queryRunner.manager.save(payment.trip.passenger.wallet);

        // Create refund transaction for passenger
        const passengerRefundTransaction = queryRunner.manager.create(Transaction, {
          walletId: payment.trip.passenger.wallet.id,
          type: TransactionType.REFUND,
          amount: payment.amount,
          balanceBefore: payment.trip.passenger.wallet.balance - payment.amount,
          balanceAfter: payment.trip.passenger.wallet.balance,
          status: TransactionStatus.COMPLETED,
          description: `Refund for trip to ${payment.trip.dropoffAddress}`,
          reference: payment.tripId,
        });
        await queryRunner.manager.save(passengerRefundTransaction);
      }

      // Deduct from driver wallet
      if (payment.trip.driver && payment.trip.driver.wallet) {
        payment.trip.driver.wallet.balance = Math.round((payment.trip.driver.wallet.balance - payment.driverEarnings) * 100) / 100;
        payment.trip.driver.wallet.totalEarnings = Math.round((payment.trip.driver.wallet.totalEarnings - payment.driverEarnings) * 100) / 100;
        await queryRunner.manager.save(payment.trip.driver.wallet);

        // Create deduction transaction for driver
        const driverDeductionTransaction = queryRunner.manager.create(Transaction, {
          walletId: payment.trip.driver.wallet.id,
          type: TransactionType.REFUND,
          amount: -payment.driverEarnings,
          balanceBefore: payment.trip.driver.wallet.balance + payment.driverEarnings,
          balanceAfter: payment.trip.driver.wallet.balance,
          status: TransactionStatus.COMPLETED,
          description: `Refund deduction for trip from ${payment.trip.pickupAddress}`,
          reference: payment.tripId,
        });
        await queryRunner.manager.save(driverDeductionTransaction);
      }

      // Update payment status
      payment.status = PaymentStatus.REFUNDED;
      payment.refundReason = refundReason;
      payment.refundedAt = new Date();
      await queryRunner.manager.save(payment);

      await queryRunner.commitTransaction();

      return {
        message: 'Payment refunded successfully',
        refund: {
          paymentId: payment.id,
          amount: payment.amount,
          refundReason,
          refundedAt: payment.refundedAt,
        },
      };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException('Failed to process refund');
    } finally {
      await queryRunner.release();
    }
  }
}

