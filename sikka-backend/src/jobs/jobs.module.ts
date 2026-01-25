import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { PaymentRetryProcessor } from './processors/payment-retry.processor';
import { TripTimeoutProcessor } from './processors/trip-timeout.processor';
import { DatabaseCleanupProcessor } from './processors/database-cleanup.processor';
import { ReportGenerationProcessor } from './processors/report-generation.processor';
import { ScheduledJobsService } from './services/scheduled-jobs.service';
import { User } from '../user/entities/user.entity';
import { Trip } from '../trip/entities/trip.entity';
import { Transaction } from '../transaction/entities/transaction.entity';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([User, Trip, Transaction]),
    BullModule.registerQueue(
      {
        name: 'payment-retry',
        redis: {
          host: process.env.QUEUE_REDIS_HOST || 'localhost',
          port: parseInt(process.env.QUEUE_REDIS_PORT) || 6379,
          password: process.env.QUEUE_REDIS_PASSWORD,
          db: parseInt(process.env.QUEUE_REDIS_DB) || 1,
        },
      },
      {
        name: 'trip-timeout',
        redis: {
          host: process.env.QUEUE_REDIS_HOST || 'localhost',
          port: parseInt(process.env.QUEUE_REDIS_PORT) || 6379,
          password: process.env.QUEUE_REDIS_PASSWORD,
          db: parseInt(process.env.QUEUE_REDIS_DB) || 1,
        },
      },
      {
        name: 'database-cleanup',
        redis: {
          host: process.env.QUEUE_REDIS_HOST || 'localhost',
          port: parseInt(process.env.QUEUE_REDIS_PORT) || 6379,
          password: process.env.QUEUE_REDIS_PASSWORD,
          db: parseInt(process.env.QUEUE_REDIS_DB) || 1,
        },
      },
      {
        name: 'report-generation',
        redis: {
          host: process.env.QUEUE_REDIS_HOST || 'localhost',
          port: parseInt(process.env.QUEUE_REDIS_PORT) || 6379,
          password: process.env.QUEUE_REDIS_PASSWORD,
          db: parseInt(process.env.QUEUE_REDIS_DB) || 1,
        },
      }
    ),
  ],
  controllers: [JobsController],
  providers: [
    JobsService,
    ScheduledJobsService,
    PaymentRetryProcessor,
    TripTimeoutProcessor,
    DatabaseCleanupProcessor,
    ReportGenerationProcessor,
  ],
  exports: [JobsService],
})
export class JobsModule {}

