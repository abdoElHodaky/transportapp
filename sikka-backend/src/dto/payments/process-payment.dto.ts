import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../../entities/payment.entity';

export class ProcessPaymentDto {
  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
  })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Gateway transaction ID (for EBS/CyberPay)',
    example: 'ebs_txn_123456789',
  })
  @IsOptional()
  @IsString()
  gatewayTransactionId?: string;
}
