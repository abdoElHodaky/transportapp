import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LocationsService } from './locations.service';

@ApiTags('Locations')
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post('update')
  @ApiOperation({ summary: 'Update driver location (real-time)' })
  async updateLocation(@Body() locationDto: any) {
    return this.locationsService.updateLocation(locationDto);
  }

  @Get('nearby-drivers')
  @ApiOperation({ summary: 'Get nearby drivers for passenger' })
  async getNearbyDrivers(@Query() query: any) {
    return this.locationsService.getNearbyDrivers(query);
  }

  @Get('trip/:tripId/tracking')
  @ApiOperation({ summary: 'Get real-time trip tracking data' })
  async getTripTracking(@Query('tripId') tripId: string) {
    return this.locationsService.getTripTracking(tripId);
  }

  @Get('geocode')
  @ApiOperation({ summary: 'Geocode address to coordinates' })
  async geocodeAddress(@Query('address') address: string) {
    return this.locationsService.geocodeAddress(address);
  }

  @Get('reverse-geocode')
  @ApiOperation({ summary: 'Reverse geocode coordinates to address' })
  async reverseGeocode(@Query() coords: any) {
    return this.locationsService.reverseGeocode(coords);
  }
}
