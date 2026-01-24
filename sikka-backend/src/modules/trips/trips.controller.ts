import { Controller, Get, Post, Put, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TripsService } from './trips.service';

@ApiTags('Trips')
@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post('request')
  @ApiOperation({ summary: 'Request a new trip' })
  async requestTrip(@Body() tripRequestDto: any) {
    return this.tripsService.requestTrip(tripRequestDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get trip details' })
  async getTripDetails(@Param('id') tripId: string) {
    return this.tripsService.getTripDetails(tripId);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update trip status' })
  async updateTripStatus(@Param('id') tripId: string, @Body() statusDto: any) {
    return this.tripsService.updateTripStatus(tripId, statusDto);
  }

  @Get('user/history')
  @ApiOperation({ summary: 'Get user trip history' })
  async getTripHistory() {
    return this.tripsService.getTripHistory();
  }

  @Post(':id/rate')
  @ApiOperation({ summary: 'Rate a completed trip' })
  async rateTrip(@Param('id') tripId: string, @Body() ratingDto: any) {
    return this.tripsService.rateTrip(tripId, ratingDto);
  }
}

