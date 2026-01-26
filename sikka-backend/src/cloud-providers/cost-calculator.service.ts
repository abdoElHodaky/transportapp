import { Injectable, Logger } from '@nestjs/common';
import {
  CloudProviderFactory,
  CloudProviderType,
} from './cloud-provider.factory';
import {
  InfrastructureConfig,
} from './interfaces/infrastructure-config.interface';
import {
  CostEstimate,
  CostCalculationOptions,
} from './interfaces/cloud-provider.interface';
import { ScalingPhasesConfig, ScalingPhaseConfig } from '../config/scaling-phases.config';

export interface CostBreakdownComparison {
  service: string;
  aws: number;
  linode: number;
  savings: number;
  savingsPercentage: number;
}

export interface DetailedCostComparison {
  scalingPhase: 'launch' | 'growth' | 'scale';
  region: string;
  providers: {
    aws: CostEstimate;
    linode: CostEstimate;
  };
  totalSavings: number;
  totalSavingsPercentage: number;
  breakdownComparison: CostBreakdownComparison[];
  recommendation: {
    optimalProvider: CloudProviderType;
    reason: string;
    estimatedMonthlySavings: number;
    estimatedAnnualSavings: number;
  };
}

export interface CostOptimizationSuggestion {
  category:
    | 'compute'
    | 'database'
    | 'cache'
    | 'storage'
    | 'networking'
    | 'monitoring';
  suggestion: string;
  potentialSavings: number;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  provider: CloudProviderType;
}

export interface CostProjection {
  scalingPhase: 'launch' | 'growth' | 'scale';
  timeframe: 'monthly' | 'quarterly' | 'annually';
  provider: CloudProviderType;
  baseCost: number;
  projectedCost: number;
  growthFactor: number;
  assumptions: string[];
}

@Injectable()
export class CostCalculatorService {
  private readonly logger = new Logger(CostCalculatorService.name);

  constructor(
    private readonly providerFactory: CloudProviderFactory,
    private readonly scalingPhasesConfig: ScalingPhasesConfig,
  ) {}

  /**
   * Convert string phase name to ScalingPhaseConfig object
   */
  private getPhaseConfig(phase: 'launch' | 'growth' | 'scale'): ScalingPhaseConfig {
    return this.scalingPhasesConfig.getPhaseConfig(phase);
  }

  /**
   * Convert InfrastructureConfig to CostCalculationOptions
   */
  private toCostCalculationOptions(config: InfrastructureConfig): CostCalculationOptions {
    return {
      includeDataTransfer: true,
      includeBackups: config.database?.backup?.enabled ?? true,
      includeMonitoring: config.monitoring ? true : false,
      usagePattern: config.metadata?.scalingPhase === 'launch' ? 'light' : 
                   config.metadata?.scalingPhase === 'growth' ? 'moderate' : 'heavy',
      reservedInstanceDiscount: config.metadata?.scalingPhase === 'scale',
    };
  }

  /**
   * Compare costs between all providers for a specific configuration
   * @param scalingPhase The scaling phase
   * @param region The deployment region
   * @param config Infrastructure configuration
   * @returns Detailed cost comparison
   */
  async compareProviderCosts(
    scalingPhase: 'launch' | 'growth' | 'scale',
    region: string,
    config: InfrastructureConfig,
  ): Promise<DetailedCostComparison> {
    this.logger.log(`Comparing costs for ${scalingPhase} phase in ${region}`);

    const awsProvider = this.providerFactory.createProvider('aws');
    const linodeProvider = this.providerFactory.createProvider('linode');

    // Get cost estimates from both providers
    const phaseConfig = this.getPhaseConfig(scalingPhase);
    const [awsCost, linodeCost] = await Promise.all([
      awsProvider.calculateCost(phaseConfig, region, this.toCostCalculationOptions(config)),
      linodeProvider.calculateCost(phaseConfig, region, this.toCostCalculationOptions(config)),
    ]);

    // Calculate savings
    const totalSavings = awsCost.totalMonthlyCost - linodeCost.totalMonthlyCost;
    const totalSavingsPercentage =
      (totalSavings / awsCost.totalMonthlyCost) * 100;

    // Create breakdown comparison
    const breakdownComparison = this.createBreakdownComparison(
      awsCost,
      linodeCost,
    );

    // Determine optimal provider and recommendation
    const recommendation = this.generateCostRecommendation(
      awsCost,
      linodeCost,
      totalSavings,
      totalSavingsPercentage,
    );

    return {
      scalingPhase,
      region,
      providers: {
        aws: awsCost,
        linode: linodeCost,
      },
      totalSavings,
      totalSavingsPercentage,
      breakdownComparison,
      recommendation,
    };
  }

  /**
   * Calculate cost projections for different timeframes
   * @param scalingPhase The scaling phase
   * @param provider The cloud provider
   * @param region The deployment region
   * @param config Infrastructure configuration
   * @returns Cost projections
   */
  async calculateCostProjections(
    scalingPhase: 'launch' | 'growth' | 'scale',
    provider: CloudProviderType,
    region: string,
    config: InfrastructureConfig,
  ): Promise<CostProjection[]> {
    this.logger.log(
      `Calculating cost projections for ${provider} in ${scalingPhase} phase`,
    );

    const providerInstance = this.providerFactory.createProvider(provider);
    const baseCost = await providerInstance.calculateCost(
      scalingPhase,
      region,
      config,
    );

    const projections: CostProjection[] = [];
    const timeframes: Array<{
      period: 'monthly' | 'quarterly' | 'annually';
      multiplier: number;
      growthFactor: number;
    }> = [
      { period: 'monthly', multiplier: 1, growthFactor: 1.0 },
      { period: 'quarterly', multiplier: 3, growthFactor: 1.05 }, // 5% growth per quarter
      { period: 'annually', multiplier: 12, growthFactor: 1.2 }, // 20% growth per year
    ];

    for (const timeframe of timeframes) {
      const projectedMonthlyCost =
        baseCost.totalMonthlyCost * timeframe.growthFactor;
      const totalCost = projectedMonthlyCost * timeframe.multiplier;

      projections.push({
        scalingPhase,
        timeframe: timeframe.period,
        provider,
        baseCost: baseCost.totalMonthlyCost,
        projectedCost: totalCost,
        growthFactor: timeframe.growthFactor,
        assumptions: this.getProjectionAssumptions(
          scalingPhase,
          timeframe.period,
        ),
      });
    }

    return projections;
  }

  /**
   * Generate cost optimization suggestions
   * @param scalingPhase The scaling phase
   * @param provider The cloud provider
   * @param costEstimate Current cost estimate
   * @returns Array of optimization suggestions
   */
  async generateOptimizationSuggestions(
    scalingPhase: 'launch' | 'growth' | 'scale',
    provider: CloudProviderType,
    costEstimate: CostEstimate,
  ): Promise<CostOptimizationSuggestion[]> {
    this.logger.log(
      `Generating optimization suggestions for ${provider} in ${scalingPhase} phase`,
    );

    const suggestions: CostOptimizationSuggestion[] = [];

    // Compute optimizations
    suggestions.push(
      ...this.getComputeOptimizations(scalingPhase, provider, costEstimate),
    );

    // Database optimizations
    suggestions.push(
      ...this.getDatabaseOptimizations(scalingPhase, provider, costEstimate),
    );

    // Cache optimizations
    suggestions.push(
      ...this.getCacheOptimizations(scalingPhase, provider, costEstimate),
    );

    // Storage optimizations
    suggestions.push(
      ...this.getStorageOptimizations(scalingPhase, provider, costEstimate),
    );

    // Networking optimizations
    suggestions.push(
      ...this.getNetworkingOptimizations(scalingPhase, provider, costEstimate),
    );

    // Monitoring optimizations
    suggestions.push(
      ...this.getMonitoringOptimizations(scalingPhase, provider, costEstimate),
    );

    // Sort by potential savings (highest first)
    return suggestions.sort((a, b) => b.potentialSavings - a.potentialSavings);
  }

  /**
   * Calculate ROI for switching providers
   * @param fromProvider Current provider
   * @param toProvider Target provider
   * @param scalingPhase The scaling phase
   * @param region The deployment region
   * @param config Infrastructure configuration
   * @param migrationCost One-time migration cost
   * @returns ROI analysis
   */
  async calculateSwitchingROI(
    fromProvider: CloudProviderType,
    toProvider: CloudProviderType,
    scalingPhase: 'launch' | 'growth' | 'scale',
    region: string,
    config: InfrastructureConfig,
    migrationCost: number,
  ): Promise<{
    monthlySavings: number;
    annualSavings: number;
    migrationCost: number;
    paybackPeriodMonths: number;
    threeYearROI: number;
    recommendation: 'switch' | 'stay' | 'evaluate';
    reasoning: string;
  }> {
    this.logger.log(
      `Calculating ROI for switching from ${fromProvider} to ${toProvider}`,
    );

    const fromProviderInstance =
      this.providerFactory.createProvider(fromProvider);
    const toProviderInstance = this.providerFactory.createProvider(toProvider);

    const phaseConfig = this.getPhaseConfig(scalingPhase);
    const [fromCost, toCost] = await Promise.all([
      fromProviderInstance.calculateCost(phaseConfig, region, this.toCostCalculationOptions(config)),
      toProviderInstance.calculateCost(phaseConfig, region, this.toCostCalculationOptions(config)),
    ]);

    const monthlySavings = fromCost.totalMonthlyCost - toCost.totalMonthlyCost;
    const annualSavings = monthlySavings * 12;
    const paybackPeriodMonths = migrationCost / monthlySavings;
    const threeYearSavings = annualSavings * 3;
    const threeYearROI =
      ((threeYearSavings - migrationCost) / migrationCost) * 100;

    let recommendation: 'switch' | 'stay' | 'evaluate';
    let reasoning: string;

    if (monthlySavings <= 0) {
      recommendation = 'stay';
      reasoning = `No cost savings expected. ${toProvider} would cost $${Math.abs(monthlySavings).toFixed(2)} more per month.`;
    } else if (paybackPeriodMonths <= 6) {
      recommendation = 'switch';
      reasoning = `Excellent ROI with payback period of ${paybackPeriodMonths.toFixed(1)} months and 3-year ROI of ${threeYearROI.toFixed(1)}%.`;
    } else if (paybackPeriodMonths <= 12) {
      recommendation = 'evaluate';
      reasoning = `Moderate ROI with payback period of ${paybackPeriodMonths.toFixed(1)} months. Consider other factors like performance and features.`;
    } else {
      recommendation = 'stay';
      reasoning = `Long payback period of ${paybackPeriodMonths.toFixed(1)} months may not justify migration costs.`;
    }

    return {
      monthlySavings,
      annualSavings,
      migrationCost,
      paybackPeriodMonths,
      threeYearROI,
      recommendation,
      reasoning,
    };
  }

  /**
   * Get cost trends and forecasting
   * @param provider The cloud provider
   * @param scalingPhase The scaling phase
   * @param historicalData Historical cost data (if available)
   * @returns Cost trends and forecasts
   */
  async getCostTrends(
    provider: CloudProviderType,
    scalingPhase: 'launch' | 'growth' | 'scale',
    historicalData?: Array<{ month: string; cost: number }>,
  ): Promise<{
    currentTrend: 'increasing' | 'decreasing' | 'stable';
    projectedGrowth: number;
    seasonalFactors: Array<{ month: string; factor: number }>;
    recommendations: string[];
  }> {
    this.logger.log(
      `Analyzing cost trends for ${provider} in ${scalingPhase} phase`,
    );

    // If no historical data, provide general trends based on scaling phase
    if (!historicalData || historicalData.length === 0) {
      return this.getGeneralCostTrends(scalingPhase);
    }

    // Analyze historical data
    const costs = historicalData.map((d) => d.cost);
    const avgGrowth = this.calculateAverageGrowth(costs);

    let currentTrend: 'increasing' | 'decreasing' | 'stable';
    if (avgGrowth > 5) currentTrend = 'increasing';
    else if (avgGrowth < -5) currentTrend = 'decreasing';
    else currentTrend = 'stable';

    const seasonalFactors = this.calculateSeasonalFactors(historicalData);
    const recommendations = this.generateTrendRecommendations(
      currentTrend,
      avgGrowth,
      scalingPhase,
    );

    return {
      currentTrend,
      projectedGrowth: avgGrowth,
      seasonalFactors,
      recommendations,
    };
  }

  private createBreakdownComparison(
    awsCost: CostEstimate,
    linodeCost: CostEstimate,
  ): CostBreakdownComparison[] {
    const services = [
      'compute',
      'database',
      'cache',
      'loadBalancer',
      'storage',
      'networking',
      'monitoring',
    ];

    return services.map((service) => {
      const awsAmount = awsCost.breakdown[service] || 0;
      const linodeAmount = linodeCost.breakdown[service] || 0;
      const savings = awsAmount - linodeAmount;
      const savingsPercentage = awsAmount > 0 ? (savings / awsAmount) * 100 : 0;

      return {
        service,
        aws: awsAmount,
        linode: linodeAmount,
        savings,
        savingsPercentage,
      };
    });
  }

  private generateCostRecommendation(
    awsCost: CostEstimate,
    linodeCost: CostEstimate,
    totalSavings: number,
    totalSavingsPercentage: number,
  ): DetailedCostComparison['recommendation'] {
    const optimalProvider: CloudProviderType =
      totalSavings > 0 ? 'linode' : 'aws';
    const estimatedMonthlySavings = Math.abs(totalSavings);
    const estimatedAnnualSavings = estimatedMonthlySavings * 12;

    let reason: string;
    if (totalSavings > 0) {
      reason = `Linode offers ${totalSavingsPercentage.toFixed(1)}% cost savings (${estimatedMonthlySavings.toFixed(2)}/month) while providing comparable performance and features.`;
    } else {
      reason = `AWS provides better value despite higher costs, offering superior performance, more services, and better enterprise support.`;
    }

    return {
      optimalProvider,
      reason,
      estimatedMonthlySavings,
      estimatedAnnualSavings,
    };
  }

  private getProjectionAssumptions(
    scalingPhase: string,
    timeframe: string,
  ): string[] {
    const baseAssumptions = [
      'Assumes consistent usage patterns',
      'Does not include potential discounts or reserved instance savings',
      'Based on current pricing (subject to change)',
    ];

    const phaseAssumptions = {
      launch: ['Moderate user growth expected', 'Basic feature set'],
      growth: [
        'Steady user base expansion',
        'Additional features and services',
      ],
      scale: ['High traffic volumes', 'Premium performance requirements'],
    };

    const timeframeAssumptions = {
      monthly: ['Short-term projection with minimal growth'],
      quarterly: [
        'Seasonal variations considered',
        '5% quarterly growth assumed',
      ],
      annually: [
        'Long-term growth trends',
        '20% annual growth assumed',
        'Potential for scaling phase transitions',
      ],
    };

    return [
      ...baseAssumptions,
      ...(phaseAssumptions[scalingPhase] || []),
      ...(timeframeAssumptions[timeframe] || []),
    ];
  }

  private getComputeOptimizations(
    scalingPhase: string,
    provider: CloudProviderType,
    costEstimate: CostEstimate,
  ): CostOptimizationSuggestion[] {
    const suggestions: CostOptimizationSuggestion[] = [];

    if (provider === 'aws') {
      suggestions.push({
        category: 'compute',
        suggestion: 'Use Reserved Instances for predictable workloads',
        potentialSavings: costEstimate.breakdown.compute * 0.3,
        effort: 'low',
        impact: 'high',
        provider,
      });

      if (scalingPhase !== 'launch') {
        suggestions.push({
          category: 'compute',
          suggestion: 'Implement Auto Scaling to optimize instance usage',
          potentialSavings: costEstimate.breakdown.compute * 0.15,
          effort: 'medium',
          impact: 'medium',
          provider,
        });
      }
    }

    if (provider === 'linode') {
      suggestions.push({
        category: 'compute',
        suggestion:
          'Consider dedicated CPU instances for consistent performance',
        potentialSavings: costEstimate.breakdown.compute * 0.1,
        effort: 'low',
        impact: 'medium',
        provider,
      });
    }

    return suggestions;
  }

  private getDatabaseOptimizations(
    scalingPhase: string,
    provider: CloudProviderType,
    costEstimate: CostEstimate,
  ): CostOptimizationSuggestion[] {
    const suggestions: CostOptimizationSuggestion[] = [];

    if (costEstimate.breakdown.database > 50) {
      suggestions.push({
        category: 'database',
        suggestion: 'Implement read replicas to distribute load',
        potentialSavings: costEstimate.breakdown.database * 0.2,
        effort: 'medium',
        impact: 'high',
        provider,
      });
    }

    if (provider === 'aws' && scalingPhase !== 'launch') {
      suggestions.push({
        category: 'database',
        suggestion: 'Use RDS Reserved Instances for long-term savings',
        potentialSavings: costEstimate.breakdown.database * 0.25,
        effort: 'low',
        impact: 'high',
        provider,
      });
    }

    return suggestions;
  }

  private getCacheOptimizations(
    scalingPhase: string,
    provider: CloudProviderType,
    costEstimate: CostEstimate,
  ): CostOptimizationSuggestion[] {
    const suggestions: CostOptimizationSuggestion[] = [];

    if (provider === 'linode') {
      suggestions.push({
        category: 'cache',
        suggestion: 'Use self-managed Redis for significant cost savings',
        potentialSavings: costEstimate.breakdown.cache * 0.5,
        effort: 'high',
        impact: 'high',
        provider,
      });
    }

    return suggestions;
  }

  private getStorageOptimizations(
    scalingPhase: string,
    provider: CloudProviderType,
    costEstimate: CostEstimate,
  ): CostOptimizationSuggestion[] {
    const suggestions: CostOptimizationSuggestion[] = [];

    suggestions.push({
      category: 'storage',
      suggestion: 'Implement lifecycle policies for automated archiving',
      potentialSavings: costEstimate.breakdown.storage * 0.3,
      effort: 'low',
      impact: 'medium',
      provider,
    });

    return suggestions;
  }

  private getNetworkingOptimizations(
    scalingPhase: string,
    provider: CloudProviderType,
    costEstimate: CostEstimate,
  ): CostOptimizationSuggestion[] {
    const suggestions: CostOptimizationSuggestion[] = [];

    if (provider === 'linode') {
      suggestions.push({
        category: 'networking',
        suggestion: "Leverage Linode's generous data transfer allowances",
        potentialSavings: costEstimate.breakdown.networking * 0.6,
        effort: 'low',
        impact: 'high',
        provider,
      });
    }

    return suggestions;
  }

  private getMonitoringOptimizations(
    scalingPhase: string,
    provider: CloudProviderType,
    costEstimate: CostEstimate,
  ): CostOptimizationSuggestion[] {
    const suggestions: CostOptimizationSuggestion[] = [];

    if (provider === 'linode') {
      suggestions.push({
        category: 'monitoring',
        suggestion: 'Use Longview free tier for basic monitoring',
        potentialSavings: costEstimate.breakdown.monitoring * 0.8,
        effort: 'low',
        impact: 'medium',
        provider,
      });
    }

    return suggestions;
  }

  private calculateAverageGrowth(costs: number[]): number {
    if (costs.length < 2) return 0;

    let totalGrowth = 0;
    for (let i = 1; i < costs.length; i++) {
      const growth = ((costs[i] - costs[i - 1]) / costs[i - 1]) * 100;
      totalGrowth += growth;
    }

    return totalGrowth / (costs.length - 1);
  }

  private calculateSeasonalFactors(
    historicalData: Array<{ month: string; cost: number }>,
  ): Array<{ month: string; factor: number }> {
    // Simple seasonal analysis - in a real implementation, this would be more sophisticated
    const monthlyAverages = new Map<string, number>();

    historicalData.forEach((data) => {
      const month = data.month.substring(5, 7); // Extract month from YYYY-MM format
      if (!monthlyAverages.has(month)) {
        monthlyAverages.set(month, 0);
      }
      monthlyAverages.set(month, monthlyAverages.get(month)! + data.cost);
    });

    const overallAverage =
      historicalData.reduce((sum, data) => sum + data.cost, 0) /
      historicalData.length;

    return Array.from(monthlyAverages.entries()).map(([month, total]) => ({
      month,
      factor: total / overallAverage,
    }));
  }

  private generateTrendRecommendations(
    trend: 'increasing' | 'decreasing' | 'stable',
    growth: number,
    scalingPhase: string,
  ): string[] {
    const recommendations: string[] = [];

    switch (trend) {
      case 'increasing':
        recommendations.push(
          'Monitor resource utilization to identify optimization opportunities',
        );
        recommendations.push('Consider implementing cost alerts and budgets');
        if (growth > 20) {
          recommendations.push(
            'Evaluate if current scaling phase is appropriate',
          );
        }
        break;
      case 'decreasing':
        recommendations.push(
          'Excellent cost management - maintain current practices',
        );
        recommendations.push(
          'Consider reinvesting savings in performance improvements',
        );
        break;
      case 'stable':
        recommendations.push('Costs are well-controlled');
        recommendations.push(
          'Look for opportunities to optimize without impacting performance',
        );
        break;
    }

    return recommendations;
  }

  private getGeneralCostTrends(scalingPhase: string): {
    currentTrend: 'increasing' | 'decreasing' | 'stable';
    projectedGrowth: number;
    seasonalFactors: Array<{ month: string; factor: number }>;
    recommendations: string[];
  } {
    const trends = {
      launch: {
        currentTrend: 'increasing' as const,
        projectedGrowth: 15,
        recommendations: [
          'Expect moderate cost increases as user base grows',
          'Focus on cost-effective solutions during initial phase',
          'Monitor usage patterns to optimize resource allocation',
        ],
      },
      growth: {
        currentTrend: 'increasing' as const,
        projectedGrowth: 25,
        recommendations: [
          'Significant growth expected - plan for scaling costs',
          'Implement cost monitoring and alerting',
          'Consider reserved instances for predictable workloads',
        ],
      },
      scale: {
        currentTrend: 'stable' as const,
        projectedGrowth: 10,
        recommendations: [
          'Costs should stabilize with mature infrastructure',
          'Focus on optimization and efficiency improvements',
          'Leverage economies of scale for better pricing',
        ],
      },
    };

    const seasonalFactors = [
      { month: '01', factor: 0.9 },
      { month: '02', factor: 0.9 },
      { month: '03', factor: 1.0 },
      { month: '04', factor: 1.0 },
      { month: '05', factor: 1.1 },
      { month: '06', factor: 1.1 },
      { month: '07', factor: 1.2 },
      { month: '08', factor: 1.2 },
      { month: '09', factor: 1.1 },
      { month: '10', factor: 1.0 },
      { month: '11', factor: 1.3 },
      { month: '12', factor: 1.2 },
    ];

    return {
      ...trends[scalingPhase],
      seasonalFactors,
    };
  }
}
