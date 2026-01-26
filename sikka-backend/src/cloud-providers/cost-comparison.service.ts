import { Injectable, Logger } from '@nestjs/common';
import { CostCalculatorService, DetailedCostComparison, CostOptimizationSuggestion, CostProjection } from './cost-calculator.service';
import { CloudProviderManagerService, ProviderComparison } from './cloud-provider-manager.service';
import { InfrastructureConfig } from './interfaces/infrastructure-config.interface';
import { CloudProviderType } from './cloud-provider.factory';

export interface CostComparisonReport {
  summary: {
    recommendedProvider: CloudProviderType;
    potentialMonthlySavings: number;
    potentialAnnualSavings: number;
    confidenceLevel: 'high' | 'medium' | 'low';
  };
  detailedComparison: DetailedCostComparison;
  providerComparison: ProviderComparison[];
  optimizationSuggestions: CostOptimizationSuggestion[];
  projections: {
    aws: CostProjection[];
    linode: CostProjection[];
  };
  migrationAnalysis?: {
    estimatedMigrationCost: number;
    paybackPeriod: number;
    roi: number;
    recommendation: 'migrate' | 'stay' | 'evaluate';
  };
}

export interface CostAnalysisRequest {
  scalingPhase: 'launch' | 'growth' | 'scale';
  region: string;
  config: InfrastructureConfig;
  currentProvider?: CloudProviderType;
  includeProjections?: boolean;
  includeMigrationAnalysis?: boolean;
}

@Injectable()
export class CostComparisonService {
  private readonly logger = new Logger(CostComparisonService.name);

  constructor(
    private readonly costCalculator: CostCalculatorService,
    private readonly providerManager: CloudProviderManagerService,
  ) {}

  /**
   * Generate comprehensive cost comparison report
   * @param request Cost analysis request parameters
   * @returns Complete cost comparison report
   */
  async generateCostComparisonReport(request: CostAnalysisRequest): Promise<CostComparisonReport> {
    this.logger.log(`Generating cost comparison report for ${request.scalingPhase} phase`);

    // Get detailed cost comparison
    const detailedComparison = await this.costCalculator.compareProviderCosts(
      request.scalingPhase,
      request.region,
      request.config
    );

    // Get provider comparison with scoring
    const providerComparison = await this.providerManager.compareProviders(
      request.scalingPhase,
      request.config,
      {
        costOptimization: true,
        performanceRequirements: this.getPerformanceRequirements(request.scalingPhase),
        regionPreferences: [request.region],
        complianceRequirements: []
      }
    );

    // Generate optimization suggestions for both providers
    const awsOptimizations = await this.costCalculator.generateOptimizationSuggestions(
      request.scalingPhase,
      'aws',
      detailedComparison.providers.aws
    );

    const linodeOptimizations = await this.costCalculator.generateOptimizationSuggestions(
      request.scalingPhase,
      'linode',
      detailedComparison.providers.linode
    );

    const optimizationSuggestions = [...awsOptimizations, ...linodeOptimizations]
      .sort((a, b) => b.potentialSavings - a.potentialSavings)
      .slice(0, 10); // Top 10 suggestions

    // Generate projections if requested
    let projections: { aws: CostProjection[]; linode: CostProjection[] } = { aws: [], linode: [] };
    if (request.includeProjections) {
      const [awsProjections, linodeProjections] = await Promise.all([
        this.costCalculator.calculateCostProjections(request.scalingPhase, 'aws', request.region, request.config),
        this.costCalculator.calculateCostProjections(request.scalingPhase, 'linode', request.region, request.config)
      ]);
      projections = { aws: awsProjections, linode: linodeProjections };
    }

    // Generate migration analysis if requested
    let migrationAnalysis;
    if (request.includeMigrationAnalysis && request.currentProvider) {
      const targetProvider = request.currentProvider === 'aws' ? 'linode' : 'aws';
      const migrationCost = this.estimateMigrationCost(request.scalingPhase, request.currentProvider, targetProvider);
      
      const roiAnalysis = await this.costCalculator.calculateSwitchingROI(
        request.currentProvider,
        targetProvider,
        request.scalingPhase,
        request.region,
        request.config,
        migrationCost
      );

      migrationAnalysis = {
        estimatedMigrationCost: migrationCost,
        paybackPeriod: roiAnalysis.paybackPeriodMonths,
        roi: roiAnalysis.threeYearROI,
        recommendation: roiAnalysis.recommendation === 'switch' ? 'migrate' as const : 
                      roiAnalysis.recommendation === 'stay' ? 'stay' as const : 'evaluate' as const
      };
    }

    // Generate summary
    const summary = this.generateSummary(detailedComparison, providerComparison);

    return {
      summary,
      detailedComparison,
      providerComparison,
      optimizationSuggestions,
      projections,
      migrationAnalysis
    };
  }

  /**
   * Compare costs across multiple scaling phases
   * @param region The deployment region
   * @param config Infrastructure configuration
   * @returns Cost comparison across phases
   */
  async compareAcrossScalingPhases(
    region: string,
    config: InfrastructureConfig
  ): Promise<{
    phases: Array<{
      phase: 'launch' | 'growth' | 'scale';
      aws: number;
      linode: number;
      savings: number;
      savingsPercentage: number;
    }>;
    totalSavings: {
      monthly: number;
      annual: number;
    };
    recommendations: string[];
  }> {
    this.logger.log('Comparing costs across all scaling phases');

    const phases: ('launch' | 'growth' | 'scale')[] = ['launch', 'growth', 'scale'];
    const phaseComparisons = [];
    let totalMonthlySavings = 0;

    for (const phase of phases) {
      const comparison = await this.costCalculator.compareProviderCosts(phase, region, config);
      
      phaseComparisons.push({
        phase,
        aws: comparison.providers.aws.totalMonthlyCost,
        linode: comparison.providers.linode.totalMonthlyCost,
        savings: comparison.totalSavings,
        savingsPercentage: comparison.totalSavingsPercentage
      });

      totalMonthlySavings += comparison.totalSavings;
    }

    const recommendations = this.generatePhaseRecommendations(phaseComparisons);

    return {
      phases: phaseComparisons,
      totalSavings: {
        monthly: totalMonthlySavings,
        annual: totalMonthlySavings * 12
      },
      recommendations
    };
  }

  /**
   * Analyze cost trends and provide forecasting
   * @param provider The cloud provider
   * @param scalingPhase The scaling phase
   * @param historicalData Optional historical cost data
   * @returns Cost trend analysis
   */
  async analyzeCostTrends(
    provider: CloudProviderType,
    scalingPhase: 'launch' | 'growth' | 'scale',
    historicalData?: Array<{ month: string; cost: number }>
  ): Promise<{
    trends: Awaited<ReturnType<typeof this.costCalculator.getCostTrends>>;
    forecast: Array<{ month: string; projectedCost: number; confidence: number }>;
    alerts: Array<{ type: 'warning' | 'info'; message: string }>;
  }> {
    this.logger.log(`Analyzing cost trends for ${provider} in ${scalingPhase} phase`);

    const trends = await this.costCalculator.getCostTrends(provider, scalingPhase, historicalData);
    
    // Generate 6-month forecast
    const forecast = this.generateCostForecast(trends, historicalData);
    
    // Generate alerts based on trends
    const alerts = this.generateCostAlerts(trends, forecast);

    return {
      trends,
      forecast,
      alerts
    };
  }

  /**
   * Calculate total cost of ownership (TCO) comparison
   * @param scalingPhase The scaling phase
   * @param region The deployment region
   * @param config Infrastructure configuration
   * @param timeHorizonYears Time horizon for TCO calculation
   * @returns TCO comparison
   */
  async calculateTCO(
    scalingPhase: 'launch' | 'growth' | 'scale',
    region: string,
    config: InfrastructureConfig,
    timeHorizonYears: number = 3
  ): Promise<{
    aws: {
      infrastructureCosts: number;
      operationalCosts: number;
      migrationCosts: number;
      totalTCO: number;
    };
    linode: {
      infrastructureCosts: number;
      operationalCosts: number;
      migrationCosts: number;
      totalTCO: number;
    };
    savings: number;
    savingsPercentage: number;
    breakdownByYear: Array<{
      year: number;
      aws: number;
      linode: number;
      cumulativeSavings: number;
    }>;
  }> {
    this.logger.log(`Calculating ${timeHorizonYears}-year TCO for ${scalingPhase} phase`);

    const comparison = await this.costCalculator.compareProviderCosts(scalingPhase, region, config);
    
    const awsAnnualCost = comparison.providers.aws.totalMonthlyCost * 12;
    const linodeAnnualCost = comparison.providers.linode.totalMonthlyCost * 12;

    // Calculate operational costs (estimated as 20% of infrastructure costs)
    const awsOperationalCosts = awsAnnualCost * 0.2 * timeHorizonYears;
    const linodeOperationalCosts = linodeAnnualCost * 0.2 * timeHorizonYears;

    // Estimate migration costs
    const awsMigrationCosts = this.estimateMigrationCost(scalingPhase, 'linode', 'aws');
    const linodeMigrationCosts = this.estimateMigrationCost(scalingPhase, 'aws', 'linode');

    const awsTCO = {
      infrastructureCosts: awsAnnualCost * timeHorizonYears,
      operationalCosts: awsOperationalCosts,
      migrationCosts: awsMigrationCosts,
      totalTCO: (awsAnnualCost * timeHorizonYears) + awsOperationalCosts + awsMigrationCosts
    };

    const linodeTCO = {
      infrastructureCosts: linodeAnnualCost * timeHorizonYears,
      operationalCosts: linodeOperationalCosts,
      migrationCosts: linodeMigrationCosts,
      totalTCO: (linodeAnnualCost * timeHorizonYears) + linodeOperationalCosts + linodeMigrationCosts
    };

    const savings = awsTCO.totalTCO - linodeTCO.totalTCO;
    const savingsPercentage = (savings / awsTCO.totalTCO) * 100;

    // Generate year-by-year breakdown
    const breakdownByYear = [];
    let cumulativeSavings = 0;

    for (let year = 1; year <= timeHorizonYears; year++) {
      const yearlyAWS = awsAnnualCost + (awsOperationalCosts / timeHorizonYears) + (year === 1 ? awsMigrationCosts : 0);
      const yearlyLinode = linodeAnnualCost + (linodeOperationalCosts / timeHorizonYears) + (year === 1 ? linodeMigrationCosts : 0);
      cumulativeSavings += (yearlyAWS - yearlyLinode);

      breakdownByYear.push({
        year,
        aws: yearlyAWS,
        linode: yearlyLinode,
        cumulativeSavings
      });
    }

    return {
      aws: awsTCO,
      linode: linodeTCO,
      savings,
      savingsPercentage,
      breakdownByYear
    };
  }

  private generateSummary(
    detailedComparison: DetailedCostComparison,
    providerComparison: ProviderComparison[]
  ): CostComparisonReport['summary'] {
    const recommendedProvider = detailedComparison.recommendation.optimalProvider;
    const potentialMonthlySavings = detailedComparison.recommendation.estimatedMonthlySavings;
    const potentialAnnualSavings = detailedComparison.recommendation.estimatedAnnualSavings;

    // Determine confidence level based on savings percentage and provider scores
    let confidenceLevel: 'high' | 'medium' | 'low';
    const savingsPercentage = Math.abs(detailedComparison.totalSavingsPercentage);
    const providerScore = providerComparison.find(p => p.provider === recommendedProvider)?.score || 0;

    if (savingsPercentage > 20 && providerScore > 8) {
      confidenceLevel = 'high';
    } else if (savingsPercentage > 10 && providerScore > 6) {
      confidenceLevel = 'medium';
    } else {
      confidenceLevel = 'low';
    }

    return {
      recommendedProvider,
      potentialMonthlySavings,
      potentialAnnualSavings,
      confidenceLevel
    };
  }

  private getPerformanceRequirements(scalingPhase: string): 'low' | 'medium' | 'high' {
    switch (scalingPhase) {
      case 'launch': return 'low';
      case 'growth': return 'medium';
      case 'scale': return 'high';
      default: return 'medium';
    }
  }

  private estimateMigrationCost(
    scalingPhase: string,
    fromProvider: CloudProviderType,
    toProvider: CloudProviderType
  ): number {
    // Base migration costs by scaling phase
    const baseCosts = {
      launch: 2000,   // Simpler migration
      growth: 5000,   // More complex with additional services
      scale: 10000    // Complex migration with high availability requirements
    };

    // Provider-specific multipliers
    const providerMultipliers = {
      'aws-to-linode': 0.8,  // Slightly easier due to simpler Linode setup
      'linode-to-aws': 1.2   // More complex due to AWS service complexity
    };

    const migrationKey = `${fromProvider}-to-${toProvider}` as keyof typeof providerMultipliers;
    const multiplier = providerMultipliers[migrationKey] || 1.0;

    return baseCosts[scalingPhase] * multiplier;
  }

  private generatePhaseRecommendations(
    phaseComparisons: Array<{
      phase: 'launch' | 'growth' | 'scale';
      aws: number;
      linode: number;
      savings: number;
      savingsPercentage: number;
    }>
  ): string[] {
    const recommendations: string[] = [];

    // Analyze savings across phases
    const avgSavingsPercentage = phaseComparisons.reduce((sum, p) => sum + p.savingsPercentage, 0) / phaseComparisons.length;
    
    if (avgSavingsPercentage > 20) {
      recommendations.push('Linode offers consistent cost advantages across all scaling phases');
      recommendations.push('Consider migrating to Linode for significant long-term savings');
    } else if (avgSavingsPercentage > 10) {
      recommendations.push('Moderate cost savings available with Linode');
      recommendations.push('Evaluate migration based on other factors like performance and features');
    } else {
      recommendations.push('Cost differences are minimal between providers');
      recommendations.push('Focus on performance, features, and operational considerations');
    }

    // Phase-specific recommendations
    const launchPhase = phaseComparisons.find(p => p.phase === 'launch');
    if (launchPhase && launchPhase.savingsPercentage > 25) {
      recommendations.push('Launch phase shows excellent cost optimization potential with Linode');
    }

    const scalePhase = phaseComparisons.find(p => p.phase === 'scale');
    if (scalePhase && scalePhase.savings > 500) {
      recommendations.push('Scale phase offers substantial absolute savings opportunities');
    }

    return recommendations;
  }

  private generateCostForecast(
    trends: Awaited<ReturnType<typeof this.costCalculator.getCostTrends>>,
    historicalData?: Array<{ month: string; cost: number }>
  ): Array<{ month: string; projectedCost: number; confidence: number }> {
    const forecast = [];
    const currentDate = new Date();
    const baseCost = historicalData && historicalData.length > 0 
      ? historicalData[historicalData.length - 1].cost 
      : 100; // Default base cost

    for (let i = 1; i <= 6; i++) {
      const forecastDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      const monthKey = forecastDate.toISOString().substring(5, 7);
      
      // Apply seasonal factor
      const seasonalFactor = trends.seasonalFactors.find(f => f.month === monthKey)?.factor || 1.0;
      
      // Apply growth trend
      const growthFactor = 1 + (trends.projectedGrowth / 100) * (i / 12); // Proportional monthly growth
      
      const projectedCost = baseCost * seasonalFactor * growthFactor;
      
      // Confidence decreases over time
      const confidence = Math.max(0.5, 1 - (i * 0.1));

      forecast.push({
        month: forecastDate.toISOString().substring(0, 7),
        projectedCost: Math.round(projectedCost * 100) / 100,
        confidence: Math.round(confidence * 100) / 100
      });
    }

    return forecast;
  }

  private generateCostAlerts(
    trends: Awaited<ReturnType<typeof this.costCalculator.getCostTrends>>,
    forecast: Array<{ month: string; projectedCost: number; confidence: number }>
  ): Array<{ type: 'warning' | 'info'; message: string }> {
    const alerts = [];

    // Trend-based alerts
    if (trends.currentTrend === 'increasing' && trends.projectedGrowth > 20) {
      alerts.push({
        type: 'warning' as const,
        message: `High cost growth rate detected (${trends.projectedGrowth.toFixed(1)}% projected). Consider optimization measures.`
      });
    }

    // Forecast-based alerts
    const maxForecastCost = Math.max(...forecast.map(f => f.projectedCost));
    const minForecastCost = Math.min(...forecast.map(f => f.projectedCost));
    const forecastVariation = ((maxForecastCost - minForecastCost) / minForecastCost) * 100;

    if (forecastVariation > 30) {
      alerts.push({
        type: 'warning' as const,
        message: `High cost variation expected (${forecastVariation.toFixed(1)}%). Plan for seasonal budget adjustments.`
      });
    }

    // Seasonal alerts
    const highSeasonalMonths = trends.seasonalFactors.filter(f => f.factor > 1.2);
    if (highSeasonalMonths.length > 0) {
      alerts.push({
        type: 'info' as const,
        message: `Higher costs expected in months: ${highSeasonalMonths.map(m => m.month).join(', ')}. Plan accordingly.`
      });
    }

    return alerts;
  }
}

