import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import {
  CloudProviderFactory,
  CloudProviderType,
} from './cloud-provider.factory';
import { CloudProviderInterface } from './interfaces/cloud-provider.interface';
import {
  InfrastructureConfig,
  CloudRegion,
  InfrastructureTemplate,
  ServiceRecommendation,
} from './interfaces/infrastructure-config.interface';
import {
  CostEstimate,
} from './interfaces/cloud-provider.interface';
import { CloudProvidersConfig } from '../config/cloud-providers.config';
import { ScalingPhasesConfig, ScalingPhaseConfig } from '../config/scaling-phases.config';

export interface ProviderSelectionCriteria {
  costOptimization: boolean;
  performanceRequirements: 'low' | 'medium' | 'high';
  regionPreferences: string[];
  complianceRequirements: string[];
  preferredProvider?: CloudProviderType;
  fallbackProvider?: CloudProviderType;
}

export interface ProviderComparison {
  provider: CloudProviderType;
  costEstimate: CostEstimate;
  recommendations: ServiceRecommendation[];
  regions: CloudRegion[];
  score: number;
  pros: string[];
  cons: string[];
}

@Injectable()
export class CloudProviderManagerService {
  private readonly logger = new Logger(CloudProviderManagerService.name);

  constructor(
    private readonly providerFactory: CloudProviderFactory,
    private readonly cloudProvidersConfig: CloudProvidersConfig,
    private readonly scalingPhasesConfig: ScalingPhasesConfig,
  ) {}

  /**
   * Convert string phase name to ScalingPhaseConfig object
   */
  private getPhaseConfig(phase: 'launch' | 'growth' | 'scale'): ScalingPhaseConfig {
    return this.scalingPhasesConfig.getPhaseConfig(phase);
  }

  /**
   * Select the optimal cloud provider based on criteria
   * @param scalingPhase The scaling phase
   * @param config Infrastructure configuration
   * @param criteria Selection criteria
   * @returns Optimal provider type
   */
  async selectOptimalProvider(
    scalingPhase: 'launch' | 'growth' | 'scale',
    config: InfrastructureConfig,
    criteria: ProviderSelectionCriteria,
  ): Promise<CloudProviderType> {
    this.logger.log(`Selecting optimal provider for ${scalingPhase} phase`);

    // If preferred provider is specified, validate and return it
    if (criteria.preferredProvider) {
      if (
        this.providerFactory.isProviderSupported(criteria.preferredProvider)
      ) {
        this.logger.log(
          `Using preferred provider: ${criteria.preferredProvider}`,
        );
        return criteria.preferredProvider;
      } else {
        this.logger.warn(
          `Preferred provider ${criteria.preferredProvider} not supported`,
        );
      }
    }

    // Get all provider comparisons
    const comparisons = await this.compareProviders(
      scalingPhase,
      config,
      criteria,
    );

    // Sort by score (highest first)
    comparisons.sort((a, b) => b.score - a.score);

    const optimalProvider = comparisons[0];
    this.logger.log(
      `Selected optimal provider: ${optimalProvider.provider} (score: ${optimalProvider.score})`,
    );

    return optimalProvider.provider;
  }

  /**
   * Compare all available cloud providers
   * @param scalingPhase The scaling phase
   * @param config Infrastructure configuration
   * @param criteria Selection criteria
   * @returns Array of provider comparisons
   */
  async compareProviders(
    scalingPhase: 'launch' | 'growth' | 'scale',
    config: InfrastructureConfig,
    criteria: ProviderSelectionCriteria,
  ): Promise<ProviderComparison[]> {
    this.logger.log(`Comparing providers for ${scalingPhase} phase`);

    const providers = this.providerFactory.getAvailableProviders();
    const comparisons: ProviderComparison[] = [];

    for (const providerType of providers) {
      try {
        const comparison = await this.evaluateProvider(
          providerType,
          scalingPhase,
          config,
          criteria,
        );
        comparisons.push(comparison);
      } catch (error) {
        this.logger.error(
          `Failed to evaluate provider ${providerType}:`,
          error,
        );
      }
    }

    return comparisons;
  }

  /**
   * Get cost estimates from all providers
   * @param scalingPhase The scaling phase
   * @param region The deployment region
   * @param config Infrastructure configuration
   * @returns Map of provider to cost estimate
   */
  async getCostEstimates(
    scalingPhase: 'launch' | 'growth' | 'scale',
    region: string,
    config: InfrastructureConfig,
  ): Promise<Map<CloudProviderType, CostEstimate>> {
    this.logger.log(
      `Getting cost estimates for ${scalingPhase} phase in ${region}`,
    );

    const providers = this.providerFactory.getAllProviders();
    const costEstimates = new Map<CloudProviderType, CostEstimate>();

    for (const [providerType, provider] of providers) {
      try {
        const phaseConfig = this.getPhaseConfig(scalingPhase);
        const estimate = await provider.calculateCost(
          phaseConfig,
          region,
          config,
        );
        costEstimates.set(providerType, estimate);
      } catch (error) {
        this.logger.error(
          `Failed to get cost estimate from ${providerType}:`,
          error,
        );
      }
    }

    return costEstimates;
  }

  /**
   * Generate infrastructure templates for all providers
   * @param scalingPhase The scaling phase
   * @param region The deployment region
   * @param config Infrastructure configuration
   * @returns Map of provider to infrastructure template
   */
  async generateAllTemplates(
    scalingPhase: 'launch' | 'growth' | 'scale',
    region: string,
    config: InfrastructureConfig,
  ): Promise<Map<CloudProviderType, InfrastructureTemplate>> {
    this.logger.log(
      `Generating templates for ${scalingPhase} phase in ${region}`,
    );

    const providers = this.providerFactory.getAllProviders();
    const templates = new Map<CloudProviderType, InfrastructureTemplate>();

    for (const [providerType, provider] of providers) {
      try {
        const template = await provider.generateInfrastructureTemplate(
          scalingPhase,
          region,
          config,
        );
        templates.set(providerType, template);
      } catch (error) {
        this.logger.error(
          `Failed to generate template for ${providerType}:`,
          error,
        );
      }
    }

    return templates;
  }

  /**
   * Get available regions from all providers
   * @returns Map of provider to available regions
   */
  async getAllAvailableRegions(): Promise<
    Map<CloudProviderType, CloudRegion[]>
  > {
    this.logger.log('Getting available regions from all providers');

    const providers = this.providerFactory.getAllProviders();
    const regions = new Map<CloudProviderType, CloudRegion[]>();

    for (const [providerType, provider] of providers) {
      try {
        const providerRegions = await provider.getAvailableRegions();
        regions.set(providerType, providerRegions);
      } catch (error) {
        this.logger.error(`Failed to get regions from ${providerType}:`, error);
      }
    }

    return regions;
  }

  /**
   * Switch between cloud providers
   * @param fromProvider Current provider
   * @param toProvider Target provider
   * @param scalingPhase The scaling phase
   * @param config Infrastructure configuration
   * @returns Migration plan
   */
  async switchProvider(
    fromProvider: CloudProviderType,
    toProvider: CloudProviderType,
    scalingPhase: 'launch' | 'growth' | 'scale',
    config: InfrastructureConfig,
  ): Promise<{
    migrationSteps: string[];
    estimatedDowntime: string;
    costImpact: {
      from: CostEstimate;
      to: CostEstimate;
      savings: number;
    };
  }> {
    this.logger.log(`Planning switch from ${fromProvider} to ${toProvider}`);

    const fromProviderInstance =
      this.providerFactory.createProvider(fromProvider);
    const toProviderInstance = this.providerFactory.createProvider(toProvider);

    // Get cost estimates for comparison
    const fromCost = await fromProviderInstance.calculateCost(
      scalingPhase,
      'us-east-1',
      config,
    );
    const toCost = await toProviderInstance.calculateCost(
      scalingPhase,
      'us-east-1',
      config,
    );
    const savings = fromCost.totalMonthlyCost - toCost.totalMonthlyCost;

    // Generate migration steps
    const migrationSteps = this.generateMigrationSteps(
      fromProvider,
      toProvider,
      scalingPhase,
    );

    return {
      migrationSteps,
      estimatedDowntime: this.estimateDowntime(scalingPhase),
      costImpact: {
        from: fromCost,
        to: toCost,
        savings,
      },
    };
  }

  /**
   * Validate configuration across all providers
   * @param config Infrastructure configuration
   * @returns Map of provider to validation results
   */
  async validateConfigurationAcrossProviders(
    config: InfrastructureConfig,
  ): Promise<
    Map<
      CloudProviderType,
      { valid: boolean; errors: string[]; warnings: string[] }
    >
  > {
    this.logger.log('Validating configuration across all providers');

    const providers = this.providerFactory.getAllProviders();
    const validationResults = new Map();

    for (const [providerType, provider] of providers) {
      try {
        const result = await provider.validateConfiguration(config);
        validationResults.set(providerType, result);
      } catch (error) {
        this.logger.error(
          `Failed to validate configuration for ${providerType}:`,
          error,
        );
        validationResults.set(providerType, {
          valid: false,
          errors: [`Validation failed: ${error.message}`],
          warnings: [],
        });
      }
    }

    return validationResults;
  }

  private async evaluateProvider(
    providerType: CloudProviderType,
    scalingPhase: 'launch' | 'growth' | 'scale',
    config: InfrastructureConfig,
    criteria: ProviderSelectionCriteria,
  ): Promise<ProviderComparison> {
    const provider = this.providerFactory.createProvider(providerType);

    // Get provider data
    const phaseConfig = this.getPhaseConfig(scalingPhase);
    const [costEstimate, recommendations, regions] = await Promise.all([
      provider.calculateCost(phaseConfig, 'us-east-1', config),
      provider.getServiceRecommendations(phaseConfig, config),
      provider.getAvailableRegions(),
    ]);

    // Calculate score based on criteria
    let score = 0;
    const pros: string[] = [];
    const cons: string[] = [];

    // Cost optimization scoring
    if (criteria.costOptimization) {
      const costScore = this.calculateCostScore(
        providerType,
        costEstimate.totalMonthlyCost,
      );
      score += costScore * 0.4; // 40% weight for cost

      if (costScore > 7) {
        pros.push('Excellent cost optimization');
      } else if (costScore < 5) {
        cons.push('Higher costs compared to alternatives');
      }
    }

    // Performance scoring
    const performanceScore = this.calculatePerformanceScore(
      providerType,
      criteria.performanceRequirements,
    );
    score += performanceScore * 0.3; // 30% weight for performance

    if (performanceScore > 7) {
      pros.push('High performance capabilities');
    } else if (performanceScore < 5) {
      cons.push('Limited performance options');
    }

    // Region availability scoring
    const regionScore = this.calculateRegionScore(
      regions,
      criteria.regionPreferences,
    );
    score += regionScore * 0.2; // 20% weight for regions

    if (regionScore > 7) {
      pros.push('Excellent regional coverage');
    } else if (regionScore < 5) {
      cons.push('Limited regional availability');
    }

    // Feature completeness scoring
    const featureScore = this.calculateFeatureScore(providerType);
    score += featureScore * 0.1; // 10% weight for features

    if (featureScore > 7) {
      pros.push('Comprehensive feature set');
    } else if (featureScore < 5) {
      cons.push('Limited feature offerings');
    }

    return {
      provider: providerType,
      costEstimate,
      recommendations,
      regions,
      score: Math.round(score * 10) / 10, // Round to 1 decimal place
      pros,
      cons,
    };
  }

  private calculateCostScore(
    provider: CloudProviderType,
    monthlyCost: number,
  ): number {
    // Linode generally offers better pricing, AWS has premium pricing
    const baseCosts = {
      linode: 100, // Baseline cost for comparison
      aws: 130, // AWS typically 30% more expensive
    };

    const expectedCost = baseCosts[provider] || 115;
    const costRatio = expectedCost / monthlyCost;

    // Score from 1-10, where lower cost = higher score
    return Math.min(10, Math.max(1, costRatio * 5));
  }

  private calculatePerformanceScore(
    provider: CloudProviderType,
    requirements: string,
  ): number {
    const performanceRatings = {
      aws: { low: 8, medium: 9, high: 10 },
      linode: { low: 9, medium: 8, high: 7 },
    };

    return performanceRatings[provider]?.[requirements] || 5;
  }

  private calculateRegionScore(
    regions: CloudRegion[],
    preferences: string[],
  ): number {
    if (preferences.length === 0) return 8; // No preference, good score

    const availableRegions = regions.map((r) => r.id);
    const matchingRegions = preferences.filter((pref) =>
      availableRegions.some((region) => region.includes(pref)),
    );

    const matchRatio = matchingRegions.length / preferences.length;
    return Math.round(matchRatio * 10);
  }

  private calculateFeatureScore(provider: CloudProviderType): number {
    // AWS has more services, Linode has simpler but sufficient offerings
    const featureRatings = {
      aws: 10, // Comprehensive service catalog
      linode: 7, // Essential services with good quality
    };

    return featureRatings[provider] || 5;
  }

  private generateMigrationSteps(
    fromProvider: CloudProviderType,
    toProvider: CloudProviderType,
    scalingPhase: string,
  ): string[] {
    return [
      `1. Backup all data from ${fromProvider} infrastructure`,
      `2. Provision new infrastructure on ${toProvider}`,
      `3. Set up data replication between providers`,
      `4. Update DNS records to point to ${toProvider} load balancer`,
      `5. Migrate application data and configurations`,
      `6. Update monitoring and alerting systems`,
      `7. Perform comprehensive testing on ${toProvider}`,
      `8. Switch traffic to ${toProvider} infrastructure`,
      `9. Monitor system performance and stability`,
      `10. Decommission ${fromProvider} resources after validation`,
    ];
  }

  private estimateDowntime(scalingPhase: string): string {
    const downtimeEstimates = {
      launch: '2-4 hours',
      growth: '4-6 hours',
      scale: '6-8 hours',
    };

    return downtimeEstimates[scalingPhase] || '4-6 hours';
  }
}
