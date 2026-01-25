import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

export interface EBSPaymentRequest {
  amount: number;
  currency: string;
  merchantId: string;
  terminalId: string;
  transactionId: string;
  customerReference: string;
  description: string;
  callbackUrl: string;
  returnUrl: string;
}

export interface EBSPaymentResponse {
  success: boolean;
  transactionId: string;
  gatewayTransactionId?: string;
  paymentUrl?: string;
  status: 'pending' | 'completed' | 'failed';
  message: string;
  errorCode?: string;
}

@Injectable()
export class EBSService {
  private readonly logger = new Logger(EBSService.name);
  private readonly baseUrl: string;
  private readonly merchantId: string;
  private readonly terminalId: string;
  private readonly secretKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>(
      'EBS_BASE_URL',
      'https://api.ebs.sd',
    );
    this.merchantId = this.configService.get<string>('EBS_MERCHANT_ID', '');
    this.terminalId = this.configService.get<string>('EBS_TERMINAL_ID', '');
    this.secretKey = this.configService.get<string>('EBS_SECRET_KEY', '');

    if (!this.merchantId || !this.terminalId || !this.secretKey) {
      this.logger.warn(
        'EBS configuration is incomplete. Payment processing will be simulated.',
      );
    }
  }

  /**
   * Initiate payment with EBS
   */
  async initiatePayment(
    paymentRequest: EBSPaymentRequest,
  ): Promise<EBSPaymentResponse> {
    try {
      // If configuration is incomplete, simulate payment
      if (!this.merchantId || !this.terminalId || !this.secretKey) {
        return this.simulatePayment(paymentRequest);
      }

      const requestData = {
        merchantId: this.merchantId,
        terminalId: this.terminalId,
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        transactionId: paymentRequest.transactionId,
        customerReference: paymentRequest.customerReference,
        description: paymentRequest.description,
        callbackUrl: paymentRequest.callbackUrl,
        returnUrl: paymentRequest.returnUrl,
        timestamp: new Date().toISOString(),
      };

      // Generate signature
      const signature = this.generateSignature(requestData);
      requestData['signature'] = signature;

      this.logger.log(
        `Initiating EBS payment for transaction: ${paymentRequest.transactionId}`,
      );

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/api/v1/payments/initiate`,
          requestData,
          {
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            timeout: 30000,
          },
        ),
      );

      if (response.data.success) {
        return {
          success: true,
          transactionId: paymentRequest.transactionId,
          gatewayTransactionId: response.data.gatewayTransactionId,
          paymentUrl: response.data.paymentUrl,
          status: 'pending',
          message: 'Payment initiated successfully',
        };
      } else {
        return {
          success: false,
          transactionId: paymentRequest.transactionId,
          status: 'failed',
          message: response.data.message || 'Payment initiation failed',
          errorCode: response.data.errorCode,
        };
      }
    } catch (error) {
      this.logger.error(
        `EBS payment initiation failed: ${error.message}`,
        error.stack,
      );

      return {
        success: false,
        transactionId: paymentRequest.transactionId,
        status: 'failed',
        message: 'Payment gateway error',
        errorCode: 'GATEWAY_ERROR',
      };
    }
  }

  /**
   * Verify payment status
   */
  async verifyPayment(
    transactionId: string,
    gatewayTransactionId: string,
  ): Promise<EBSPaymentResponse> {
    try {
      // If configuration is incomplete, simulate verification
      if (!this.merchantId || !this.terminalId || !this.secretKey) {
        return this.simulateVerification(transactionId, gatewayTransactionId);
      }

      const requestData = {
        merchantId: this.merchantId,
        terminalId: this.terminalId,
        transactionId,
        gatewayTransactionId,
        timestamp: new Date().toISOString(),
      };

      const signature = this.generateSignature(requestData);
      requestData['signature'] = signature;

      this.logger.log(`Verifying EBS payment: ${transactionId}`);

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/api/v1/payments/verify`,
          requestData,
          {
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            timeout: 30000,
          },
        ),
      );

      return {
        success: response.data.success,
        transactionId,
        gatewayTransactionId,
        status: response.data.status,
        message: response.data.message,
        errorCode: response.data.errorCode,
      };
    } catch (error) {
      this.logger.error(
        `EBS payment verification failed: ${error.message}`,
        error.stack,
      );

      return {
        success: false,
        transactionId,
        gatewayTransactionId,
        status: 'failed',
        message: 'Payment verification failed',
        errorCode: 'VERIFICATION_ERROR',
      };
    }
  }

  /**
   * Process refund
   */
  async processRefund(
    originalTransactionId: string,
    gatewayTransactionId: string,
    refundAmount: number,
    reason: string,
  ): Promise<EBSPaymentResponse> {
    try {
      // If configuration is incomplete, simulate refund
      if (!this.merchantId || !this.terminalId || !this.secretKey) {
        return this.simulateRefund(originalTransactionId, refundAmount);
      }

      const refundTransactionId = `refund_${originalTransactionId}_${Date.now()}`;

      const requestData = {
        merchantId: this.merchantId,
        terminalId: this.terminalId,
        originalTransactionId,
        gatewayTransactionId,
        refundTransactionId,
        refundAmount,
        reason,
        timestamp: new Date().toISOString(),
      };

      const signature = this.generateSignature(requestData);
      requestData['signature'] = signature;

      this.logger.log(
        `Processing EBS refund for transaction: ${originalTransactionId}`,
      );

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/api/v1/payments/refund`,
          requestData,
          {
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            timeout: 30000,
          },
        ),
      );

      return {
        success: response.data.success,
        transactionId: refundTransactionId,
        gatewayTransactionId: response.data.refundTransactionId,
        status: response.data.success ? 'completed' : 'failed',
        message: response.data.message,
        errorCode: response.data.errorCode,
      };
    } catch (error) {
      this.logger.error(
        `EBS refund processing failed: ${error.message}`,
        error.stack,
      );

      return {
        success: false,
        transactionId: originalTransactionId,
        status: 'failed',
        message: 'Refund processing failed',
        errorCode: 'REFUND_ERROR',
      };
    }
  }

  /**
   * Validate webhook signature
   */
  validateWebhookSignature(payload: any, receivedSignature: string): boolean {
    try {
      const expectedSignature = this.generateSignature(payload);
      return expectedSignature === receivedSignature;
    } catch (error) {
      this.logger.error(
        `Webhook signature validation failed: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Generate HMAC signature for request
   */
  private generateSignature(data: any): string {
    // Sort keys and create query string
    const sortedKeys = Object.keys(data).sort();
    const queryString = sortedKeys
      .map((key) => `${key}=${data[key]}`)
      .join('&');

    // Generate HMAC-SHA256 signature
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(queryString)
      .digest('hex');
  }

  /**
   * Simulate payment for development/testing
   */
  private async simulatePayment(
    paymentRequest: EBSPaymentRequest,
  ): Promise<EBSPaymentResponse> {
    this.logger.log(
      `Simulating EBS payment for transaction: ${paymentRequest.transactionId}`,
    );

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Simulate 90% success rate
    const isSuccess = Math.random() > 0.1;

    if (isSuccess) {
      return {
        success: true,
        transactionId: paymentRequest.transactionId,
        gatewayTransactionId: `ebs_sim_${Date.now()}`,
        paymentUrl: `https://simulator.ebs.sd/pay/${paymentRequest.transactionId}`,
        status: 'pending',
        message: 'Payment initiated successfully (simulated)',
      };
    } else {
      return {
        success: false,
        transactionId: paymentRequest.transactionId,
        status: 'failed',
        message: 'Payment failed (simulated)',
        errorCode: 'SIM_FAILURE',
      };
    }
  }

  /**
   * Simulate payment verification
   */
  private async simulateVerification(
    transactionId: string,
    gatewayTransactionId: string,
  ): Promise<EBSPaymentResponse> {
    this.logger.log(
      `Simulating EBS verification for transaction: ${transactionId}`,
    );

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      success: true,
      transactionId,
      gatewayTransactionId,
      status: 'completed',
      message: 'Payment completed successfully (simulated)',
    };
  }

  /**
   * Simulate refund processing
   */
  private async simulateRefund(
    originalTransactionId: string,
    refundAmount: number,
  ): Promise<EBSPaymentResponse> {
    this.logger.log(
      `Simulating EBS refund for transaction: ${originalTransactionId}`,
    );

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return {
      success: true,
      transactionId: `refund_${originalTransactionId}_${Date.now()}`,
      gatewayTransactionId: `ebs_refund_sim_${Date.now()}`,
      status: 'completed',
      message: `Refund of ${refundAmount} SDG processed successfully (simulated)`,
    };
  }
}
