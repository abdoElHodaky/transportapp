import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  ParseUUIDPipe,
  ParseEnumPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserRole, UserStatus } from '../../entities/user.entity';
import { TripStatus } from '../../entities/trip.entity';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Get dashboard analytics',
    description: 'Get comprehensive platform analytics including users, trips, and revenue statistics.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard analytics retrieved successfully',
    schema: {
      example: {
        message: 'Dashboard analytics retrieved successfully',
        analytics: {
          users: {
            total: 1250,
            passengers: 1100,
            drivers: 150,
            active: 1180,
            newToday: 15,
          },
          trips: {
            total: 5420,
            completed: 4890,
            cancelled: 530,
            today: 45,
            thisWeek: 320,
            completionRate: 90,
          },
          revenue: {
            total: 125000.50,
            commission: 18750.08,
            today: 1250.00,
            thisMonth: 35000.00,
          },
          topDrivers: [
            {
              id: 'uuid-string',
              name: 'Ahmed Hassan',
              phone: '+249123456789',
              rating: 4.9,
              totalTrips: 450,
              vehicleInfo: 'Toyota Corolla (KH-123-456)',
            },
          ],
        },
      },
    },
  })
  @ApiForbiddenResponse({ description: 'Admin access required' })
  async getDashboard(@Request() req) {
    return this.adminService.getDashboardAnalytics(req.user.sub);
  }

  @Get('users')
  @ApiOperation({
    summary: 'Get all users with filtering',
    description: 'Get paginated list of all users with optional filtering by role, status, and search.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'role', required: false, enum: UserRole, description: 'Filter by user role' })
  @ApiQuery({ name: 'status', required: false, enum: UserStatus, description: 'Filter by user status' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by name, phone, or email' })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    schema: {
      example: {
        message: 'Users retrieved successfully',
        users: [
          {
            id: 'uuid-string',
            phone: '+249123456789',
            name: 'Ahmed Ali',
            email: 'ahmed@example.com',
            role: 'passenger',
            status: 'active',
            rating: 4.8,
            totalTrips: 25,
            phoneVerified: true,
            isOnline: false,
            isAvailable: true,
            wallet: {
              balance: 150.75,
              totalEarnings: 0,
              totalSpent: 349.25,
            },
            vehicleInfo: null,
            createdAt: '2024-01-15T10:30:00Z',
            updatedAt: '2024-01-24T12:00:00Z',
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1250,
          totalPages: 63,
        },
      },
    },
  })
  async getUsers(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('role') role?: UserRole,
    @Query('status') status?: UserStatus,
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsers(req.user.sub, page, limit, role, status, search);
  }

  @Put('users/:userId/status')
  @ApiOperation({
    summary: 'Update user status',
    description: 'Update user account status (activate, suspend, etc.).',
  })
  @ApiParam({ name: 'userId', description: 'User ID to update' })
  @ApiResponse({
    status: 200,
    description: 'User status updated successfully',
    schema: {
      example: {
        message: 'User status updated successfully',
        user: {
          id: 'uuid-string',
          name: 'Ahmed Ali',
          phone: '+249123456789',
          oldStatus: 'active',
          newStatus: 'suspended',
          reason: 'Violation of terms of service',
          updatedAt: '2024-01-24T13:00:00Z',
        },
      },
    },
  })
  async updateUserStatus(
    @Request() req,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() body: { status: UserStatus; reason?: string },
  ) {
    return this.adminService.updateUserStatus(req.user.sub, userId, body.status, body.reason);
  }

  @Get('trips')
  @ApiOperation({
    summary: 'Get all trips with filtering',
    description: 'Get paginated list of all trips with optional filtering by status and date range.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'status', required: false, enum: TripStatus, description: 'Filter by trip status' })
  @ApiQuery({ name: 'dateFrom', required: false, type: String, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, description: 'End date (ISO string)' })
  @ApiResponse({
    status: 200,
    description: 'Trips retrieved successfully',
    schema: {
      example: {
        message: 'Trips retrieved successfully',
        trips: [
          {
            id: 'uuid-string',
            status: 'completed',
            type: 'standard',
            passenger: {
              id: 'uuid-string',
              name: 'Ahmed Ali',
              phone: '+249123456789',
            },
            driver: {
              id: 'uuid-string',
              name: 'Mohamed Hassan',
              phone: '+249987654321',
              rating: 4.9,
            },
            pickup: {
              address: 'Khartoum Airport',
              coordinates: [15.5007, 32.5532],
            },
            dropoff: {
              address: 'Blue Nile Bridge',
              coordinates: [15.5880, 32.5355],
            },
            fare: {
              estimated: 25.50,
              actual: 27.00,
            },
            distance: {
              estimated: 5.2,
              actual: 5.4,
            },
            payment: {
              id: 'uuid-string',
              amount: 27.00,
              method: 'wallet',
              status: 'completed',
              commission: 4.05,
            },
            timestamps: {
              createdAt: '2024-01-24T12:00:00Z',
              completedAt: '2024-01-24T12:33:00Z',
              cancelledAt: null,
            },
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 5420,
          totalPages: 271,
        },
      },
    },
  })
  async getTrips(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: TripStatus,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const dateFromObj = dateFrom ? new Date(dateFrom) : undefined;
    const dateToObj = dateTo ? new Date(dateTo) : undefined;
    
    return this.adminService.getTrips(req.user.sub, page, limit, status, dateFromObj, dateToObj);
  }

  @Get('reports/financial')
  @ApiOperation({
    summary: 'Get financial reports',
    description: 'Get comprehensive financial reports with revenue breakdown and analytics.',
  })
  @ApiQuery({ name: 'dateFrom', required: true, type: String, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'dateTo', required: true, type: String, description: 'End date (ISO string)' })
  @ApiQuery({ 
    name: 'groupBy', 
    required: false, 
    enum: ['day', 'week', 'month'], 
    description: 'Group results by time period',
  })
  @ApiResponse({
    status: 200,
    description: 'Financial reports retrieved successfully',
    schema: {
      example: {
        message: 'Financial reports retrieved successfully',
        reports: {
          revenueByPeriod: [
            {
              period: '2024-01-24T00:00:00Z',
              revenue: 1250.00,
              commission: 187.50,
              transactions: 45,
            },
          ],
          transactionTypes: [
            {
              type: 'trip_payment',
              count: 320,
              totalAmount: 8500.00,
            },
            {
              type: 'wallet_topup',
              count: 125,
              totalAmount: 15000.00,
            },
          ],
          topEarningDrivers: [
            {
              id: 'uuid-string',
              name: 'Ahmed Hassan',
              phone: '+249123456789',
              totalEarnings: 2500.00,
              totalTrips: 180,
              rating: 4.9,
            },
          ],
          summary: {
            totalRevenue: 35000.00,
            totalCommission: 5250.00,
            totalTransactions: 1250,
          },
        },
      },
    },
  })
  async getFinancialReports(
    @Request() req,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('groupBy') groupBy: 'day' | 'week' | 'month' = 'day',
  ) {
    return this.adminService.getFinancialReports(
      req.user.sub,
      new Date(dateFrom),
      new Date(dateTo),
      groupBy,
    );
  }

  @Post('export')
  @ApiOperation({
    summary: 'Export data to CSV',
    description: 'Export platform data (users, trips, or payments) to CSV format.',
  })
  @ApiResponse({
    status: 200,
    description: 'Data exported successfully',
    schema: {
      example: {
        message: 'Data exported successfully',
        export: {
          type: 'users',
          filename: 'users_export_2024-01-24.csv',
          content: 'ID,Name,Phone,Email,Role,Status,Rating,Total Trips,Wallet Balance,Created At\n...',
          recordCount: 1250,
        },
      },
    },
  })
  async exportData(
    @Request() req,
    @Body() body: {
      type: 'users' | 'trips' | 'payments';
      dateFrom?: string;
      dateTo?: string;
    },
  ) {
    const dateFromObj = body.dateFrom ? new Date(body.dateFrom) : undefined;
    const dateToObj = body.dateTo ? new Date(body.dateTo) : undefined;
    
    return this.adminService.exportData(req.user.sub, body.type, dateFromObj, dateToObj);
  }
}

