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

      const totalAmount = trip.actualFare || trip.estimatedFare;
      const platformCommissionRate = 0.15; // 15%
      const platformCommission = totalAmount * platformCommissionRate;
      const driverEarnings = totalAmount - platformCommission;

      // Create payment record
      const payment = queryRunner.manager.create(Payment, {
        tripId,
        payerId: trip.passengerId,
        payeeId: trip.driverId,
        method: paymentDto.method,
        amount: totalAmount,
        platformCommission,
        driverEarnings,
        currency: 'SDG',
        description: `Payment for trip ${tripId}`,
        gatewayTransactionId: paymentDto.gatewayTransactionId,
        status: PaymentStatus.PROCESSING,
      });

      const savedPayment = await queryRunner.manager.save(Payment, payment);

      // Process payment based on method
      let paymentResult;
      switch (paymentDto.method) {
        case PaymentMethod.WALLET:
          paymentResult = await this.processWalletPayment(queryRunner, trip, savedPayment);
          break;
        case PaymentMethod.EBS:
          paymentResult = await this.processEBSPayment(queryRunner, trip, savedPayment);
          break;
        case PaymentMethod.CYBERPAY:
          paymentResult = await this.processCyberPayPayment(queryRunner, trip, savedPayment);
          break;
        case PaymentMethod.CASH:
          paymentResult = await this.processCashPayment(queryRunner, trip, savedPayment);
          break;
        default:
          throw new BadRequestException('Unsupported payment method');
      }

      if (paymentResult.success) {
        // Update payment status
        await queryRunner.manager.update(Payment, savedPayment.id, {
          status: PaymentStatus.COMPLETED,
          completedAt: new Date(),
          gatewayResponse: JSON.stringify(paymentResult.gatewayResponse),
        });

        // Distribute earnings to driver
        if (trip.driver && trip.driver.wallet) {
          await this.creditDriverEarnings(queryRunner, trip.driver.wallet, driverEarnings, tripId);
        }

        await queryRunner.commitTransaction();

        return {
          message: 'Payment processed successfully',
          payment: {
            id: savedPayment.id,
            amount: totalAmount,
            method: paymentDto.method,
            status: PaymentStatus.COMPLETED,
            platformCommission,
            driverEarnings,
          },
        };
      } else {
        // Update payment status to failed
        await queryRunner.manager.update(Payment, savedPayment.id, {
          status: PaymentStatus.FAILED,
          failedAt: new Date(),
          failureReason: paymentResult.error,
        });

        await queryRunner.commitTransaction();

        throw new InternalServerErrorException(`Payment failed: ${paymentResult.error}`);
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getWalletBalance(userId: string) {
    const wallet = await this.walletRepository.findOne({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return {
      balance: wallet.balance,
      totalEarnings: wallet.totalEarnings,
      totalSpent: wallet.totalSpent,
      dailySpendLimit: wallet.dailySpendLimit,
      monthlySpendLimit: wallet.monthlySpendLimit,
      dailySpentAmount: wallet.dailySpentAmount,
      monthlySpentAmount: wallet.monthlySpentAmount,
      status: wallet.status,
    };
  }

  async topupWallet(userId: string, topupDto: {
    amount: number;
    method: PaymentMethod;
    gatewayTransactionId?: string;
  }) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { userId },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      // Process topup payment
      let topupResult;
      switch (topupDto.method) {
        case PaymentMethod.EBS:
          topupResult = await this.processEBSTopup(topupDto.amount, topupDto.gatewayTransactionId);
          break;
        case PaymentMethod.CYBERPAY:
          topupResult = await this.processCyberPayTopup(topupDto.amount, topupDto.gatewayTransactionId);
          break;
        default:
          throw new BadRequestException('Unsupported topup method');
      }

      if (topupResult.success) {
        // Update wallet balance
        const newBalance = wallet.balance + topupDto.amount;
        await queryRunner.manager.update(Wallet, wallet.id, {
          balance: newBalance,
          totalTopups: wallet.totalTopups + topupDto.amount,
          lastTransactionAt: new Date(),
        });

        // Record transaction
        await this.recordTransaction(queryRunner, {
          walletId: wallet.id,
          userId,
          type: TransactionType.TOPUP,
          amount: topupDto.amount,
          balanceBefore: wallet.balance,
          balanceAfter: newBalance,
          description: `Wallet topup via ${topupDto.method}`,
          externalReference: topupDto.gatewayTransactionId,
          status: TransactionStatus.COMPLETED,
        });

        await queryRunner.commitTransaction();

        return {
          message: 'Wallet topped up successfully',
          balance: newBalance,
          amount: topupDto.amount,
        };
      } else {
        await queryRunner.rollbackTransaction();
        throw new InternalServerErrorException(`Topup failed: ${topupResult.error}`);
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getTransactionHistory(userId: string, page = 1, limit = 20) {
    const wallet = await this.walletRepository.findOne({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const [transactions, total] = await this.transactionRepository.findAndCount({
      where: { walletId: wallet.id },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['trip', 'payment'],
    });

    return {
      transactions: transactions.map(transaction => ({
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        status: transaction.status,
        balanceAfter: transaction.balanceAfter,
        createdAt: transaction.createdAt,
        trip: transaction.trip ? {
          id: transaction.trip.id,
          pickupAddress: transaction.trip.pickupAddress,
          dropoffAddress: transaction.trip.dropoffAddress,
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

  async processRefund(paymentId: string, refundDto: {
    amount?: number;
    reason: string;
  }) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const payment = await queryRunner.manager.findOne(Payment, {
        where: { id: paymentId, status: PaymentStatus.COMPLETED },
        relations: ['trip', 'payer', 'payer.wallet'],
      });

      if (!payment) {
        throw new NotFoundException('Payment not found or not eligible for refund');
      }

      const refundAmount = refundDto.amount || payment.amount;

      if (refundAmount > payment.amount) {
        throw new BadRequestException('Refund amount cannot exceed payment amount');
      }

      // Process refund based on original payment method
      let refundResult;
      switch (payment.method) {
        case PaymentMethod.WALLET:
          refundResult = await this.processWalletRefund(queryRunner, payment, refundAmount);
          break;
        case PaymentMethod.EBS:
          refundResult = await this.processEBSRefund(payment, refundAmount);
          break;
        case PaymentMethod.CYBERPAY:
          refundResult = await this.processCyberPayRefund(payment, refundAmount);
          break;
        case PaymentMethod.CASH:
          refundResult = { success: true, message: 'Cash refund to be processed manually' };
          break;
        default:
          throw new BadRequestException('Refund not supported for this payment method');
      }

      if (refundResult.success) {
        // Update payment record
        await queryRunner.manager.update(Payment, paymentId, {
          refundAmount,
          status: PaymentStatus.REFUNDED,
          refundedAt: new Date(),
        });

        await queryRunner.commitTransaction();

        return {
          message: 'Refund processed successfully',
          refundAmount,
          method: payment.method,
        };
      } else {
        await queryRunner.rollbackTransaction();
        throw new InternalServerErrorException(`Refund failed: ${refundResult.error}`);
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async processWalletPayment(queryRunner: any, trip: Trip, payment: Payment) {
    const passengerWallet = trip.passenger.wallet;

    if (!passengerWallet) {
      return { success: false, error: 'Passenger wallet not found' };
    }

    if (passengerWallet.balance < payment.amount) {
      return { success: false, error: 'Insufficient wallet balance' };
    }

    // Check spending limits
    const limitCheck = await this.checkSpendingLimits(passengerWallet, payment.amount);
    if (!limitCheck.allowed) {
      return { success: false, error: limitCheck.reason };
    }

    // Deduct from passenger wallet
    const newBalance = passengerWallet.balance - payment.amount;
    await queryRunner.manager.update(Wallet, passengerWallet.id, {
      balance: newBalance,
      totalSpent: passengerWallet.totalSpent + payment.amount,
      dailySpentAmount: passengerWallet.dailySpentAmount + payment.amount,
      monthlySpentAmount: passengerWallet.monthlySpentAmount + payment.amount,
      lastTransactionAt: new Date(),
    });

    // Record transaction
    await this.recordTransaction(queryRunner, {
      walletId: passengerWallet.id,
      userId: trip.passengerId,
      tripId: trip.id,
      paymentId: payment.id,
      type: TransactionType.DEBIT,
      amount: payment.amount,
      balanceBefore: passengerWallet.balance,
      balanceAfter: newBalance,
      description: `Payment for trip ${trip.id}`,
      status: TransactionStatus.COMPLETED,
    });

    return { success: true, gatewayResponse: { method: 'wallet', balance: newBalance } };
  }

  private async processEBSPayment(queryRunner: any, trip: Trip, payment: Payment) {
    try {
      // TODO: Implement actual EBS gateway integration
      // For now, simulate successful payment
      const mockResponse = {
        transactionId: payment.gatewayTransactionId || `ebs_${Date.now()}`,
        status: 'success',
        amount: payment.amount,
        currency: 'SDG',
        timestamp: new Date().toISOString(),
      };

      return { success: true, gatewayResponse: mockResponse };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async processCyberPayPayment(queryRunner: any, trip: Trip, payment: Payment) {
    try {
      // TODO: Implement actual CyberPay gateway integration
      // For now, simulate successful payment
      const mockResponse = {
        transactionId: payment.gatewayTransactionId || `cyberpay_${Date.now()}`,
        status: 'success',
        amount: payment.amount,
        currency: 'SDG',
        timestamp: new Date().toISOString(),
      };

      return { success: true, gatewayResponse: mockResponse };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async processCashPayment(queryRunner: any, trip: Trip, payment: Payment) {
    // Cash payments are handled offline
    return {
      success: true,
      gatewayResponse: {
        method: 'cash',
        status: 'collected',
        amount: payment.amount,
        timestamp: new Date().toISOString(),
      },
    };
  }

  private async creditDriverEarnings(queryRunner: any, driverWallet: Wallet, amount: number, tripId: string) {
    const newBalance = driverWallet.balance + amount;
    
    await queryRunner.manager.update(Wallet, driverWallet.id, {
      balance: newBalance,
      totalEarnings: driverWallet.totalEarnings + amount,
      lastTransactionAt: new Date(),
    });

    await this.recordTransaction(queryRunner, {
      walletId: driverWallet.id,
      userId: driverWallet.userId,
      tripId,
      type: TransactionType.EARNING,
      amount,
      balanceBefore: driverWallet.balance,
      balanceAfter: newBalance,
      description: `Earnings from trip ${tripId}`,
      status: TransactionStatus.COMPLETED,
    });
  }

  private async recordTransaction(queryRunner: any, transactionData: any) {
    const transaction = queryRunner.manager.create(Transaction, {
      ...transactionData,
      completedAt: new Date(),
    });

    return queryRunner.manager.save(Transaction, transaction);
  }

  private async checkSpendingLimits(wallet: Wallet, amount: number) {
    // Check daily limit
    if (wallet.dailySpentAmount + amount > wallet.dailySpendLimit) {
      return { allowed: false, reason: 'Daily spending limit exceeded' };
    }

    // Check monthly limit
    if (wallet.monthlySpentAmount + amount > wallet.monthlySpendLimit) {
      return { allowed: false, reason: 'Monthly spending limit exceeded' };
    }

    return { allowed: true };
  }

  private async processEBSTopup(amount: number, gatewayTransactionId: string) {
    // TODO: Implement actual EBS topup integration
    return { success: true, transactionId: gatewayTransactionId };
  }

  private async processCyberPayTopup(amount: number, gatewayTransactionId: string) {
    // TODO: Implement actual CyberPay topup integration
    return { success: true, transactionId: gatewayTransactionId };
  }

  private async processWalletRefund(queryRunner: any, payment: Payment, refundAmount: number) {
    const wallet = payment.payer.wallet;
    const newBalance = wallet.balance + refundAmount;

    await queryRunner.manager.update(Wallet, wallet.id, {
      balance: newBalance,
      lastTransactionAt: new Date(),
    });

    await this.recordTransaction(queryRunner, {
      walletId: wallet.id,
      userId: payment.payerId,
      paymentId: payment.id,
      type: TransactionType.REFUND,
      amount: refundAmount,
      balanceBefore: wallet.balance,
      balanceAfter: newBalance,
      description: `Refund for payment ${payment.id}`,
      status: TransactionStatus.COMPLETED,
    });

    return { success: true };
  }

  private async processEBSRefund(payment: Payment, refundAmount: number) {
    // TODO: Implement actual EBS refund integration
    return { success: true, transactionId: `ebs_refund_${Date.now()}` };
  }

  private async processCyberPayRefund(payment: Payment, refundAmount: number) {
    // TODO: Implement actual CyberPay refund integration
    return { success: true, transactionId: `cyberpay_refund_${Date.now()}` };
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
