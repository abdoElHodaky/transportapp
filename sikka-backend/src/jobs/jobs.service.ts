import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface JobOptions {
  delay?: number;
  attempts?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
  priority?: number;
  removeOnComplete?: number;
  removeOnFail?: number;
}

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectQueue('payment-retry') private paymentRetryQueue: Queue,
    @InjectQueue('trip-timeout') private tripTimeoutQueue: Queue,
    @InjectQueue('database-cleanup') private databaseCleanupQueue: Queue,
    @InjectQueue('report-generation') private reportGenerationQueue: Queue,
  ) {}

  /**
   * 💳 Payment retry jobs
   */
  async schedulePaymentRetry(
    transactionId: string,
    retryCount: number = 0,
    options?: JobOptions
  ): Promise<void> {
    const defaultOptions: JobOptions = {
      delay: Math.pow(2, retryCount) * 60000, // Exponential backoff: 1min, 2min, 4min, 8min
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 30000,
      },
      priority: 5,
      removeOnComplete: 10,
      removeOnFail: 5,
    };

    const jobOptions = { ...defaultOptions, ...options };

    await this.paymentRetryQueue.add(
      'retry-payment',
      {
        transactionId,
        retryCount,
        scheduledAt: new Date(),
      },
      jobOptions
    );

    this.logger.log(`Payment retry scheduled for transaction ${transactionId}, attempt ${retryCount + 1}`);
  }

  /**
   * 🚗 Trip timeout jobs
   */
  async scheduleTripTimeout(tripId: string, timeoutMinutes: number = 30): Promise<void> {
    await this.tripTimeoutQueue.add(
      'trip-timeout',
      {
        tripId,
        scheduledAt: new Date(),
      },
      {
        delay: timeoutMinutes * 60 * 1000, // Convert minutes to milliseconds
        attempts: 1,
        removeOnComplete: 5,
        removeOnFail: 5,
      }
    );

    this.logger.log(`Trip timeout scheduled for trip ${tripId} in ${timeoutMinutes} minutes`);
  }

  async cancelTripTimeout(tripId: string): Promise<void> {
    const jobs = await this.tripTimeoutQueue.getJobs(['delayed', 'waiting']);
    const tripJob = jobs.find(job => job.data.tripId === tripId);
    
    if (tripJob) {
      await tripJob.remove();
      this.logger.log(`Trip timeout cancelled for trip ${tripId}`);
    }
  }

  /**
   * 📊 Report generation jobs
   */
  async scheduleReportGeneration(
    reportType: 'daily' | 'weekly' | 'monthly',
    userId?: string,
    options?: JobOptions
  ): Promise<void> {
    const defaultOptions: JobOptions = {
      priority: 3,
      attempts: 2,
      removeOnComplete: 20,
      removeOnFail: 10,
    };

    const jobOptions = { ...defaultOptions, ...options };

    await this.reportGenerationQueue.add(
      'generate-report',
      {
        reportType,
        userId,
        requestedAt: new Date(),
      },
      jobOptions
    );

    this.logger.log(`Report generation scheduled: ${reportType}${userId ? ` for user ${userId}` : ''}`);
  }

  /**
   * 🧹 Database cleanup jobs
   */
  async scheduleDatabaseCleanup(cleanupType: string, options?: JobOptions): Promise<void> {
    const defaultOptions: JobOptions = {
      priority: 1,
      attempts: 2,
      removeOnComplete: 5,
      removeOnFail: 5,
    };

    const jobOptions = { ...defaultOptions, ...options };

    await this.databaseCleanupQueue.add(
      'cleanup-database',
      {
        cleanupType,
        scheduledAt: new Date(),
      },
      jobOptions
    );

    this.logger.log(`Database cleanup scheduled: ${cleanupType}`);
  }

  /**
   * 📅 Scheduled jobs using cron
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleDailyCleanup(): Promise<void> {
    this.logger.log('Starting daily database cleanup...');
    
    await Promise.all([
      this.scheduleDatabaseCleanup('expired-sessions'),
      this.scheduleDatabaseCleanup('old-logs'),
      this.scheduleDatabaseCleanup('completed-jobs'),
    ]);
  }

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async handleDailyReports(): Promise<void> {
    this.logger.log('Generating daily reports...');
    await this.scheduleReportGeneration('daily');
  }

  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async handleWeeklyReports(): Promise<void> {
    this.logger.log('Generating weekly reports...');
    await this.scheduleReportGeneration('weekly');
  }

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_NOON)
  async handleMonthlyReports(): Promise<void> {
    this.logger.log('Generating monthly reports...');
    await this.scheduleReportGeneration('monthly');
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleHourlyMaintenance(): Promise<void> {
    this.logger.debug('Running hourly maintenance tasks...');
    
    // Check for stuck trips and timeout them
    await this.checkStuckTrips();
    
    // Retry failed payments
    await this.retryFailedPayments();
  }

  /**
   * 🔧 Utility methods
   */
  async getQueueStats(): Promise<any> {
    const [
      paymentRetryStats,
      tripTimeoutStats,
      databaseCleanupStats,
      reportGenerationStats,
    ] = await Promise.all([
      this.getQueueInfo(this.paymentRetryQueue),
      this.getQueueInfo(this.tripTimeoutQueue),
      this.getQueueInfo(this.databaseCleanupQueue),
      this.getQueueInfo(this.reportGenerationQueue),
    ]);

    return {
      paymentRetry: paymentRetryStats,
      tripTimeout: tripTimeoutStats,
      databaseCleanup: databaseCleanupStats,
      reportGeneration: reportGenerationStats,
    };
  }

  private async getQueueInfo(queue: Queue): Promise<any> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed(),
    ]);

    return {
      name: queue.name,
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    };
  }

  private async checkStuckTrips(): Promise<void> {
    // Implementation to check for trips that are stuck in 'requested' or 'accepted' state
    // for too long and automatically timeout them
    this.logger.debug('Checking for stuck trips...');
  }

  private async retryFailedPayments(): Promise<void> {
    // Implementation to find failed payments that can be retried
    // and schedule retry jobs for them
    this.logger.debug('Checking for failed payments to retry...');
  }

  /**
   * 🧹 Queue management
   */
  async cleanQueue(queueName: string): Promise<void> {
    let queue: Queue;
    
    switch (queueName) {
      case 'payment-retry':
        queue = this.paymentRetryQueue;
        break;
      case 'trip-timeout':
        queue = this.tripTimeoutQueue;
        break;
      case 'database-cleanup':
        queue = this.databaseCleanupQueue;
        break;
      case 'report-generation':
        queue = this.reportGenerationQueue;
        break;
      default:
        throw new Error(`Unknown queue: ${queueName}`);
    }

    await queue.clean(0, 'completed');
    await queue.clean(0, 'failed');
    
    this.logger.log(`Cleaned queue: ${queueName}`);
  }

  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueueByName(queueName);
    await queue.pause();
    this.logger.log(`Paused queue: ${queueName}`);
  }

  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueueByName(queueName);
    await queue.resume();
    this.logger.log(`Resumed queue: ${queueName}`);
  }

  private getQueueByName(queueName: string): Queue {
    switch (queueName) {
      case 'payment-retry':
        return this.paymentRetryQueue;
      case 'trip-timeout':
        return this.tripTimeoutQueue;
      case 'database-cleanup':
        return this.databaseCleanupQueue;
      case 'report-generation':
        return this.reportGenerationQueue;
      default:
        throw new Error(`Unknown queue: ${queueName}`);
    }
  }
}
