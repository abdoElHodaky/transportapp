import { Controller, Get, Post, Body, UseGuards, Param } from '@nestjs/common';
import { ScalingService } from './scaling.service';
import { JwtAuthGuard } from '../modules/auth/jwt-auth.guard';

@Controller('scaling')
@UseGuards(JwtAuthGuard)
export class ScalingController {
  constructor(private readonly scalingService: ScalingService) {}

  @Get('status')
  async getScalingStatus() {
    const status = await this.scalingService.getScalingStatus();
    return {
      message: 'Scaling status retrieved successfully',
      status,
    };
  }

  @Post('transition/:phase')
  async executePhaseTransition(@Param('phase') phase: 'launch' | 'growth' | 'scale') {
    const result = await this.scalingService.executePhaseTransition(phase);
    return {
      message: result.success ? 'Phase transition initiated successfully' : 'Phase transition failed',
      result,
    };
  }

  @Get('deployment-configs')
  async getDeploymentConfigurations() {
    const configs = await this.scalingService.getDeploymentConfigurations();
    return {
      message: 'Deployment configurations generated successfully',
      configs,
    };
  }

  @Get('phase-summary')
  async getPhaseSummary() {
    const status = await this.scalingService.getScalingStatus();
    return {
      message: 'Phase summary retrieved successfully',
      summary: {
        currentPhase: status.currentPhase,
        nextPhase: status.nextPhase,
        capacity: status.currentCapacity,
        progress: status.phaseProgress.progressPercentage,
        criticalActions: status.phaseProgress.criticalActions,
        timeline: status.timeline.estimatedTimeToNextPhase,
      },
    };
  }
}

