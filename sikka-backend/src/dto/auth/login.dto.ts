import { IsString, IsPhoneNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Phone number in international format',
    example: '+249123456789',
  })
  @IsPhoneNumber('SD')
  phone: string;

  @ApiPropertyOptional({
    description: 'Password (optional for OTP-based login)',
    example: 'SecurePassword123',
  })
  @IsOptional()
  @IsString()
  password?: string;
}
