import {
  IsString,
  IsPhoneNumber,
  IsEmail,
  IsOptional,
  IsEnum,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../entities/user.entity';

export class RegisterDto {
  @ApiProperty({
    description: 'Phone number in international format',
    example: '+249123456789',
  })
  @IsPhoneNumber('SD')
  phone: string;

  @ApiPropertyOptional({
    description: 'Full name of the user',
    example: 'Ahmed Ali',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Email address',
    example: 'ahmed@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Password (optional for phone-only registration)',
    example: 'SecurePassword123',
    minLength: 6,
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({
    description: 'User role',
    enum: UserRole,
    default: UserRole.PASSENGER,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
