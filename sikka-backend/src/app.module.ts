import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { BullModule } from '@nestjs/bull';

// Configuration
import { DatabaseConfig } from './config/database.config';
import { JwtConfig } from './config/jwt.config';
import { RedisConfig } from './config/redis.config';

// Core Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TripsModule } from './modules/trips/trips.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { LocationModule } from './modules/location/location.module';
import { WebSocketModule } from './modules/websocket/websocket.module';

// Operational Modules
import { NotificationModule } from './notification/notification.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { JobsModule } from './jobs/jobs.module';
import { I18nModule } from './i18n/i18n.module';

// Controllers
import { AppController } from './app.controller';

// Services
import { AppService } from './app.service';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database
    TypeOrmModule.forRootAsync({
      useClass: DatabaseConfig,
    }),

    // Redis & Bull Queue
    BullModule.forRootAsync({
      useFactory: () => ({
        redis: {
          host: process.env.QUEUE_REDIS_HOST || 'localhost',
          port: parseInt(process.env.QUEUE_REDIS_PORT) || 6379,
          password: process.env.QUEUE_REDIS_PASSWORD,
          db: parseInt(process.env.QUEUE_REDIS_DB) || 1,
        },
      }),
    }),

    // JWT
    JwtModule.registerAsync({
      useClass: JwtConfig,
      global: true,
    }),

    // Passport
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // Core Feature Modules
    AuthModule,
    UsersModule,
    TripsModule,
    PaymentsModule,
    LocationModule,
    WebSocketModule,

    // Operational Modules
    NotificationModule,
    AnalyticsModule,
    JobsModule,
    I18nModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
