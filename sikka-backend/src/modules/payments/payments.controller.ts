import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('process')
  @ApiOperation({ summary: 'Process trip payment' })
  async processPayment(@Body() paymentDto: any) {
    return this.paymentsService.processPayment(paymentDto);
  }

  @Get('wallet')
  @ApiOperation({ summary: 'Get user wallet balance' })
  async getWalletBalance() {
    return this.paymentsService.getWalletBalance();
  }

  @Post('wallet/topup')
  @ApiOperation({ summary: 'Top up wallet balance' })
  async topUpWallet(@Body() topUpDto: any) {
    return this.paymentsService.topUpWallet(topUpDto);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get payment transactions history' })
  async getTransactions() {
    return this.paymentsService.getTransactions();
  }
}

