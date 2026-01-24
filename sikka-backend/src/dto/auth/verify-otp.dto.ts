import { IsString, IsPhoneNumber, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({
    description: 'Phone number in international format',
    example: '+249123456789',
  })
  @IsPhoneNumber('SD')
  phone: string;

  @ApiProperty({
    description: '6-digit OTP code',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @Length(6, 6)
  otp: string;
}

