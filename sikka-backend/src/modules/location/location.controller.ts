import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LocationService, LocationUpdateDto, NearbyDriversQuery, RouteCalculationDto } from './location.service';

@ApiTags('location')
@Controller('location')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Post('update')
  @ApiOperation({ summary: 'Update user location' })
  @ApiResponse({ status: 200, description: 'Location updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateLocation(@Request() req, @Body() locationData: LocationUpdateDto) {
    const userId = req.user.sub;
    
    // Validate coordinates
    if (
      !this.isValidLatitude(locationData.latitude) ||
      !this.isValidLongitude(locationData.longitude)
    ) {
      throw new BadRequestException('Invalid coordinates provided');
    }

    // Check if location is within service area
    const isWithinServiceArea = await this.locationService.isWithinServiceArea(
      locationData.latitude,
      locationData.longitude,
    );

    if (!isWithinServiceArea) {
      throw new BadRequestException('Location is outside service area');
    }

    return this.locationService.updateUserLocation(userId, locationData);
  }

  @Get('nearby-drivers')
  @ApiOperation({ summary: 'Find nearby available drivers' })
  @ApiResponse({ status: 200, description: 'Nearby drivers found' })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  async findNearbyDrivers(@Query() query: NearbyDriversQuery) {
    // Validate required parameters
    if (!query.latitude || !query.longitude) {
      throw new BadRequestException('Latitude and longitude are required');
    }

    if (
      !this.isValidLatitude(query.latitude) ||
      !this.isValidLongitude(query.longitude)
    ) {
      throw new BadRequestException('Invalid coordinates provided');
    }

    // Validate optional parameters
    if (query.radius && (query.radius < 100 || query.radius > 50000)) {
      throw new BadRequestException('Radius must be between 100m and 50km');
    }

    if (query.limit && (query.limit < 1 || query.limit > 50)) {
      throw new BadRequestException('Limit must be between 1 and 50');
    }

    return this.locationService.findNearbyDrivers(query);
  }

  @Post('calculate-route')
  @ApiOperation({ summary: 'Calculate route distance, duration and fare' })
  @ApiResponse({ status: 200, description: 'Route calculated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid route parameters' })
  async calculateRoute(@Body() routeData: RouteCalculationDto) {
    // Validate coordinates
    if (
      !this.isValidLatitude(routeData.pickupLatitude) ||
      !this.isValidLongitude(routeData.pickupLongitude) ||
      !this.isValidLatitude(routeData.dropoffLatitude) ||
      !this.isValidLongitude(routeData.dropoffLongitude)
    ) {
      throw new BadRequestException('Invalid coordinates provided');
    }

    // Check if both locations are within service area
    const pickupInServiceArea = await this.locationService.isWithinServiceArea(
      routeData.pickupLatitude,
      routeData.pickupLongitude,
    );

    const dropoffInServiceArea = await this.locationService.isWithinServiceArea(
      routeData.dropoffLatitude,
      routeData.dropoffLongitude,
    );

    if (!pickupInServiceArea || !dropoffInServiceArea) {
      throw new BadRequestException('One or both locations are outside service area');
    }

    return this.locationService.calculateRoute(routeData);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get user location history' })
  @ApiResponse({ status: 200, description: 'Location history retrieved' })
  async getLocationHistory(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
  ) {
    const userId = req.user.sub;

    // Validate pagination parameters
    if (page < 1) {
      throw new BadRequestException('Page must be greater than 0');
    }

    if (limit < 1 || limit > 100) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    return this.locationService.getLocationHistory(userId, page, limit);
  }

  @Post('track-trip/:tripId')
  @ApiOperation({ summary: 'Track trip route (driver only)' })
  @ApiResponse({ status: 200, description: 'Trip route updated' })
  @ApiResponse({ status: 404, description: 'Trip not found' })
  @ApiResponse({ status: 403, description: 'Not authorized for this trip' })
  async trackTripRoute(
    @Request() req,
    @Param('tripId') tripId: string,
    @Body() locationData: LocationUpdateDto,
  ) {
    const userId = req.user.sub;
    const userRole = req.user.role;

    // Only drivers can track trip routes
    if (userRole !== 'driver') {
      throw new BadRequestException('Only drivers can track trip routes');
    }

    // Validate coordinates
    if (
      !this.isValidLatitude(locationData.latitude) ||
      !this.isValidLongitude(locationData.longitude)
    ) {
      throw new BadRequestException('Invalid coordinates provided');
    }

    return this.locationService.trackTripRoute(tripId, locationData);
  }

  @Get('service-area/check')
  @ApiOperation({ summary: 'Check if location is within service area' })
  @ApiResponse({ status: 200, description: 'Service area check completed' })
  async checkServiceArea(
    @Query('latitude') latitude: number,
    @Query('longitude') longitude: number,
  ) {
    if (!latitude || !longitude) {
      throw new BadRequestException('Latitude and longitude are required');
    }

    if (
      !this.isValidLatitude(latitude) ||
      !this.isValidLongitude(longitude)
    ) {
      throw new BadRequestException('Invalid coordinates provided');
    }

    const isWithinServiceArea = await this.locationService.isWithinServiceArea(
      latitude,
      longitude,
    );

    return {
      latitude,
      longitude,
      isWithinServiceArea,
      serviceArea: 'Khartoum, Sudan',
    };
  }

  @Get('driver/:driverId/current')
  @ApiOperation({ summary: 'Get current driver location (admin only)' })
  @ApiResponse({ status: 200, description: 'Driver location retrieved' })
  @ApiResponse({ status: 404, description: 'Driver not found' })
  async getDriverCurrentLocation(
    @Request() req,
    @Param('driverId') driverId: string,
  ) {
    const userRole = req.user.role;

    // Only admins can access driver locations directly
    if (userRole !== 'admin') {
      throw new BadRequestException('Admin access required');
    }

    // This would typically get the latest location from Redis cache
    // For now, we'll return a placeholder response
    return {
      message: 'Driver location access requires admin privileges',
      driverId,
      note: 'This endpoint would return real-time driver location for admin users',
    };
  }

  @Get('analytics/coverage')
  @ApiOperation({ summary: 'Get location coverage analytics (admin only)' })
  @ApiResponse({ status: 200, description: 'Coverage analytics retrieved' })
  async getCoverageAnalytics(@Request() req) {
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      throw new BadRequestException('Admin access required');
    }

    // This would return analytics about location coverage
    return {
      message: 'Location coverage analytics',
      serviceArea: {
        name: 'Khartoum, Sudan',
        bounds: {
          north: 15.7,
          south: 15.3,
          east: 32.8,
          west: 32.3,
        },
      },
      stats: {
        totalLocationUpdates: 'Available in full implementation',
        activeDrivers: 'Available in full implementation',
        coveragePercentage: 'Available in full implementation',
      },
    };
  }

  private isValidLatitude(lat: number): boolean {
    return typeof lat === 'number' && lat >= -90 && lat <= 90;
  }

  private isValidLongitude(lng: number): boolean {
    return typeof lng === 'number' && lng >= -180 && lng <= 180;
  }
}
