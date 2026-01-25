import { IsNumber, IsEnum, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../../entities/payment.entity';

export class TopUpWalletDto {
  @ApiProperty({
    description: 'Amount to top up in SDG',
    example: 100.0,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({
    description: 'Payment method for top-up',
    enum: PaymentMethod,
  })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Gateway transaction ID (for EBS/CyberPay)',
    example: 'ebs_topup_123456789',
  })
  @IsOptional()
  @IsString()
  gatewayTransactionId?: string;
}
