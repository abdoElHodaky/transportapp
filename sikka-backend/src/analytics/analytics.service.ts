import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { User } from '../user/entities/user.entity';
import { Trip } from '../trip/entities/trip.entity';
import { Transaction } from '../transaction/entities/transaction.entity';
import { Rating } from '../rating/entities/rating.entity';
import { EventTrackingService } from './services/event-tracking.service';

export interface AnalyticsEvent {
  eventType: string;
  userId?: string;
  sessionId?: string;
  properties: Record<string, any>;
  timestamp: Date;
  platform?: 'web' | 'ios' | 'android';
  version?: string;
}

export interface DashboardMetrics {
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalTrips: number;
    totalRevenue: number;
    averageRating: number;
  };
  trends: {
    userGrowth: number;
    tripGrowth: number;
    revenueGrowth: number;
  };
  realTime: {
    activeTrips: number;
    onlineDrivers: number;
    pendingRequests: number;
  };
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Trip)
    private tripRepository: Repository<Trip>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Rating)
    private ratingRepository: Repository<Rating>,
    @InjectQueue('analytics') private analyticsQueue: Queue,
    private readonly eventTrackingService: EventTrackingService,
  ) {}

  /**
   * 📊 Track user events
   */
  async trackEvent(event: AnalyticsEvent): Promise<void> {
    try {
      // Add to queue for processing
      await this.analyticsQueue.add('track-event', event, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });

      // Also track in real-time service
      await this.eventTrackingService.trackEvent(event);

      this.logger.debug(`Event tracked: ${event.eventType}`);
    } catch (error) {
      this.logger.error(`Failed to track event: ${error.message}`);
    }
  }

  /**
   * 📈 Get dashboard metrics
   */
  async getDashboardMetrics(dateRange?: { start: Date; end: Date }): Promise<DashboardMetrics> {
    const endDate = dateRange?.end || new Date();
    const startDate = dateRange?.start || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    const [
      totalUsers,
      activeUsers,
      totalTrips,
      completedTrips,
      totalTransactions,
      averageRating,
      previousPeriodUsers,
      previousPeriodTrips,
      previousPeriodRevenue,
      activeTripsCount,
      onlineDriversCount,
    ] = await Promise.all([
      // Current period metrics
      this.userRepository.count(),
      this.userRepository.count({
        where: { lastSeen: Between(startDate, endDate) },
      }),
      this.tripRepository.count({
        where: { createdAt: Between(startDate, endDate) },
      }),
      this.tripRepository.count({
        where: { 
          createdAt: Between(startDate, endDate),
          status: 'completed' as any,
        },
      }),
      this.transactionRepository
        .createQueryBuilder('transaction')
        .select('SUM(transaction.amount)', 'total')
        .where('transaction.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
        .andWhere('transaction.status = :status', { status: 'completed' })
        .getRawOne(),
      this.ratingRepository
        .createQueryBuilder('rating')
        .select('AVG(rating.rating)', 'average')
        .where('rating.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
        .getRawOne(),

      // Previous period for growth calculation
      this.userRepository.count({
        where: { 
          createdAt: Between(
            new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime())),
            startDate
          ),
        },
      }),
      this.tripRepository.count({
        where: { 
          createdAt: Between(
            new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime())),
            startDate
          ),
        },
      }),
      this.transactionRepository
        .createQueryBuilder('transaction')
        .select('SUM(transaction.amount)', 'total')
        .where('transaction.createdAt BETWEEN :start AND :end', {
          start: new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime())),
          end: startDate,
        })
        .andWhere('transaction.status = :status', { status: 'completed' })
        .getRawOne(),

      // Real-time metrics
      this.tripRepository.count({
        where: { status: 'in_progress' as any },
      }),
      this.userRepository.count({
        where: { 
          role: 'driver' as any,
          isAvailable: true,
          lastSeen: Between(new Date(Date.now() - 5 * 60 * 1000), new Date()), // Last 5 minutes
        },
      }),
    ]);

    const totalRevenue = parseFloat(totalTransactions?.total || '0');
    const previousRevenue = parseFloat(previousPeriodRevenue?.total || '0');

    return {
      overview: {
        totalUsers,
        activeUsers,
        totalTrips,
        totalRevenue,
        averageRating: parseFloat(averageRating?.average || '0'),
      },
      trends: {
        userGrowth: this.calculateGrowthRate(totalUsers, previousPeriodUsers),
        tripGrowth: this.calculateGrowthRate(totalTrips, previousPeriodTrips),
        revenueGrowth: this.calculateGrowthRate(totalRevenue, previousRevenue),
      },
      realTime: {
        activeTrips: activeTripsCount,
        onlineDrivers: onlineDriversCount,
        pendingRequests: await this.tripRepository.count({
          where: { status: 'requested' as any },
        }),
      },
    };
  }

  /**
   * 📊 Get user analytics
   */
  async getUserAnalytics(userId: string, dateRange?: { start: Date; end: Date }) {
    const endDate = dateRange?.end || new Date();
    const startDate = dateRange?.start || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [user, trips, transactions, ratings] = await Promise.all([
      this.userRepository.findOne({ where: { id: userId } }),
      this.tripRepository.find({
        where: [
          { passengerId: userId, createdAt: Between(startDate, endDate) },
          { driverId: userId, createdAt: Between(startDate, endDate) },
        ],
        order: { createdAt: 'DESC' },
      }),
      this.transactionRepository.find({
        where: { userId, createdAt: Between(startDate, endDate) },
        order: { createdAt: 'DESC' },
      }),
      this.ratingRepository.find({
        where: [
          { ratedById: userId, createdAt: Between(startDate, endDate) },
          { ratedUserId: userId, createdAt: Between(startDate, endDate) },
        ],
      }),
    ]);

    const passengerTrips = trips.filter(trip => trip.passengerId === userId);
    const driverTrips = trips.filter(trip => trip.driverId === userId);
    const totalSpent = transactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const totalEarned = transactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        averageRating: user.averageRating,
        totalTrips: user.totalTrips,
        joinDate: user.createdAt,
      },
      trips: {
        total: trips.length,
        asPassenger: passengerTrips.length,
        asDriver: driverTrips.length,
        completed: trips.filter(t => t.status === 'completed').length,
        cancelled: trips.filter(t => t.status === 'cancelled').length,
      },
      financial: {
        totalSpent,
        totalEarned,
        averageTripCost: passengerTrips.length > 0 ? 
          passengerTrips.reduce((sum, t) => sum + (t.actualFare || 0), 0) / passengerTrips.length : 0,
      },
      ratings: {
        given: ratings.filter(r => r.ratedById === userId).length,
        received: ratings.filter(r => r.ratedUserId === userId).length,
        averageGiven: this.calculateAverageRating(ratings.filter(r => r.ratedById === userId)),
        averageReceived: this.calculateAverageRating(ratings.filter(r => r.ratedUserId === userId)),
      },
    };
  }

  /**
   * 📈 Get trip analytics
   */
  async getTripAnalytics(dateRange?: { start: Date; end: Date }) {
    const endDate = dateRange?.end || new Date();
    const startDate = dateRange?.start || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const trips = await this.tripRepository
      .createQueryBuilder('trip')
      .where('trip.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .getMany();

    const completedTrips = trips.filter(t => t.status === 'completed');
    const cancelledTrips = trips.filter(t => t.status === 'cancelled');

    return {
      overview: {
        total: trips.length,
        completed: completedTrips.length,
        cancelled: cancelledTrips.length,
        completionRate: trips.length > 0 ? (completedTrips.length / trips.length) * 100 : 0,
      },
      revenue: {
        total: completedTrips.reduce((sum, t) => sum + (t.actualFare || 0), 0),
        average: completedTrips.length > 0 ? 
          completedTrips.reduce((sum, t) => sum + (t.actualFare || 0), 0) / completedTrips.length : 0,
      },
      duration: {
        average: completedTrips.length > 0 ?
          completedTrips.reduce((sum, t) => sum + (t.actualDuration || 0), 0) / completedTrips.length : 0,
      },
      distance: {
        total: completedTrips.reduce((sum, t) => sum + (t.distance || 0), 0),
        average: completedTrips.length > 0 ?
          completedTrips.reduce((sum, t) => sum + (t.distance || 0), 0) / completedTrips.length : 0,
      },
      byStatus: {
        requested: trips.filter(t => t.status === 'requested').length,
        accepted: trips.filter(t => t.status === 'accepted').length,
        in_progress: trips.filter(t => t.status === 'in_progress').length,
        completed: completedTrips.length,
        cancelled: cancelledTrips.length,
      },
      byPaymentMethod: this.groupBy(completedTrips, 'paymentMethod'),
      byTripType: this.groupBy(trips, 'type'),
    };
  }

  /**
   * 💰 Get financial analytics
   */
  async getFinancialAnalytics(dateRange?: { start: Date; end: Date }) {
    const endDate = dateRange?.end || new Date();
    const startDate = dateRange?.start || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const transactions = await this.transactionRepository.find({
      where: { createdAt: Between(startDate, endDate) },
      relations: ['user'],
    });

    const completedTransactions = transactions.filter(t => t.status === 'completed');
    const totalRevenue = completedTransactions.reduce((sum, t) => sum + t.amount, 0);
    const platformCommission = totalRevenue * 0.15; // 15% commission
    const driverEarnings = totalRevenue * 0.85; // 85% to drivers

    return {
      revenue: {
        total: totalRevenue,
        platformCommission,
        driverEarnings,
        averageTransactionValue: completedTransactions.length > 0 ? 
          totalRevenue / completedTransactions.length : 0,
      },
      transactions: {
        total: transactions.length,
        completed: completedTransactions.length,
        failed: transactions.filter(t => t.status === 'failed').length,
        pending: transactions.filter(t => t.status === 'pending').length,
        successRate: transactions.length > 0 ? 
          (completedTransactions.length / transactions.length) * 100 : 0,
      },
      byType: this.groupBy(completedTransactions, 'type'),
      byPaymentMethod: this.groupBy(completedTransactions, 'type'), // Assuming type represents payment method
    };
  }

  /**
   * 🔧 Helper methods
   */
  private calculateGrowthRate(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  private calculateAverageRating(ratings: Rating[]): number {
    if (ratings.length === 0) return 0;
    return ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, number> {
    return array.reduce((groups, item) => {
      const value = String(item[key]);
      groups[value] = (groups[value] || 0) + 1;
      return groups;
    }, {} as Record<string, number>);
  }
}

