import { IsString, IsNumber, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TripType } from '../../entities/trip.entity';

export class TripRequestDto {
  @ApiProperty({
    description: 'Pickup location address',
    example: 'Khartoum Airport, Sudan',
  })
  @IsString()
  pickupAddress: string;

  @ApiProperty({
    description: 'Pickup location latitude',
    example: 15.5007,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  pickupLatitude: number;

  @ApiProperty({
    description: 'Pickup location longitude',
    example: 32.5532,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  pickupLongitude: number;

  @ApiProperty({
    description: 'Dropoff location address',
    example: 'Blue Nile Bridge, Khartoum',
  })
  @IsString()
  dropoffAddress: string;

  @ApiProperty({
    description: 'Dropoff location latitude',
    example: 15.5880,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  dropoffLatitude: number;

  @ApiProperty({
    description: 'Dropoff location longitude',
    example: 32.5355,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  dropoffLongitude: number;

  @ApiPropertyOptional({
    description: 'Trip type',
    enum: TripType,
    default: TripType.STANDARD,
  })
  @IsOptional()
  @IsEnum(TripType)
  type?: TripType;
}

