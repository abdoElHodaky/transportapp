import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { EmailService } from './services/email.service';
import { SmsService } from './services/sms.service';
import { PushNotificationService } from './services/push-notification.service';
import { NotificationGateway } from './notification.gateway';

export interface NotificationPayload {
  userId: string;
  type: 'email' | 'sms' | 'push' | 'in_app';
  template: string;
  data: Record<string, any>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  scheduledAt?: Date;
  channels?: ('email' | 'sms' | 'push' | 'in_app')[];
}

export interface TripNotificationData {
  tripId: string;
  passengerName: string;
  driverName: string;
  pickupAddress: string;
  dropoffAddress: string;
  estimatedFare: number;
  estimatedArrival?: number;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectQueue('notification') private notificationQueue: Queue,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly pushService: PushNotificationService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  /**
   * 🔔 Send notification through multiple channels
   */
  async sendNotification(payload: NotificationPayload): Promise<void> {
    try {
      const channels = payload.channels || [payload.type];
      const priority = this.getPriorityLevel(payload.priority);

      // Add to queue for processing
      await this.notificationQueue.add(
        'send-notification',
        {
          ...payload,
          channels,
          timestamp: new Date(),
        },
        {
          priority,
          delay: payload.scheduledAt ? 
            payload.scheduledAt.getTime() - Date.now() : 0,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        }
      );

      this.logger.log(`Notification queued for user ${payload.userId}`);
    } catch (error) {
      this.logger.error(`Failed to queue notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🚗 Trip-specific notification methods
   */
  async notifyTripRequested(userId: string, data: TripNotificationData): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'push',
      template: 'trip_requested',
      data,
      priority: 'high',
      channels: ['push', 'in_app'],
    });
  }

  async notifyTripAccepted(userId: string, data: TripNotificationData): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'push',
      template: 'trip_accepted',
      data,
      priority: 'urgent',
      channels: ['push', 'in_app', 'sms'],
    });
  }

  async notifyDriverArrived(userId: string, data: TripNotificationData): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'push',
      template: 'driver_arrived',
      data,
      priority: 'urgent',
      channels: ['push', 'in_app'],
    });
  }

  async notifyTripStarted(userId: string, data: TripNotificationData): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'push',
      template: 'trip_started',
      data,
      priority: 'high',
      channels: ['push', 'in_app'],
    });
  }

  async notifyTripCompleted(userId: string, data: TripNotificationData): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'push',
      template: 'trip_completed',
      data,
      priority: 'normal',
      channels: ['push', 'in_app', 'email'],
    });
  }

  async notifyPaymentCompleted(userId: string, data: any): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'push',
      template: 'payment_completed',
      data,
      priority: 'high',
      channels: ['push', 'in_app', 'email'],
    });
  }

  async notifyPaymentFailed(userId: string, data: any): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'push',
      template: 'payment_failed',
      data,
      priority: 'urgent',
      channels: ['push', 'in_app', 'sms'],
    });
  }

  /**
   * 👤 User account notifications
   */
  async notifyAccountVerified(userId: string, data: any): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'email',
      template: 'account_verified',
      data,
      priority: 'normal',
      channels: ['email', 'push', 'in_app'],
    });
  }

  async notifyAccountSuspended(userId: string, data: any): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'email',
      template: 'account_suspended',
      data,
      priority: 'urgent',
      channels: ['email', 'sms', 'push'],
    });
  }

  /**
   * 💰 Wallet and payment notifications
   */
  async notifyWalletTopUp(userId: string, data: any): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'push',
      template: 'wallet_top_up',
      data,
      priority: 'normal',
      channels: ['push', 'in_app'],
    });
  }

  async notifyLowBalance(userId: string, data: any): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'push',
      template: 'low_balance',
      data,
      priority: 'high',
      channels: ['push', 'in_app'],
    });
  }

  /**
   * 🚨 Emergency and safety notifications
   */
  async notifyEmergencyAlert(userId: string, data: any): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'push',
      template: 'emergency_alert',
      data,
      priority: 'urgent',
      channels: ['push', 'sms', 'in_app'],
    });
  }

  /**
   * 📊 Promotional and marketing notifications
   */
  async notifyPromotion(userId: string, data: any): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'push',
      template: 'promotion',
      data,
      priority: 'low',
      channels: ['push', 'email'],
    });
  }

  /**
   * 🔧 Direct notification methods (bypass queue for urgent cases)
   */
  async sendDirectNotification(payload: NotificationPayload): Promise<void> {
    const channels = payload.channels || [payload.type];

    for (const channel of channels) {
      try {
        switch (channel) {
          case 'email':
            await this.emailService.sendEmail(
              payload.userId,
              payload.template,
              payload.data
            );
            break;
          case 'sms':
            await this.smsService.sendSms(
              payload.userId,
              payload.template,
              payload.data
            );
            break;
          case 'push':
            await this.pushService.sendPushNotification(
              payload.userId,
              payload.template,
              payload.data
            );
            break;
          case 'in_app':
            await this.notificationGateway.sendInAppNotification(
              payload.userId,
              payload.template,
              payload.data
            );
            break;
        }
      } catch (error) {
        this.logger.error(
          `Failed to send ${channel} notification to ${payload.userId}: ${error.message}`
        );
      }
    }
  }

  /**
   * 📊 Get notification statistics
   */
  async getNotificationStats(userId: string): Promise<any> {
    // Implementation for getting user notification statistics
    return {
      totalSent: 0,
      totalDelivered: 0,
      totalFailed: 0,
      byChannel: {
        email: { sent: 0, delivered: 0, failed: 0 },
        sms: { sent: 0, delivered: 0, failed: 0 },
        push: { sent: 0, delivered: 0, failed: 0 },
        in_app: { sent: 0, delivered: 0, failed: 0 },
      },
    };
  }

  /**
   * ⚙️ Private helper methods
   */
  private getPriorityLevel(priority?: string): number {
    switch (priority) {
      case 'urgent': return 10;
      case 'high': return 7;
      case 'normal': return 5;
      case 'low': return 1;
      default: return 5;
    }
  }
}

