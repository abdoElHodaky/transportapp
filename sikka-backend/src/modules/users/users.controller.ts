import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile() {
    return this.usersService.getProfile();
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update user profile' })
  async updateProfile(@Body() updateDto: any) {
    return this.usersService.updateProfile(updateDto);
  }

  @Get('drivers')
  @ApiOperation({ summary: 'Get available drivers nearby' })
  async getNearbyDrivers() {
    return this.usersService.getNearbyDrivers();
  }
}

