import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { TripsService } from './trips.service';
import { TripRequestDto } from '../../dto/trips/trip-request.dto';
import { UpdateTripStatusDto } from '../../dto/trips/update-trip-status.dto';
import { RateTripDto } from '../../dto/trips/rate-trip.dto';
import { PaginationDto } from '../../dto/common/pagination.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Trips')
@Controller('trips')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post('request')
  @ApiOperation({
    summary: 'Request a new trip',
    description:
      'Create a new trip request with pickup and dropoff locations. The system will calculate fare and find nearby drivers.',
  })
  @ApiResponse({
    status: 201,
    description: 'Trip requested successfully',
    schema: {
      example: {
        message: 'Trip requested successfully',
        trip: {
          id: 'uuid-string',
          status: 'searching_driver',
          pickup: {
            address: 'Khartoum Airport',
            latitude: 15.5007,
            longitude: 32.5532,
          },
          dropoff: {
            address: 'Blue Nile Bridge',
            latitude: 15.588,
            longitude: 32.5355,
          },
          estimatedFare: 25.5,
          estimatedDistance: 5.2,
          estimatedDuration: 13,
          createdAt: '2024-01-24T12:00:00Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid trip request data',
  })
  async requestTrip(@Request() req, @Body() tripRequestDto: TripRequestDto) {
    return this.tripsService.requestTrip(req.user.sub, tripRequestDto);
  }

  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Accept a trip (Driver only)',
    description:
      'Driver accepts a trip request. Driver must be online and available.',
  })
  @ApiParam({ name: 'id', description: 'Trip ID' })
  @ApiResponse({
    status: 200,
    description: 'Trip accepted successfully',
    schema: {
      example: {
        message: 'Trip accepted successfully',
        trip: {
          id: 'uuid-string',
          status: 'driver_assigned',
          driverAssignedAt: '2024-01-24T12:05:00Z',
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Trip not found or already assigned',
  })
  async acceptTrip(@Request() req, @Param('id', ParseUUIDPipe) tripId: string) {
    return this.tripsService.acceptTrip(tripId, req.user.sub);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get trip details',
    description:
      'Get detailed information about a specific trip. Only accessible by passenger or driver of the trip.',
  })
  @ApiParam({ name: 'id', description: 'Trip ID' })
  @ApiResponse({
    status: 200,
    description: 'Trip details retrieved successfully',
    schema: {
      example: {
        message: 'Trip details retrieved successfully',
        trip: {
          id: 'uuid-string',
          status: 'in_progress',
          type: 'standard',
          passenger: {
            id: 'uuid-string',
            name: 'Ahmed Ali',
            phone: '+249123456789',
            rating: 4.8,
          },
          driver: {
            id: 'uuid-string',
            name: 'Mohamed Hassan',
            phone: '+249987654321',
            rating: 4.9,
            vehicleType: 'sedan',
            vehicleModel: 'Toyota Corolla',
            vehiclePlateNumber: 'KH-123-456',
            vehicleColor: 'white',
          },
          pickup: {
            address: 'Khartoum Airport',
            latitude: 15.5007,
            longitude: 32.5532,
          },
          dropoff: {
            address: 'Blue Nile Bridge',
            latitude: 15.588,
            longitude: 32.5355,
          },
          fare: {
            estimated: 25.5,
            actual: 27.0,
            breakdown: {
              baseFare: 5.0,
              distanceFare: 10.4,
              timeFare: 0.0,
              surgeFare: 0.0,
              surgeMultiplier: 1.0,
            },
          },
          distance: {
            estimated: 5.2,
            actual: 5.4,
          },
          duration: {
            estimated: 13,
            actual: 15,
          },
          timestamps: {
            createdAt: '2024-01-24T12:00:00Z',
            driverAssignedAt: '2024-01-24T12:05:00Z',
            driverArrivedAt: '2024-01-24T12:15:00Z',
            tripStartedAt: '2024-01-24T12:18:00Z',
            tripCompletedAt: '2024-01-24T12:33:00Z',
            cancelledAt: null,
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Trip not found',
  })
  @ApiForbiddenResponse({
    description: 'Not authorized to view this trip',
  })
  async getTripDetails(
    @Request() req,
    @Param('id', ParseUUIDPipe) tripId: string,
  ) {
    return this.tripsService.getTripDetails(tripId, req.user.sub);
  }

  @Put(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update trip status',
    description:
      'Update the status of a trip. Only passenger or assigned driver can update status.',
  })
  @ApiParam({ name: 'id', description: 'Trip ID' })
  @ApiResponse({
    status: 200,
    description: 'Trip status updated successfully',
    schema: {
      example: {
        message: 'Trip status updated successfully',
        trip: {
          id: 'uuid-string',
          status: 'in_progress',
          updatedAt: '2024-01-24T12:18:00Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid status transition',
  })
  @ApiNotFoundResponse({
    description: 'Trip not found',
  })
  @ApiForbiddenResponse({
    description: 'Not authorized to update this trip',
  })
  async updateTripStatus(
    @Request() req,
    @Param('id', ParseUUIDPipe) tripId: string,
    @Body() statusDto: UpdateTripStatusDto,
  ) {
    return this.tripsService.updateTripStatus(tripId, req.user.sub, statusDto);
  }

  @Get('user/history')
  @ApiOperation({
    summary: 'Get user trip history',
    description:
      'Get paginated list of trips for the authenticated user (both as passenger and driver).',
  })
  @ApiResponse({
    status: 200,
    description: 'Trip history retrieved successfully',
    schema: {
      example: {
        message: 'Trip history retrieved successfully',
        trips: [
          {
            id: 'uuid-string',
            status: 'completed',
            type: 'standard',
            pickup: 'Khartoum Airport',
            dropoff: 'Blue Nile Bridge',
            fare: 27.0,
            distance: 5.4,
            duration: 15,
            createdAt: '2024-01-24T12:00:00Z',
            completedAt: '2024-01-24T12:33:00Z',
            cancelledAt: null,
            passenger: {
              id: 'uuid-string',
              name: 'Ahmed Ali',
            },
            driver: {
              id: 'uuid-string',
              name: 'Mohamed Hassan',
              rating: 4.9,
            },
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 25,
          totalPages: 3,
        },
      },
    },
  })
  async getTripHistory(@Request() req, @Query() paginationDto: PaginationDto) {
    return this.tripsService.getTripHistory(
      req.user.sub,
      paginationDto.page,
      paginationDto.limit,
    );
  }

  @Post(':id/rate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rate a completed trip',
    description:
      'Rate the other party (passenger rates driver, driver rates passenger) for a completed trip.',
  })
  @ApiParam({ name: 'id', description: 'Trip ID' })
  @ApiResponse({
    status: 200,
    description: 'Trip rated successfully',
    schema: {
      example: {
        message: 'Trip rated successfully',
        rating: {
          id: 'uuid-string',
          tripId: 'uuid-string',
          rating: 5,
          comment: 'Great driver, very professional!',
          createdAt: '2024-01-24T12:35:00Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Trip not completed or already rated',
  })
  @ApiNotFoundResponse({
    description: 'Trip not found',
  })
  @ApiForbiddenResponse({
    description: 'Not authorized to rate this trip',
  })
  async rateTrip(
    @Request() req,
    @Param('id', ParseUUIDPipe) tripId: string,
    @Body() ratingDto: RateTripDto,
  ) {
    return this.tripsService.rateTrip(tripId, req.user.sub, ratingDto);
  }
}
