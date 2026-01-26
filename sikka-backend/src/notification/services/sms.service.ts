import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SmsMessage {
  to: string;
  message: string;
  from?: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private configService: ConfigService) {}

  async sendSms(smsData: SmsMessage): Promise<boolean> {
    try {
      // In a real implementation, you would integrate with SMS providers like:
      // - Twilio
      // - AWS SNS
      // - Nexmo/Vonage
      // - Local SMS gateway

      this.logger.log(`Sending SMS to ${smsData.to}: ${smsData.message}`);

      // Mock SMS sending for development
      if (this.configService.get('NODE_ENV') === 'development') {
        this.logger.log('SMS sent successfully (mock)');
        return true;
      }

      // Real SMS implementation would go here
      // Example with Twilio:
      /*
      const client = twilio(
        this.configService.get('TWILIO_ACCOUNT_SID'),
        this.configService.get('TWILIO_AUTH_TOKEN')
      );

      await client.messages.create({
        body: smsData.message,
        from: smsData.from || this.configService.get('TWILIO_PHONE_NUMBER'),
        to: smsData.to,
      });
      */

      return true;
    } catch (error) {
      this.logger.error(`Failed to send SMS: ${error.message}`);
      return false;
    }
  }

  async sendOtp(phoneNumber: string, otp: string): Promise<boolean> {
    const message = `Your Sikka verification code is: ${otp}. This code will expire in 5 minutes.`;
    
    return this.sendSms({
      to: phoneNumber,
      message,
    });
  }

  async sendTripNotification(
    phoneNumber: string,
    tripId: string,
    status: string,
  ): Promise<boolean> {
    const message = `Trip ${tripId} status updated: ${status}. Check your Sikka app for details.`;
    
    return this.sendSms({
      to: phoneNumber,
      message,
    });
  }

  async sendPaymentNotification(
    phoneNumber: string,
    amount: number,
    status: string,
  ): Promise<boolean> {
    const message = `Payment of ${amount} SDG ${status}. Thank you for using Sikka!`;
    
    return this.sendSms({
      to: phoneNumber,
      message,
    });
  }
}
