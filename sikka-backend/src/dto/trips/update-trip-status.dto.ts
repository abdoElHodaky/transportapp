import { IsEnum, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TripStatus } from '../../entities/trip.entity';

export class UpdateTripStatusDto {
  @ApiProperty({
    description: 'New trip status',
    enum: TripStatus,
  })
  @IsEnum(TripStatus)
  status: TripStatus;

  @ApiPropertyOptional({
    description: 'Current latitude (for location updates)',
    example: 15.5007,
    minimum: -90,
    maximum: 90,
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Current longitude (for location updates)',
    example: 32.5532,
    minimum: -180,
    maximum: 180,
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}

