import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;
  private templates: Map<string, EmailTemplate> = new Map();

  constructor() {
    this.initializeTransporter();
    this.loadTemplates();
  }

  private initializeTransporter(): void {
    const provider = process.env.EMAIL_PROVIDER || 'smtp';

    switch (provider) {
      case 'smtp':
        this.transporter = nodemailer.createTransporter({
          host: process.env.EMAIL_HOST,
          port: parseInt(process.env.EMAIL_PORT) || 587,
          secure: process.env.EMAIL_SECURE === 'true',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
          },
        });
        break;
      case 'sendgrid':
        // SendGrid configuration
        this.transporter = nodemailer.createTransporter({
          service: 'SendGrid',
          auth: {
            user: 'apikey',
            pass: process.env.SENDGRID_API_KEY,
          },
        });
        break;
      default:
        this.logger.warn('No email provider configured, using console output');
        this.transporter = nodemailer.createTransporter({
          streamTransport: true,
          newline: 'unix',
          buffer: true,
        });
    }
  }

  private loadTemplates(): void {
    // 🚗 Trip-related templates
    this.templates.set('trip_completed', {
      subject: '🎉 Trip Completed Successfully - Sikka',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2196F3;">🎉 Trip Completed!</h2>
          <p>Dear {{passengerName}},</p>
          <p>Your trip has been completed successfully!</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3>Trip Details:</h3>
            <p><strong>From:</strong> {{pickupAddress}}</p>
            <p><strong>To:</strong> {{dropoffAddress}}</p>
            <p><strong>Driver:</strong> {{driverName}}</p>
            <p><strong>Fare:</strong> SDG {{actualFare}}</p>
          </div>
          <p>Thank you for choosing Sikka! 🚗</p>
          <p>Best regards,<br>The Sikka Team</p>
        </div>
      `,
    });

    this.templates.set('payment_completed', {
      subject: '💳 Payment Confirmation - Sikka',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">💳 Payment Confirmed</h2>
          <p>Dear {{userName}},</p>
          <p>Your payment has been processed successfully!</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3>Payment Details:</h3>
            <p><strong>Amount:</strong> SDG {{amount}}</p>
            <p><strong>Method:</strong> {{paymentMethod}}</p>
            <p><strong>Transaction ID:</strong> {{transactionId}}</p>
            <p><strong>Date:</strong> {{date}}</p>
          </div>
          <p>Thank you for using Sikka! 🚗</p>
        </div>
      `,
    });

    this.templates.set('account_verified', {
      subject: '✅ Account Verified - Welcome to Sikka!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">✅ Welcome to Sikka!</h2>
          <p>Dear {{userName}},</p>
          <p>Congratulations! Your account has been successfully verified.</p>
          <p>You can now enjoy all the features of the Sikka Transportation Platform:</p>
          <ul>
            <li>🚗 Book rides instantly</li>
            <li>💳 Multiple payment options</li>
            <li>📍 Real-time tracking</li>
            <li>⭐ Rate your experience</li>
          </ul>
          <p>Start your first ride today!</p>
          <p>Best regards,<br>The Sikka Team</p>
        </div>
      `,
    });

    this.templates.set('account_suspended', {
      subject: '⚠️ Account Suspended - Sikka',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f44336;">⚠️ Account Suspended</h2>
          <p>Dear {{userName}},</p>
          <p>We regret to inform you that your account has been temporarily suspended.</p>
          <div style="background: #ffebee; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f44336;">
            <p><strong>Reason:</strong> {{reason}}</p>
            <p><strong>Suspension Date:</strong> {{suspensionDate}}</p>
          </div>
          <p>If you believe this is an error, please contact our support team immediately.</p>
          <p>Support: support@sikka.sd | +249 123 456 789</p>
        </div>
      `,
    });

    this.templates.set('promotion', {
      subject: '🎉 Special Offer Just for You - Sikka',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #FF9800;">🎉 Special Offer!</h2>
          <p>Dear {{userName}},</p>
          <p>We have an exciting offer just for you!</p>
          <div style="background: linear-gradient(135deg, #FF9800, #F57C00); color: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h3 style="margin: 0;">{{offerTitle}}</h3>
            <p style="font-size: 18px; margin: 10px 0;">{{offerDescription}}</p>
            <p style="font-size: 14px; opacity: 0.9;">Valid until: {{expiryDate}}</p>
          </div>
          <p>Don't miss out on this amazing deal!</p>
          <p>Happy riding! 🚗</p>
        </div>
      `,
    });
  }

  async sendEmail(userId: string, template: string, data: Record<string, any>): Promise<void> {
    try {
      const emailTemplate = this.templates.get(template);
      if (!emailTemplate) {
        throw new Error(`Email template '${template}' not found`);
      }

      // Get user email (you'll need to implement this based on your user service)
      const userEmail = await this.getUserEmail(userId);
      if (!userEmail) {
        throw new Error(`No email found for user ${userId}`);
      }

      // Replace template variables
      const subject = this.replaceVariables(emailTemplate.subject, data);
      const html = this.replaceVariables(emailTemplate.html, data);
      const text = emailTemplate.text ? this.replaceVariables(emailTemplate.text, data) : undefined;

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@sikka.sd',
        to: userEmail,
        subject,
        html,
        text,
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully to ${userEmail}: ${result.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send email to user ${userId}: ${error.message}`);
      throw error;
    }
  }

  private replaceVariables(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match;
    });
  }

  private async getUserEmail(userId: string): Promise<string | null> {
    // TODO: Implement user email lookup
    // This should query your user service or database
    // For now, returning a placeholder
    return `user-${userId}@example.com`;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('Email service connection verified');
      return true;
    } catch (error) {
      this.logger.error(`Email service connection failed: ${error.message}`);
      return false;
    }
  }
}

