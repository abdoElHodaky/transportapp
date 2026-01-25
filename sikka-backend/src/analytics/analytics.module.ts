import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { EventTrackingService } from './services/event-tracking.service';
import { ReportingService } from './services/reporting.service';
import { DashboardService } from './services/dashboard.service';
import { AnalyticsProcessor } from './processors/analytics.processor';
import { User } from '../user/entities/user.entity';
import { Trip } from '../trip/entities/trip.entity';
import { Transaction } from '../transaction/entities/transaction.entity';
import { Rating } from '../rating/entities/rating.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Trip, Transaction, Rating]),
    BullModule.registerQueue({
      name: 'analytics',
      redis: {
        host: process.env.QUEUE_REDIS_HOST || 'localhost',
        port: parseInt(process.env.QUEUE_REDIS_PORT) || 6379,
        password: process.env.QUEUE_REDIS_PASSWORD,
        db: parseInt(process.env.QUEUE_REDIS_DB) || 1,
      },
    }),
  ],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    EventTrackingService,
    ReportingService,
    DashboardService,
    AnalyticsProcessor,
  ],
  exports: [AnalyticsService, EventTrackingService],
})
export class AnalyticsModule {}

