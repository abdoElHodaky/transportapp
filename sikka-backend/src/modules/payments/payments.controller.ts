import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Query,
  UseGuards, 
  Request,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth, 
  ApiParam,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { ProcessPaymentDto } from '../../dto/payments/process-payment.dto';
import { TopUpWalletDto } from '../../dto/payments/topup-wallet.dto';
import { RefundPaymentDto } from '../../dto/payments/refund-payment.dto';
import { PaginationDto } from '../../dto/common/pagination.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('trips/:tripId/process')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Process trip payment',
    description: 'Process payment for a completed trip. Supports wallet, EBS, and CyberPay methods.',
  })
  @ApiParam({ name: 'tripId', description: 'Trip ID to process payment for' })
  @ApiResponse({ 
    status: 200, 
    description: 'Payment processed successfully',
    schema: {
      example: {
        message: 'Payment processed successfully',
        payment: {
          id: 'uuid-string',
          tripId: 'uuid-string',
          amount: 27.00,
          method: 'wallet',
          status: 'completed',
          platformCommission: 4.05,
          driverEarnings: 22.95,
          processedAt: '2024-01-24T12:35:00Z',
          gatewayTransactionId: null,
        },
      },
    },
  })
  @ApiBadRequestResponse({ 
    description: 'Trip not completed, payment already processed, or insufficient wallet balance',
  })
  @ApiNotFoundResponse({ 
    description: 'Trip not found',
  })
  async processPayment(
    @Param('tripId', ParseUUIDPipe) tripId: string, 
    @Body() paymentDto: ProcessPaymentDto,
  ) {
    return this.paymentsService.processPayment(tripId, paymentDto);
  }

  @Get('wallet')
  @ApiOperation({ 
    summary: 'Get user wallet balance',
    description: 'Get current wallet balance and transaction summary for the authenticated user.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Wallet balance retrieved successfully',
    schema: {
      example: {
        message: 'Wallet balance retrieved successfully',
        wallet: {
          id: 'uuid-string',
          balance: 150.75,
          totalEarnings: 500.00,
          totalSpent: 349.25,
          pendingAmount: 0.00,
          currency: 'SDG',
          isActive: true,
          lastUpdated: '2024-01-24T12:35:00Z',
        },
      },
    },
  })
  async getWalletBalance(@Request() req) {
    return this.paymentsService.getWalletBalance(req.user.sub);
  }

  @Post('wallet/topup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Top up wallet balance',
    description: 'Add funds to user wallet using EBS, CyberPay, or other payment methods.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Wallet topped up successfully',
    schema: {
      example: {
        message: 'Wallet topped up successfully',
        transaction: {
          id: 'uuid-string',
          type: 'topup',
          amount: 100.00,
          method: 'ebs',
          status: 'completed',
          balanceBefore: 150.75,
          balanceAfter: 250.75,
          description: 'Wallet top-up via ebs',
          processedAt: '2024-01-24T12:40:00Z',
          gatewayTransactionId: 'ebs_txn_123456789',
        },
      },
    },
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid top-up amount or payment method',
  })
  async topUpWallet(@Request() req, @Body() topUpDto: TopUpWalletDto) {
    return this.paymentsService.topupWallet(req.user.sub, topUpDto);
  }

  @Get('transactions')
  @ApiOperation({ 
    summary: 'Get user transaction history',
    description: 'Get paginated list of all wallet transactions for the authenticated user.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Transactions retrieved successfully',
    schema: {
      example: {
        message: 'Transactions retrieved successfully',
        transactions: [
          {
            id: 'uuid-string',
            type: 'trip_payment',
            amount: -27.00,
            balanceBefore: 177.75,
            balanceAfter: 150.75,
            status: 'completed',
            description: 'Payment for trip to Blue Nile Bridge',
            reference: 'trip-uuid-string',
            gatewayTransactionId: null,
            createdAt: '2024-01-24T12:35:00Z',
          },
          {
            id: 'uuid-string',
            type: 'topup',
            amount: 100.00,
            balanceBefore: 77.75,
            balanceAfter: 177.75,
            status: 'completed',
            description: 'Wallet top-up via ebs',
            reference: null,
            gatewayTransactionId: 'ebs_txn_123456789',
            createdAt: '2024-01-24T10:00:00Z',
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 15,
          totalPages: 2,
        },
      },
    },
  })
  async getTransactions(@Request() req, @Query() paginationDto: PaginationDto) {
    return this.paymentsService.getTransactions(
      req.user.sub, 
      paginationDto.page, 
      paginationDto.limit,
    );
  }

  @Get('history')
  @ApiOperation({ 
    summary: 'Get payment history',
    description: 'Get paginated list of trip payments for the authenticated user.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Payment history retrieved successfully',
    schema: {
      example: {
        message: 'Payment history retrieved successfully',
        payments: [
          {
            id: 'uuid-string',
            tripId: 'uuid-string',
            amount: 27.00,
            method: 'wallet',
            status: 'completed',
            platformCommission: 4.05,
            driverEarnings: 22.95,
            processedAt: '2024-01-24T12:35:00Z',
            trip: {
              pickup: 'Khartoum Airport',
              dropoff: 'Blue Nile Bridge',
              completedAt: '2024-01-24T12:33:00Z',
            },
            createdAt: '2024-01-24T12:35:00Z',
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 8,
          totalPages: 1,
        },
      },
    },
  })
  async getPaymentHistory(@Request() req, @Query() paginationDto: PaginationDto) {
    return this.paymentsService.getPaymentHistory(
      req.user.sub, 
      paginationDto.page, 
      paginationDto.limit,
    );
  }

  @Post(':paymentId/refund')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Refund a payment (Admin only)',
    description: 'Process a refund for a completed payment. This endpoint is typically used by admin users.',
  })
  @ApiParam({ name: 'paymentId', description: 'Payment ID to refund' })
  @ApiResponse({ 
    status: 200, 
    description: 'Payment refunded successfully',
    schema: {
      example: {
        message: 'Payment refunded successfully',
        refund: {
          paymentId: 'uuid-string',
          amount: 27.00,
          refundReason: 'Trip was cancelled by driver',
          refundedAt: '2024-01-24T13:00:00Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({ 
    description: 'Payment not eligible for refund',
  })
  @ApiNotFoundResponse({ 
    description: 'Payment not found',
  })
  async refundPayment(
    @Param('paymentId', ParseUUIDPipe) paymentId: string, 
    @Body() refundDto: RefundPaymentDto,
  ) {
    return this.paymentsService.refundPayment(paymentId, refundDto.refundReason);
  }
}
