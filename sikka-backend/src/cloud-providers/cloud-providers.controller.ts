import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { CloudProviderManagerService } from './cloud-provider-manager.service';
import { CostComparisonService } from './cost-comparison.service';
import {
  CloudProviderFactory,
  CloudProviderType,
} from './cloud-provider.factory';
import { InfrastructureConfig } from './interfaces/infrastructure-config.interface';
import { InfrastructureOptions } from './interfaces/cloud-provider.interface';
import { ScalingPhasesConfig, ScalingPhaseConfig } from '../config/scaling-phases.config';

@ApiTags('Cloud Providers')
@Controller('cloud-providers')
export class CloudProvidersController {
  private readonly logger = new Logger(CloudProvidersController.name);

  constructor(
    private readonly providerManager: CloudProviderManagerService,
    private readonly costComparison: CostComparisonService,
    private readonly providerFactory: CloudProviderFactory,
    private readonly scalingPhasesConfig: ScalingPhasesConfig,
  ) {}

  /**
   * Convert string phase to ScalingPhaseConfig
   */
  private getPhaseConfig(phase: 'launch' | 'growth' | 'scale'): ScalingPhaseConfig {
    return this.scalingPhasesConfig.getPhaseConfig(phase);
  }

  /**
   * Convert InfrastructureConfig to InfrastructureOptions
   */
  private toInfrastructureOptions(config: InfrastructureConfig, region: string): InfrastructureOptions {
    return {
      region,
      environment: config.metadata?.environment || 'development',
      highAvailability: config.metadata?.scalingPhase === 'scale',
      backupRetention: config.database?.backup?.retentionPeriod || 7,
      monitoringLevel: config.monitoring ? 'standard' : 'basic',
      securityLevel: config.security ? 'standard' : 'basic',
    };
  }

  @Get('available')
  @ApiOperation({ summary: 'Get all available cloud providers' })
  @ApiResponse({
    status: 200,
    description: 'List of available cloud providers',
  })
  getAvailableProviders() {
    return {
      providers: this.providerFactory.getAvailableProviders(),
      total: this.providerFactory.getAvailableProviders().length,
    };
  }

  @Get(':provider/regions')
  @ApiOperation({ summary: 'Get available regions for a cloud provider' })
  @ApiParam({ name: 'provider', enum: ['aws', 'linode'] })
  @ApiResponse({ status: 200, description: 'List of available regions' })
  async getProviderRegions(@Param('provider') provider: string) {
    try {
      const providerInstance =
        this.providerFactory.getValidatedProvider(provider);
      const regions = await providerInstance.getAvailableRegions();

      return {
        provider,
        regions,
        total: regions.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get regions for ${provider}:`, error);
      throw new HttpException(
        `Failed to get regions for provider: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('compare')
  @ApiOperation({ summary: 'Compare costs between cloud providers' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        scalingPhase: { type: 'string', enum: ['launch', 'growth', 'scale'] },
        region: { type: 'string', default: 'us-east-1' },
        config: {
          type: 'object',
          description: 'Infrastructure configuration',
        },
        includeProjections: { type: 'boolean', default: false },
        includeMigrationAnalysis: { type: 'boolean', default: false },
        currentProvider: {
          type: 'string',
          enum: ['aws', 'linode'],
        },
      },
      required: ['scalingPhase', 'region', 'config'],
    },
  })
  @ApiResponse({ status: 200, description: 'Cost comparison report' })
  async compareProviders(
    @Body()
    request: {
      scalingPhase: 'launch' | 'growth' | 'scale';
      region: string;
      config: InfrastructureConfig;
      includeProjections?: boolean;
      includeMigrationAnalysis?: boolean;
      currentProvider?: CloudProviderType;
    },
  ) {
    try {
      const report = await this.costComparison.generateCostComparisonReport({
        scalingPhase: request.scalingPhase,
        region: request.region,
        config: request.config,
        currentProvider: request.currentProvider,
        includeProjections: request.includeProjections || false,
        includeMigrationAnalysis: request.includeMigrationAnalysis || false,
      });

      return {
        success: true,
        data: report,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to compare providers:', error);
      throw new HttpException(
        `Failed to compare providers: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('optimal')
  @ApiOperation({ summary: 'Get optimal cloud provider recommendation' })
  @ApiQuery({ name: 'scalingPhase', enum: ['launch', 'growth', 'scale'] })
  @ApiQuery({
    name: 'region',
    required: false,
    description: 'Deployment region',
  })
  @ApiQuery({ name: 'costOptimization', type: 'boolean', required: false })
  @ApiQuery({
    name: 'performanceRequirements',
    enum: ['low', 'medium', 'high'],
    required: false,
  })
  async getOptimalProvider(
    @Query('scalingPhase') scalingPhase: 'launch' | 'growth' | 'scale',
    @Query('region') region: string = 'us-east-1',
    @Query('costOptimization') costOptimization: boolean = true,
    @Query('performanceRequirements')
    performanceRequirements: 'low' | 'medium' | 'high' = 'medium',
  ) {
    try {
      // Create a basic infrastructure config for the phase
      const config = this.createBasicInfrastructureConfig(scalingPhase);

      const optimalProvider = await this.providerManager.selectOptimalProvider(
        scalingPhase,
        config,
        {
          costOptimization,
          performanceRequirements,
          regionPreferences: [region],
          complianceRequirements: [],
        },
      );

      // Get detailed comparison for context
      const comparison = await this.providerManager.compareProviders(
        scalingPhase,
        config,
        {
          costOptimization,
          performanceRequirements,
          regionPreferences: [region],
          complianceRequirements: [],
        },
      );

      return {
        success: true,
        data: {
          recommendedProvider: optimalProvider,
          scalingPhase,
          region,
          criteria: {
            costOptimization,
            performanceRequirements,
            regionPreferences: [region],
          },
          comparison: comparison.find((c) => c.provider === optimalProvider),
          alternatives: comparison.filter(
            (c) => c.provider !== optimalProvider,
          ),
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to get optimal provider:', error);
      throw new HttpException(
        `Failed to get optimal provider: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':provider/template')
  @ApiOperation({ summary: 'Generate infrastructure template for a provider' })
  @ApiParam({ name: 'provider', enum: ['aws', 'linode'] })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        scalingPhase: { type: 'string', enum: ['launch', 'growth', 'scale'] },
        region: { type: 'string', default: 'us-east-1' },
        config: {
          type: 'object',
          description: 'Infrastructure configuration',
        },
      },
      required: ['scalingPhase', 'region', 'config'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Infrastructure template generated',
  })
  async generateTemplate(
    @Param('provider') provider: string,
    @Body()
    request: {
      scalingPhase: 'launch' | 'growth' | 'scale';
      region: string;
      config: InfrastructureConfig;
    },
  ) {
    try {
      const providerInstance =
        this.providerFactory.getValidatedProvider(provider);
      const phaseConfig = this.getPhaseConfig(request.scalingPhase);
      const options = this.toInfrastructureOptions(request.config, request.region);
      const template = await providerInstance.generateInfrastructureTemplate(
        phaseConfig,
        options,
      );

      return {
        success: true,
        data: template,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to generate template for ${provider}:`, error);
      throw new HttpException(
        `Failed to generate template: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('migration-plan')
  @ApiOperation({ summary: 'Generate migration plan between providers' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        fromProvider: { type: 'string', enum: ['aws', 'linode'] },
        toProvider: { type: 'string', enum: ['aws', 'linode'] },
        scalingPhase: { type: 'string', enum: ['launch', 'growth', 'scale'] },
        config: {
          type: 'object',
          description: 'Infrastructure configuration',
        },
      },
      required: ['fromProvider', 'toProvider', 'scalingPhase', 'config'],
    },
  })
  @ApiResponse({ status: 200, description: 'Migration plan generated' })
  async generateMigrationPlan(
    @Body()
    request: {
      fromProvider: CloudProviderType;
      toProvider: CloudProviderType;
      scalingPhase: 'launch' | 'growth' | 'scale';
      config: InfrastructureConfig;
    },
  ) {
    try {
      if (request.fromProvider === request.toProvider) {
        throw new HttpException(
          'Source and target providers cannot be the same',
          HttpStatus.BAD_REQUEST,
        );
      }

      const migrationPlan = await this.providerManager.switchProvider(
        request.fromProvider,
        request.toProvider,
        request.scalingPhase,
        request.config,
      );

      return {
        success: true,
        data: {
          fromProvider: request.fromProvider,
          toProvider: request.toProvider,
          scalingPhase: request.scalingPhase,
          ...migrationPlan,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to generate migration plan:', error);
      throw new HttpException(
        `Failed to generate migration plan: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('cost-trends/:provider')
  @ApiOperation({ summary: 'Get cost trends for a provider' })
  @ApiParam({ name: 'provider', enum: ['aws', 'linode'] })
  @ApiQuery({ name: 'scalingPhase', enum: ['launch', 'growth', 'scale'] })
  async getCostTrends(
    @Param('provider') provider: string,
    @Query('scalingPhase') scalingPhase: 'launch' | 'growth' | 'scale',
  ) {
    try {
      const providerType = this.providerFactory
        .getValidatedProvider(provider)
        .getProviderName() as CloudProviderType;
      const trends = await this.costComparison.analyzeCostTrends(
        providerType,
        scalingPhase,
      );

      return {
        success: true,
        data: {
          provider: providerType,
          scalingPhase,
          ...trends,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to get cost trends for ${provider}:`, error);
      throw new HttpException(
        `Failed to get cost trends: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('tco-comparison')
  @ApiOperation({ summary: 'Get Total Cost of Ownership comparison' })
  @ApiQuery({ name: 'scalingPhase', enum: ['launch', 'growth', 'scale'] })
  @ApiQuery({ name: 'region', required: false })
  @ApiQuery({ name: 'timeHorizonYears', type: 'number', required: false })
  async getTCOComparison(
    @Query('scalingPhase') scalingPhase: 'launch' | 'growth' | 'scale',
    @Query('region') region: string = 'us-east-1',
    @Query('timeHorizonYears') timeHorizonYears: number = 3,
  ) {
    try {
      const config = this.createBasicInfrastructureConfig(scalingPhase);
      const tco = await this.costComparison.calculateTCO(
        scalingPhase,
        region,
        config,
        timeHorizonYears,
      );

      return {
        success: true,
        data: {
          scalingPhase,
          region,
          timeHorizonYears,
          ...tco,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to calculate TCO:', error);
      throw new HttpException(
        `Failed to calculate TCO: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Create a basic infrastructure configuration for a scaling phase
   */
  private createBasicInfrastructureConfig(
    scalingPhase: 'launch' | 'growth' | 'scale',
  ): InfrastructureConfig {
    const configs = {
      launch: {
        compute: { instanceType: 't3.micro', instanceCount: 1 },
        database: {
          engine: 'postgresql',
          instanceClass: 'db.t3.micro',
          storage: 20,
        },
        cache: { engine: 'redis', nodeType: 'cache.t3.micro', numNodes: 1 },
      },
      growth: {
        compute: { instanceType: 'c5.large', instanceCount: 2 },
        database: {
          engine: 'postgresql',
          instanceClass: 'db.t3.medium',
          storage: 50,
        },
        cache: { engine: 'redis', nodeType: 'cache.m5.large', numNodes: 2 },
      },
      scale: {
        compute: { instanceType: 'c5.xlarge', instanceCount: 6 },
        database: {
          engine: 'postgresql',
          instanceClass: 'db.r5.2xlarge',
          storage: 200,
        },
        cache: { engine: 'redis', nodeType: 'cache.r6g.4xlarge', numNodes: 3 },
      },
    };

    const phaseConfig = configs[scalingPhase];

    return {
      compute: {
        ...phaseConfig.compute,
        autoScaling: {
          enabled: scalingPhase !== 'launch',
          minInstances:
            scalingPhase === 'launch' ? 1 : scalingPhase === 'growth' ? 2 : 3,
          maxInstances:
            scalingPhase === 'launch' ? 3 : scalingPhase === 'growth' ? 6 : 20,
          targetCpuUtilization: 70,
        },
      },
      database: {
        ...phaseConfig.database,
        version: '15.4',
        backupRetention: scalingPhase === 'launch' ? 7 : 14,
        multiAz: scalingPhase !== 'launch',
        readReplicas:
          scalingPhase === 'launch' ? 0 : scalingPhase === 'growth' ? 1 : 2,
      },
      cache: {
        ...phaseConfig.cache,
        version: '7.0',
        replicationEnabled: scalingPhase !== 'launch',
      },
      loadBalancer: {
        type: 'application',
        scheme: 'internet-facing',
        healthCheck: {
          path: '/health',
          interval: 30,
          timeout: 5,
          healthyThreshold: 2,
          unhealthyThreshold: 3,
        },
      },
      storage: {
        type: 'object',
        defaultSize:
          scalingPhase === 'launch'
            ? 100
            : scalingPhase === 'growth'
              ? 500
              : 2000,
        versioning: true,
        encryption: true,
      },
      networking: {
        vpcCidr: '10.0.0.0/16',
        publicSubnets: ['10.0.1.0/24', '10.0.2.0/24', '10.0.3.0/24'],
        privateSubnets: ['10.0.10.0/24', '10.0.11.0/24', '10.0.12.0/24'],
        natGateways:
          scalingPhase === 'launch' ? 1 : scalingPhase === 'growth' ? 2 : 3,
      },
      monitoring: {
        enabled: true,
        retentionDays: scalingPhase === 'launch' ? 7 : 14,
        detailedMonitoring: scalingPhase !== 'launch',
      },
    };
  }
}
