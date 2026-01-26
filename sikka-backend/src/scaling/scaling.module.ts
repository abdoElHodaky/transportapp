import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScalingService } from './scaling.service';
import { ScalingController } from './scaling.controller';
import { ScalingPhasesConfig } from '../config/scaling-phases.config';
import { DatabaseScalingConfig } from '../config/database-scaling.config';
import { RedisScalingConfig } from '../config/redis-scaling.config';
import { PerformanceModule } from '../performance/performance.module';

@Module({
  imports: [
    ConfigModule,
    PerformanceModule,
  ],
  controllers: [ScalingController],
  providers: [
    ScalingService,
    ScalingPhasesConfig,
    DatabaseScalingConfig,
    RedisScalingConfig,
  ],
  exports: [
    ScalingService,
    ScalingPhasesConfig,
    DatabaseScalingConfig,
    RedisScalingConfig,
  ],
})
export class ScalingModule {}

