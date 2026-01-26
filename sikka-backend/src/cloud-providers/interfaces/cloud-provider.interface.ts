import { ScalingPhaseConfig } from '../../config/scaling-phases.config';

/**
 * Cloud Provider Interface
 * 
 * Defines the contract that all cloud provider implementations must follow.
 * This abstraction allows the scaling system to work with multiple cloud providers
 * while maintaining a consistent interface.
 */
export interface CloudProviderInterface {
  /**
   * Get the provider name
   */
  getProviderName(): string;

  /**
   * Get available regions for this provider
   */
  getAvailableRegions(): Promise<CloudRegion[]>;

  /**
   * Generate infrastructure-as-code templates for the given scaling phase
   */
  generateInfrastructureTemplate(
    phaseConfig: ScalingPhaseConfig,
    options: InfrastructureOptions
  ): Promise<InfrastructureTemplate>;

  /**
   * Calculate estimated monthly cost for the given configuration
   */
  calculateCost(
    phaseConfig: ScalingPhaseConfig,
    region: string,
    options: CostCalculationOptions
  ): Promise<CostEstimate>;

  /**
   * Get provider-specific service recommendations
   */
  getServiceRecommendations(
    phaseConfig: ScalingPhaseConfig,
    requirements: ServiceRequirements
  ): Promise<ServiceRecommendation[]>;

  /**
   * Validate that the provider can support the given configuration
   */
  validateConfiguration(
    phaseConfig: ScalingPhaseConfig,
    region: string
  ): Promise<ValidationResult>;

  /**
   * Get provider-specific environment variables
   */
  getEnvironmentVariables(
    phaseConfig: ScalingPhaseConfig,
    region: string
  ): Promise<Record<string, string>>;

  /**
   * Get monitoring and alerting configuration
   */
  getMonitoringConfiguration(
    phaseConfig: ScalingPhaseConfig
  ): Promise<MonitoringConfig>;
}

/**
 * Cloud Region Information
 */
export interface CloudRegion {
  id: string;
  name: string;
  location: string;
  available: boolean;
  latency?: number; // Average latency in ms
  costMultiplier?: number; // Regional cost multiplier (1.0 = base cost)
}

/**
 * Infrastructure Template
 */
export interface InfrastructureTemplate {
  templateType: 'terraform' | 'cloudformation' | 'pulumi';
  template: string;
  variables: Record<string, any>;
  outputs: Record<string, string>;
  dependencies: string[];
  estimatedDeploymentTime: number; // in minutes
}

/**
 * Infrastructure Options
 */
export interface InfrastructureOptions {
  region: string;
  environment: 'development' | 'staging' | 'production';
  highAvailability: boolean;
  backupRetention: number; // days
  monitoringLevel: 'basic' | 'standard' | 'advanced';
  securityLevel: 'basic' | 'standard' | 'enterprise';
}

/**
 * Cost Estimate
 */
export interface CostEstimate {
  totalMonthlyCost: number;
  currency: string;
  breakdown: CostBreakdown[];
  confidence: number; // 0-1, how accurate the estimate is
  lastUpdated: Date;
  assumptions: string[];
  recommendations: CostOptimizationRecommendation[];
}

/**
 * Cost Breakdown by Service
 */
export interface CostBreakdown {
  service: string;
  category: 'compute' | 'database' | 'storage' | 'networking' | 'monitoring' | 'other';
  monthlyCost: number;
  unit: string;
  quantity: number;
  unitCost: number;
  description: string;
}

/**
 * Cost Calculation Options
 */
export interface CostCalculationOptions {
  includeDataTransfer: boolean;
  includeBackups: boolean;
  includeMonitoring: boolean;
  usagePattern: 'light' | 'moderate' | 'heavy';
  reservedInstanceDiscount: boolean;
}

/**
 * Service Requirements
 */
export interface ServiceRequirements {
  performanceLevel: 'basic' | 'standard' | 'high' | 'enterprise';
  availabilityRequirement: number; // 99.9, 99.95, 99.99
  dataResidency?: string; // region requirement for data
  complianceRequirements: string[]; // GDPR, HIPAA, etc.
  budgetConstraint?: number; // maximum monthly budget
}

/**
 * Service Recommendation
 */
export interface ServiceRecommendation {
  service: string;
  instanceType: string;
  configuration: Record<string, any>;
  monthlyCost: number;
  performance: {
    cpu: number;
    memory: number;
    storage: number;
    network: number;
  };
  rationale: string;
  alternatives: ServiceAlternative[];
}

/**
 * Service Alternative
 */
export interface ServiceAlternative {
  instanceType: string;
  monthlyCost: number;
  tradeoffs: string;
}

/**
 * Validation Result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  recommendations: string[];
}

/**
 * Validation Error
 */
export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Validation Warning
 */
export interface ValidationWarning {
  field: string;
  message: string;
  impact: string;
}

/**
 * Monitoring Configuration
 */
export interface MonitoringConfig {
  metrics: MetricConfig[];
  alerts: AlertConfig[];
  dashboards: DashboardConfig[];
  logRetention: number; // days
}

/**
 * Metric Configuration
 */
export interface MetricConfig {
  name: string;
  type: 'gauge' | 'counter' | 'histogram';
  source: string;
  interval: number; // seconds
  retention: number; // days
}

/**
 * Alert Configuration
 */
export interface AlertConfig {
  name: string;
  condition: string;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  notificationChannels: string[];
}

/**
 * Dashboard Configuration
 */
export interface DashboardConfig {
  name: string;
  widgets: WidgetConfig[];
  refreshInterval: number; // seconds
}

/**
 * Widget Configuration
 */
export interface WidgetConfig {
  type: 'chart' | 'gauge' | 'table' | 'text';
  title: string;
  metrics: string[];
  timeRange: string;
}

/**
 * Cost Optimization Recommendation
 */
export interface CostOptimizationRecommendation {
  type: 'instance_sizing' | 'reserved_instances' | 'storage_optimization' | 'network_optimization';
  description: string;
  potentialSavings: number;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
}

