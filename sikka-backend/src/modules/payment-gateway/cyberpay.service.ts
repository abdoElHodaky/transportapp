import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

export interface CyberPayPaymentRequest {
  amount: number;
  currency: string;
  merchantId: string;
  transactionId: string;
  customerReference: string;
  description: string;
  callbackUrl: string;
  returnUrl: string;
}

export interface CyberPayPaymentResponse {
  success: boolean;
  transactionId: string;
  gatewayTransactionId?: string;
  paymentUrl?: string;
  status: 'pending' | 'completed' | 'failed';
  message: string;
  errorCode?: string;
}

@Injectable()
export class CyberPayService {
  private readonly logger = new Logger(CyberPayService.name);
  private readonly baseUrl: string;
  private readonly merchantId: string;
  private readonly apiKey: string;
  private readonly secretKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>(
      'CYBERPAY_BASE_URL',
      'https://api.cyberpay.sd',
    );
    this.merchantId = this.configService.get<string>(
      'CYBERPAY_MERCHANT_ID',
      '',
    );
    this.apiKey = this.configService.get<string>('CYBERPAY_API_KEY', '');
    this.secretKey = this.configService.get<string>('CYBERPAY_SECRET_KEY', '');

    if (!this.merchantId || !this.apiKey || !this.secretKey) {
      this.logger.warn(
        'CyberPay configuration is incomplete. Payment processing will be simulated.',
      );
    }
  }

  /**
   * Initiate payment with CyberPay
   */
  async initiatePayment(
    paymentRequest: CyberPayPaymentRequest,
  ): Promise<CyberPayPaymentResponse> {
    try {
      // If configuration is incomplete, simulate payment
      if (!this.merchantId || !this.apiKey || !this.secretKey) {
        return this.simulatePayment(paymentRequest);
      }

      const requestData = {
        merchant_id: this.merchantId,
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        transaction_id: paymentRequest.transactionId,
        customer_reference: paymentRequest.customerReference,
        description: paymentRequest.description,
        callback_url: paymentRequest.callbackUrl,
        return_url: paymentRequest.returnUrl,
        timestamp: Math.floor(Date.now() / 1000),
      };

      // Generate signature
      const signature = this.generateSignature(requestData);

      this.logger.log(
        `Initiating CyberPay payment for transaction: ${paymentRequest.transactionId}`,
      );

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/v1/payments/create`,
          requestData,
          {
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Authorization: `Bearer ${this.apiKey}`,
              'X-Signature': signature,
            },
            timeout: 30000,
          },
        ),
      );

      if (response.data.status === 'success') {
        return {
          success: true,
          transactionId: paymentRequest.transactionId,
          gatewayTransactionId: response.data.payment_id,
          paymentUrl: response.data.payment_url,
          status: 'pending',
          message: 'Payment initiated successfully',
        };
      } else {
        return {
          success: false,
          transactionId: paymentRequest.transactionId,
          status: 'failed',
          message: response.data.message || 'Payment initiation failed',
          errorCode: response.data.error_code,
        };
      }
    } catch (error) {
      this.logger.error(
        `CyberPay payment initiation failed: ${error.message}`,
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
  ): Promise<CyberPayPaymentResponse> {
    try {
      // If configuration is incomplete, simulate verification
      if (!this.merchantId || !this.apiKey || !this.secretKey) {
        return this.simulateVerification(transactionId, gatewayTransactionId);
      }

      this.logger.log(`Verifying CyberPay payment: ${transactionId}`);

      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/v1/payments/${gatewayTransactionId}/status`,
          {
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${this.apiKey}`,
            },
            timeout: 30000,
          },
        ),
      );

      const status = this.mapCyberPayStatus(response.data.status);

      return {
        success: status !== 'failed',
        transactionId,
        gatewayTransactionId,
        status,
        message: response.data.message || 'Payment status retrieved',
        errorCode: response.data.error_code,
      };
    } catch (error) {
      this.logger.error(
        `CyberPay payment verification failed: ${error.message}`,
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
  ): Promise<CyberPayPaymentResponse> {
    try {
      // If configuration is incomplete, simulate refund
      if (!this.merchantId || !this.apiKey || !this.secretKey) {
        return this.simulateRefund(originalTransactionId, refundAmount);
      }

      const requestData = {
        payment_id: gatewayTransactionId,
        amount: refundAmount,
        reason,
        timestamp: Math.floor(Date.now() / 1000),
      };

      const signature = this.generateSignature(requestData);

      this.logger.log(
        `Processing CyberPay refund for transaction: ${originalTransactionId}`,
      );

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/v1/payments/refund`,
          requestData,
          {
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Authorization: `Bearer ${this.apiKey}`,
              'X-Signature': signature,
            },
            timeout: 30000,
          },
        ),
      );

      return {
        success: response.data.status === 'success',
        transactionId: originalTransactionId,
        gatewayTransactionId: response.data.refund_id,
        status: response.data.status === 'success' ? 'completed' : 'failed',
        message: response.data.message,
        errorCode: response.data.error_code,
      };
    } catch (error) {
      this.logger.error(
        `CyberPay refund processing failed: ${error.message}`,
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
   * Generate signature for request
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
   * Map CyberPay status to our standard status
   */
  private mapCyberPayStatus(
    cyberPayStatus: string,
  ): 'pending' | 'completed' | 'failed' {
    switch (cyberPayStatus?.toLowerCase()) {
      case 'completed':
      case 'success':
      case 'paid':
        return 'completed';
      case 'pending':
      case 'processing':
        return 'pending';
      case 'failed':
      case 'cancelled':
      case 'expired':
      default:
        return 'failed';
    }
  }

  /**
   * Simulate payment for development/testing
   */
  private async simulatePayment(
    paymentRequest: CyberPayPaymentRequest,
  ): Promise<CyberPayPaymentResponse> {
    this.logger.log(
      `Simulating CyberPay payment for transaction: ${paymentRequest.transactionId}`,
    );

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1200));

    // Simulate 85% success rate
    const isSuccess = Math.random() > 0.15;

    if (isSuccess) {
      return {
        success: true,
        transactionId: paymentRequest.transactionId,
        gatewayTransactionId: `cyberpay_sim_${Date.now()}`,
        paymentUrl: `https://simulator.cyberpay.sd/pay/${paymentRequest.transactionId}`,
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
  ): Promise<CyberPayPaymentResponse> {
    this.logger.log(
      `Simulating CyberPay verification for transaction: ${transactionId}`,
    );

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 800));

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
  ): Promise<CyberPayPaymentResponse> {
    this.logger.log(
      `Simulating CyberPay refund for transaction: ${originalTransactionId}`,
    );

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    return {
      success: true,
      transactionId: `refund_${originalTransactionId}_${Date.now()}`,
      gatewayTransactionId: `cyberpay_refund_sim_${Date.now()}`,
      status: 'completed',
      message: `Refund of ${refundAmount} SDG processed successfully (simulated)`,
    };
  }
}
