import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Basic health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async healthCheck() {
    return this.healthService.getHealthStatus();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check for Kubernetes' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  async readinessCheck() {
    return this.healthService.getReadinessStatus();
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness check for Kubernetes' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  async livenessCheck() {
    return this.healthService.getLivenessStatus();
  }

  @Get('detailed')
  @ApiOperation({ summary: 'Detailed health information' })
  @ApiResponse({ status: 200, description: 'Detailed health status' })
  async detailedHealthCheck() {
    return this.healthService.getDetailedHealthStatus();
  }
}

