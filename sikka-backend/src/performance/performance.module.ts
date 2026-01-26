import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConcurrencyAnalysisService } from './concurrency-analysis.service';
import { ConcurrencyAnalysisController } from './concurrency-analysis.controller';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule,
  ],
  controllers: [ConcurrencyAnalysisController],
  providers: [ConcurrencyAnalysisService],
  exports: [ConcurrencyAnalysisService],
})
export class PerformanceModule {}

