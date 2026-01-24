import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { User, UserRole, UserStatus } from '../../entities/user.entity';
import { Trip, TripStatus } from '../../entities/trip.entity';
import { Payment, PaymentStatus } from '../../entities/payment.entity';
import { Transaction, TransactionType } from '../../entities/transaction.entity';
import { Wallet } from '../../entities/wallet.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Trip)
    private tripRepository: Repository<Trip>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
  ) {}

  /**
   * Get platform analytics dashboard data
   */
  async getDashboardAnalytics(adminUserId: string) {
    await this.validateAdminUser(adminUserId);

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // User statistics
    const totalUsers = await this.userRepository.count();
    const totalPassengers = await this.userRepository.count({ where: { role: UserRole.PASSENGER } });
    const totalDrivers = await this.userRepository.count({ where: { role: UserRole.DRIVER } });
    const activeUsers = await this.userRepository.count({ where: { status: UserStatus.ACTIVE } });
    const newUsersToday = await this.userRepository.count({
      where: { createdAt: Between(startOfDay, today) },
    });

    // Trip statistics
    const totalTrips = await this.tripRepository.count();
    const completedTrips = await this.tripRepository.count({ where: { status: TripStatus.COMPLETED } });
    const cancelledTrips = await this.tripRepository.count({ where: { status: TripStatus.CANCELLED } });
    const tripsToday = await this.tripRepository.count({
      where: { createdAt: Between(startOfDay, today) },
    });
    const tripsThisWeek = await this.tripRepository.count({
      where: { createdAt: Between(startOfWeek, today) },
    });

    // Revenue statistics
    const totalRevenue = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .getRawOne();

    const totalCommission = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.platformCommission)', 'total')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .getRawOne();

    const revenueToday = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .andWhere('payment.createdAt >= :startOfDay', { startOfDay })
      .getRawOne();

    const revenueThisMonth = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .andWhere('payment.createdAt >= :startOfMonth', { startOfMonth })
      .getRawOne();

    // Top performing drivers
    const topDrivers = await this.userRepository
      .createQueryBuilder('user')
      .where('user.role = :role', { role: UserRole.DRIVER })
      .orderBy('user.rating', 'DESC')
      .addOrderBy('user.totalTrips', 'DESC')
      .limit(10)
      .getMany();

    return {
      message: 'Dashboard analytics retrieved successfully',
      analytics: {
        users: {
          total: totalUsers,
          passengers: totalPassengers,
          drivers: totalDrivers,
          active: activeUsers,
          newToday: newUsersToday,
        },
        trips: {
          total: totalTrips,
          completed: completedTrips,
          cancelled: cancelledTrips,
          today: tripsToday,
          thisWeek: tripsThisWeek,
          completionRate: totalTrips > 0 ? Math.round((completedTrips / totalTrips) * 100) : 0,
        },
        revenue: {
          total: parseFloat(totalRevenue?.total || '0'),
          commission: parseFloat(totalCommission?.total || '0'),
          today: parseFloat(revenueToday?.total || '0'),
          thisMonth: parseFloat(revenueThisMonth?.total || '0'),
        },
        topDrivers: topDrivers.map(driver => ({
          id: driver.id,
          name: driver.name,
          phone: driver.phone,
          rating: driver.rating,
          totalTrips: driver.totalTrips,
          vehicleInfo: `${driver.vehicleModel} (${driver.vehiclePlateNumber})`,
        })),
      },
    };
  }

  /**
   * Get all users with pagination and filtering
   */
  async getUsers(
    adminUserId: string,
    page: number = 1,
    limit: number = 20,
    role?: UserRole,
    status?: UserStatus,
    search?: string,
  ) {
    await this.validateAdminUser(adminUserId);

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.wallet', 'wallet');

    if (role) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    if (status) {
      queryBuilder.andWhere('user.status = :status', { status });
    }

    if (search) {
      queryBuilder.andWhere(
        '(user.name ILIKE :search OR user.phone ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [users, total] = await queryBuilder
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      message: 'Users retrieved successfully',
      users: users.map(user => ({
        id: user.id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        rating: user.rating,
        totalTrips: user.totalTrips,
        phoneVerified: user.phoneVerified,
        isOnline: user.isOnline,
        isAvailable: user.isAvailable,
        wallet: {
          balance: user.wallet?.balance || 0,
          totalEarnings: user.wallet?.totalEarnings || 0,
          totalSpent: user.wallet?.totalSpent || 0,
        },
        vehicleInfo: user.role === UserRole.DRIVER ? {
          type: user.vehicleType,
          model: user.vehicleModel,
          plateNumber: user.vehiclePlateNumber,
          color: user.vehicleColor,
        } : null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update user status (suspend, activate, etc.)
   */
  async updateUserStatus(adminUserId: string, userId: string, status: UserStatus, reason?: string) {
    await this.validateAdminUser(adminUserId);

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const oldStatus = user.status;
    user.status = status;
    await this.userRepository.save(user);

    // TODO: Send notification to user about status change
    // TODO: Log admin action for audit trail

    return {
      message: 'User status updated successfully',
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        oldStatus,
        newStatus: status,
        reason,
        updatedAt: new Date(),
      },
    };
  }

  /**
   * Get all trips with advanced filtering
   */
  async getTrips(
    adminUserId: string,
    page: number = 1,
    limit: number = 20,
    status?: TripStatus,
    dateFrom?: Date,
    dateTo?: Date,
  ) {
    await this.validateAdminUser(adminUserId);

    const queryBuilder = this.tripRepository
      .createQueryBuilder('trip')
      .leftJoinAndSelect('trip.passenger', 'passenger')
      .leftJoinAndSelect('trip.driver', 'driver')
      .leftJoinAndSelect('trip.payment', 'payment');

    if (status) {
      queryBuilder.andWhere('trip.status = :status', { status });
    }

    if (dateFrom && dateTo) {
      queryBuilder.andWhere('trip.createdAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom,
        dateTo,
      });
    }

    const [trips, total] = await queryBuilder
      .orderBy('trip.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      message: 'Trips retrieved successfully',
      trips: trips.map(trip => ({
        id: trip.id,
        status: trip.status,
        type: trip.type,
        passenger: {
          id: trip.passenger.id,
          name: trip.passenger.name,
          phone: trip.passenger.phone,
        },
        driver: trip.driver ? {
          id: trip.driver.id,
          name: trip.driver.name,
          phone: trip.driver.phone,
          rating: trip.driver.rating,
        } : null,
        pickup: {
          address: trip.pickupAddress,
          coordinates: [trip.pickupLatitude, trip.pickupLongitude],
        },
        dropoff: {
          address: trip.dropoffAddress,
          coordinates: [trip.dropoffLatitude, trip.dropoffLongitude],
        },
        fare: {
          estimated: trip.estimatedFare,
          actual: trip.actualFare,
        },
        distance: {
          estimated: trip.estimatedDistance,
          actual: trip.actualDistance,
        },
        payment: trip.payment ? {
          id: trip.payment.id,
          amount: trip.payment.amount,
          method: trip.payment.method,
          status: trip.payment.status,
          commission: trip.payment.platformCommission,
        } : null,
        timestamps: {
          createdAt: trip.createdAt,
          completedAt: trip.tripCompletedAt,
          cancelledAt: trip.cancelledAt,
        },
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get financial reports
   */
  async getFinancialReports(
    adminUserId: string,
    dateFrom: Date,
    dateTo: Date,
    groupBy: 'day' | 'week' | 'month' = 'day',
  ) {
    await this.validateAdminUser(adminUserId);

    // Revenue by period
    const revenueQuery = this.paymentRepository
      .createQueryBuilder('payment')
      .select([
        `DATE_TRUNC('${groupBy}', payment.createdAt) as period`,
        'SUM(payment.amount) as revenue',
        'SUM(payment.platformCommission) as commission',
        'COUNT(*) as transactions',
      ])
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .andWhere('payment.createdAt BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
      .groupBy(`DATE_TRUNC('${groupBy}', payment.createdAt)`)
      .orderBy('period', 'ASC');

    const revenueData = await revenueQuery.getRawMany();

    // Transaction types breakdown
    const transactionTypes = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select([
        'transaction.type as type',
        'COUNT(*) as count',
        'SUM(ABS(transaction.amount)) as total_amount',
      ])
      .where('transaction.createdAt BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
      .groupBy('transaction.type')
      .getRawMany();

    // Top earning drivers
    const topEarningDrivers = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.wallet', 'wallet')
      .where('user.role = :role', { role: UserRole.DRIVER })
      .orderBy('wallet.totalEarnings', 'DESC')
      .limit(10)
      .getMany();

    return {
      message: 'Financial reports retrieved successfully',
      reports: {
        revenueByPeriod: revenueData.map(item => ({
          period: item.period,
          revenue: parseFloat(item.revenue || '0'),
          commission: parseFloat(item.commission || '0'),
          transactions: parseInt(item.transactions || '0'),
        })),
        transactionTypes: transactionTypes.map(item => ({
          type: item.type,
          count: parseInt(item.count || '0'),
          totalAmount: parseFloat(item.total_amount || '0'),
        })),
        topEarningDrivers: topEarningDrivers.map(driver => ({
          id: driver.id,
          name: driver.name,
          phone: driver.phone,
          totalEarnings: driver.wallet?.totalEarnings || 0,
          totalTrips: driver.totalTrips,
          rating: driver.rating,
        })),
        summary: {
          totalRevenue: revenueData.reduce((sum, item) => sum + parseFloat(item.revenue || '0'), 0),
          totalCommission: revenueData.reduce((sum, item) => sum + parseFloat(item.commission || '0'), 0),
          totalTransactions: revenueData.reduce((sum, item) => sum + parseInt(item.transactions || '0'), 0),
        },
      },
    };
  }

  /**
   * Export data to CSV
   */
  async exportData(
    adminUserId: string,
    type: 'users' | 'trips' | 'payments',
    dateFrom?: Date,
    dateTo?: Date,
  ) {
    await this.validateAdminUser(adminUserId);

    let data: any[] = [];
    let headers: string[] = [];

    switch (type) {
      case 'users':
        const users = await this.userRepository.find({
          relations: ['wallet'],
          order: { createdAt: 'DESC' },
        });
        
        headers = ['ID', 'Name', 'Phone', 'Email', 'Role', 'Status', 'Rating', 'Total Trips', 'Wallet Balance', 'Created At'];
        data = users.map(user => [
          user.id,
          user.name || '',
          user.phone,
          user.email || '',
          user.role,
          user.status,
          user.rating || 0,
          user.totalTrips,
          user.wallet?.balance || 0,
          user.createdAt.toISOString(),
        ]);
        break;

      case 'trips':
        const queryBuilder = this.tripRepository
          .createQueryBuilder('trip')
          .leftJoinAndSelect('trip.passenger', 'passenger')
          .leftJoinAndSelect('trip.driver', 'driver')
          .leftJoinAndSelect('trip.payment', 'payment');

        if (dateFrom && dateTo) {
          queryBuilder.andWhere('trip.createdAt BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo });
        }

        const trips = await queryBuilder.orderBy('trip.createdAt', 'DESC').getMany();
        
        headers = ['Trip ID', 'Status', 'Passenger', 'Driver', 'Pickup', 'Dropoff', 'Fare', 'Distance', 'Created At', 'Completed At'];
        data = trips.map(trip => [
          trip.id,
          trip.status,
          trip.passenger.name || trip.passenger.phone,
          trip.driver?.name || trip.driver?.phone || 'N/A',
          trip.pickupAddress,
          trip.dropoffAddress,
          trip.actualFare || trip.estimatedFare,
          trip.actualDistance || trip.estimatedDistance,
          trip.createdAt.toISOString(),
          trip.tripCompletedAt?.toISOString() || 'N/A',
        ]);
        break;

      case 'payments':
        const paymentQueryBuilder = this.paymentRepository
          .createQueryBuilder('payment')
          .leftJoinAndSelect('payment.trip', 'trip')
          .leftJoinAndSelect('trip.passenger', 'passenger')
          .leftJoinAndSelect('trip.driver', 'driver');

        if (dateFrom && dateTo) {
          paymentQueryBuilder.andWhere('payment.createdAt BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo });
        }

        const payments = await paymentQueryBuilder.orderBy('payment.createdAt', 'DESC').getMany();
        
        headers = ['Payment ID', 'Trip ID', 'Amount', 'Method', 'Status', 'Commission', 'Driver Earnings', 'Passenger', 'Driver', 'Created At'];
        data = payments.map(payment => [
          payment.id,
          payment.tripId,
          payment.amount,
          payment.method,
          payment.status,
          payment.platformCommission,
          payment.driverEarnings,
          payment.trip.passenger.name || payment.trip.passenger.phone,
          payment.trip.driver?.name || payment.trip.driver?.phone || 'N/A',
          payment.createdAt.toISOString(),
        ]);
        break;
    }

    // Convert to CSV format
    const csvContent = [
      headers.join(','),
      ...data.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return {
      message: 'Data exported successfully',
      export: {
        type,
        filename: `${type}_export_${new Date().toISOString().split('T')[0]}.csv`,
        content: csvContent,
        recordCount: data.length,
      },
    };
  }

  /**
   * Validate that the user is an admin
   */
  private async validateAdminUser(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId, role: UserRole.ADMIN, status: UserStatus.ACTIVE },
    });

    if (!user) {
      throw new ForbiddenException('Admin access required');
    }

    return user;
  }
}

