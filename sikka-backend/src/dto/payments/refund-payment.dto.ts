import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefundPaymentDto {
  @ApiProperty({
    description: 'Reason for the refund',
    example: 'Trip was cancelled by driver',
    maxLength: 500,
  })
  @IsString()
  @MaxLength(500)
  refundReason: string;
}

