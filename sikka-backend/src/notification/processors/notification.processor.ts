import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { SmsService } from '../services/sms.service';
import { PushNotificationService } from '../services/push-notification.service';
import { NotificationGateway } from '../notification.gateway';

export interface NotificationJob {
  type: 'sms' | 'push' | 'websocket' | 'email';
  userId: string;
  data: any;
}

@Injectable()
@Processor('notifications')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private smsService: SmsService,
    private pushNotificationService: PushNotificationService,
    private notificationGateway: NotificationGateway,
  ) {}

  @Process('send-notification')
  async handleNotification(job: Job<NotificationJob>) {
    const { type, userId, data } = job.data;

    try {
      this.logger.log(`Processing ${type} notification for user ${userId}`);

      switch (type) {
        case 'sms':
          await this.processSmsNotification(data);
          break;
        case 'push':
          await this.processPushNotification(userId, data);
          break;
        case 'websocket':
          await this.processWebSocketNotification(userId, data);
          break;
        case 'email':
          await this.processEmailNotification(data);
          break;
        default:
          this.logger.warn(`Unknown notification type: ${type}`);
      }

      this.logger.log(`Successfully processed ${type} notification for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to process ${type} notification: ${error.message}`);
      throw error; // This will mark the job as failed and potentially retry
    }
  }

  @Process('send-bulk-notification')
  async handleBulkNotification(job: Job<{ userIds: string[]; notification: any }>) {
    const { userIds, notification } = job.data;

    try {
      this.logger.log(`Processing bulk notification for ${userIds.length} users`);

      // Send to all users via WebSocket
      this.notificationGateway.sendToUsers(userIds, notification);

      // If push notifications are enabled, send to all users
      if (notification.sendPush) {
        for (const userId of userIds) {
          await this.pushNotificationService.sendPushNotification({
            userId,
            title: notification.title,
            body: notification.body,
            data: notification.data,
          });
        }
      }

      this.logger.log(`Successfully processed bulk notification for ${userIds.length} users`);
    } catch (error) {
      this.logger.error(`Failed to process bulk notification: ${error.message}`);
      throw error;
    }
  }

  @Process('send-trip-notification')
  async handleTripNotification(job: Job<{
    userId: string;
    phoneNumber: string;
    tripId: string;
    status: string;
    driverName?: string;
    estimatedArrival?: string;
  }>) {
    const { userId, phoneNumber, tripId, status, driverName, estimatedArrival } = job.data;

    try {
      this.logger.log(`Processing trip notification for user ${userId}, trip ${tripId}`);

      // Send WebSocket notification
      this.notificationGateway.sendToUser(userId, {
        type: 'trip_update',
        tripId,
        status,
        driverName,
        estimatedArrival,
        timestamp: new Date().toISOString(),
      });

      // Send SMS notification
      await this.smsService.sendTripNotification(phoneNumber, tripId, status);

      // Send push notification
      if (driverName && estimatedArrival) {
        await this.pushNotificationService.sendDriverAssigned(
          userId,
          driverName,
          estimatedArrival,
        );
      } else {
        await this.pushNotificationService.sendTripStatusUpdate(userId, tripId, status);
      }

      this.logger.log(`Successfully processed trip notification for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to process trip notification: ${error.message}`);
      throw error;
    }
  }

  @Process('send-payment-notification')
  async handlePaymentNotification(job: Job<{
    userId: string;
    phoneNumber: string;
    amount: number;
    status: string;
    transactionId: string;
  }>) {
    const { userId, phoneNumber, amount, status, transactionId } = job.data;

    try {
      this.logger.log(`Processing payment notification for user ${userId}`);

      // Send WebSocket notification
      this.notificationGateway.sendToUser(userId, {
        type: 'payment_update',
        amount,
        status,
        transactionId,
        timestamp: new Date().toISOString(),
      });

      // Send SMS notification
      await this.smsService.sendPaymentNotification(phoneNumber, amount, status);

      // Send push notification
      await this.pushNotificationService.sendPaymentNotification(userId, amount, status);

      this.logger.log(`Successfully processed payment notification for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to process payment notification: ${error.message}`);
      throw error;
    }
  }

  private async processSmsNotification(data: any) {
    await this.smsService.sendSms(data);
  }

  private async processPushNotification(userId: string, data: any) {
    await this.pushNotificationService.sendPushNotification({
      userId,
      ...data,
    });
  }

  private async processWebSocketNotification(userId: string, data: any) {
    this.notificationGateway.sendToUser(userId, data);
  }

  private async processEmailNotification(data: any) {
    // Email notification would be implemented here
    // For now, just log it
    this.logger.log(`Email notification: ${JSON.stringify(data)}`);
  }
}
