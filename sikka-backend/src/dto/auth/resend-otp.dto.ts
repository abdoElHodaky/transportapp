import { IsPhoneNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResendOtpDto {
  @ApiProperty({
    description: 'Phone number in international format',
    example: '+249123456789',
  })
  @IsPhoneNumber('SD')
  phone: string;
}
