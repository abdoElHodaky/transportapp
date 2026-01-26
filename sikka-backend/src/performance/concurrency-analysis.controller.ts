import { Controller, Get, UseGuards } from '@nestjs/common';
import { ConcurrencyAnalysisService } from './concurrency-analysis.service';
import { JwtAuthGuard } from '../modules/auth/jwt-auth.guard';

@Controller('performance/concurrency')
@UseGuards(JwtAuthGuard)
export class ConcurrencyAnalysisController {
  constructor(private readonly concurrencyAnalysisService: ConcurrencyAnalysisService) {}

  @Get('analysis')
  async getConcurrencyAnalysis() {
    const analysis = await this.concurrencyAnalysisService.analyzeConcurrencyCapacity();
    return {
      message: 'Concurrency analysis completed successfully',
      analysis,
    };
  }

  @Get('load-testing')
  async getLoadTestingRecommendations() {
    const recommendations = await this.concurrencyAnalysisService.getLoadTestingRecommendations();
    return {
      message: 'Load testing recommendations generated successfully',
      recommendations,
    };
  }

  @Get('capacity-summary')
  async getCapacitySummary() {
    const analysis = await this.concurrencyAnalysisService.analyzeConcurrencyCapacity();
    
    return {
      message: 'System capacity summary retrieved successfully',
      summary: {
        maxConcurrentUsers: analysis.estimatedCapacity.maxConcurrentUsers,
        maxConcurrentTrips: analysis.estimatedCapacity.maxConcurrentTrips,
        maxConcurrentApiRequests: analysis.estimatedCapacity.maxConcurrentApiRequests,
        maxConcurrentWebSocketSessions: analysis.estimatedCapacity.maxConcurrentWebSocketSessions,
        bottleneckComponent: analysis.estimatedCapacity.bottleneckComponent,
        systemHealth: {
          cpuCores: analysis.system.cpuCores,
          memoryUtilization: analysis.system.memoryUtilization,
          databaseUtilization: analysis.database.connectionUtilization,
          redisUtilization: analysis.redis.memoryUtilization,
        },
        scalingPriority: analysis.estimatedCapacity.scalingRecommendations.slice(0, 3),
      },
    };
  }
}

