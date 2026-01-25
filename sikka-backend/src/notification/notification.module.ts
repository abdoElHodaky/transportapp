import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { EmailService } from './services/email.service';
import { SmsService } from './services/sms.service';
import { PushNotificationService } from './services/push-notification.service';
import { NotificationProcessor } from './processors/notification.processor';
import { NotificationGateway } from './notification.gateway';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'notification',
      redis: {
        host: process.env.QUEUE_REDIS_HOST || 'localhost',
        port: parseInt(process.env.QUEUE_REDIS_PORT) || 6379,
        password: process.env.QUEUE_REDIS_PASSWORD,
        db: parseInt(process.env.QUEUE_REDIS_DB) || 1,
      },
    }),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    EmailService,
    SmsService,
    PushNotificationService,
    NotificationProcessor,
    NotificationGateway,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}

