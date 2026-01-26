import { Injectable } from '@nestjs/common';
import { CloudProviderInterface, CloudRegion, InfrastructureTemplate, InfrastructureOptions, CostEstimate, CostCalculationOptions, ServiceRecommendation, ServiceRequirements, ValidationResult, MonitoringConfig, CostBreakdown } from '../interfaces/cloud-provider.interface';
import { ScalingPhaseConfig } from '../../config/scaling-phases.config';
import { LinodeProviderConfig } from '../../config/linode-provider.config';

/**
 * Linode Cloud Provider Service
 * 
 * Implements the CloudProviderInterface for Linode cloud services.
 * Provides cost-effective alternatives to AWS with competitive pricing
 * and simplified infrastructure management.
 */
@Injectable()
export class LinodeProviderService implements CloudProviderInterface {
  constructor(
    private readonly linodeConfig: LinodeProviderConfig,
  ) {}

  getProviderName(): string {
    return 'linode';
  }

  async getAvailableRegions(): Promise<CloudRegion[]> {
    // Linode regions with cost advantages
    return [
      {
        id: 'us-east',
        name: 'Newark, NJ',
        location: 'United States East',
        available: true,
        latency: 45,
        costMultiplier: 1.0,
      },
      {
        id: 'us-west',
        name: 'Fremont, CA',
        location: 'United States West',
        available: true,
        latency: 65,
        costMultiplier: 1.0,
      },
      {
        id: 'eu-west',
        name: 'London, UK',
        location: 'Europe West',
        available: true,
        latency: 85,
        costMultiplier: 1.05,
      },
      {
        id: 'ap-south',
        name: 'Singapore',
        location: 'Asia Pacific',
        available: true,
        latency: 120,
        costMultiplier: 1.1,
      },
    ];
  }

  async generateInfrastructureTemplate(
    phaseConfig: ScalingPhaseConfig,
    options: InfrastructureOptions
  ): Promise<InfrastructureTemplate> {
    const template = this.generateTerraformTemplate(phaseConfig, options);
    
    return {
      templateType: 'terraform',
      template,
      variables: this.getTemplateVariables(phaseConfig, options),
      outputs: this.getTemplateOutputs(),
      dependencies: ['linode/linode', 'hashicorp/random'],
      estimatedDeploymentTime: this.estimateDeploymentTime(phaseConfig),
    };
  }

  async calculateCost(
    phaseConfig: ScalingPhaseConfig,
    region: string,
    options: CostCalculationOptions
  ): Promise<CostEstimate> {
    const breakdown = await this.calculateCostBreakdown(phaseConfig, region, options);
    const total = breakdown.reduce((sum, item) => sum + item.monthlyCost, 0);

    return {
      totalMonthlyCost: total,
      currency: 'USD',
      breakdown,
      confidence: 0.85,
      lastUpdated: new Date(),
      assumptions: [
        'Based on Linode standard pricing',
        'Assumes moderate usage patterns',
        'Includes basic monitoring and backups',
      ],
      recommendations: [
        {
          type: 'instance_sizing',
          description: 'Consider using Dedicated CPU instances for consistent performance',
          potentialSavings: total * 0.15,
          effort: 'low',
          impact: 'medium',
        },
      ],
    };
  }

  async getServiceRecommendations(
    phaseConfig: ScalingPhaseConfig,
    requirements: ServiceRequirements
  ): Promise<ServiceRecommendation[]> {
    const recommendations: ServiceRecommendation[] = [];

    // Compute recommendations
    const computeRec = this.getComputeRecommendation(phaseConfig, requirements);
    if (computeRec) recommendations.push(computeRec);

    // Database recommendations
    const dbRec = this.getDatabaseRecommendation(phaseConfig, requirements);
    if (dbRec) recommendations.push(dbRec);

    // Load balancer recommendations
    const lbRec = this.getLoadBalancerRecommendation(phaseConfig, requirements);
    if (lbRec) recommendations.push(lbRec);

    return recommendations;
  }

  async validateConfiguration(
    phaseConfig: ScalingPhaseConfig,
    region: string
  ): Promise<ValidationResult> {
    const errors = [];
    const warnings = [];
    const recommendations = [];

    // Validate region availability
    const regions = await this.getAvailableRegions();
    if (!regions.find(r => r.id === region)) {
      errors.push({
        field: 'region',
        message: `Region ${region} is not available for Linode`,
        severity: 'error' as const,
      });
    }

    // Validate scaling phase configuration
    if (!phaseConfig.expectedUsers || phaseConfig.expectedUsers <= 0) {
      errors.push({
        field: 'expectedUsers',
        message: 'Expected users must be greater than 0',
        severity: 'error' as const,
      });
    }

    // Add recommendations
    if (phaseConfig.expectedUsers > 10000) {
      recommendations.push('Consider using Linode Kubernetes Engine for better scalability');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      recommendations,
    };
  }

  async getEnvironmentVariables(
    phaseConfig: ScalingPhaseConfig,
    region: string
  ): Promise<Record<string, string>> {
    return {
      CLOUD_PROVIDER: 'linode',
      LINODE_REGION: region,
      LINODE_API_VERSION: 'v4',
      SCALING_PHASE: phaseConfig.phase,
      EXPECTED_USERS: phaseConfig.expectedUsers.toString(),
    };
  }

  async getMonitoringConfiguration(
    phaseConfig: ScalingPhaseConfig
  ): Promise<MonitoringConfig> {
    return {
      metrics: [
        {
          name: 'cpu_utilization',
          type: 'gauge',
          source: 'linode_longview',
          interval: 60,
          retention: 30,
        },
        {
          name: 'memory_utilization',
          type: 'gauge',
          source: 'linode_longview',
          interval: 60,
          retention: 30,
        },
        {
          name: 'disk_io',
          type: 'counter',
          source: 'linode_longview',
          interval: 60,
          retention: 30,
        },
      ],
      alerts: [
        {
          name: 'high_cpu_usage',
          condition: 'cpu_utilization > 80',
          threshold: 80,
          severity: 'high',
          notificationChannels: ['email', 'webhook'],
        },
        {
          name: 'low_disk_space',
          condition: 'disk_usage > 90',
          threshold: 90,
          severity: 'critical',
          notificationChannels: ['email', 'sms', 'webhook'],
        },
      ],
      dashboards: [
        {
          name: 'Infrastructure Overview',
          widgets: [
            {
              type: 'chart',
              title: 'CPU Utilization',
              metrics: ['cpu_utilization'],
              timeRange: '1h',
            },
            {
              type: 'chart',
              title: 'Memory Usage',
              metrics: ['memory_utilization'],
              timeRange: '1h',
            },
          ],
          refreshInterval: 300,
        },
      ],
      logRetention: 30,
    };
  }

  private generateTerraformTemplate(phaseConfig: ScalingPhaseConfig, options: InfrastructureOptions): string {
    return `
# Linode Infrastructure Template for ${phaseConfig.phase} phase
terraform {
  required_providers {
    linode = {
      source  = "linode/linode"
      version = "~> 1.29"
    }
  }
}

provider "linode" {
  token = var.linode_token
}

# Linode instances
resource "linode_instance" "app_server" {
  count  = var.instance_count
  label  = "sikka-app-\${count.index + 1}"
  image  = var.image
  region = var.region
  type   = var.instance_type
  
  authorized_keys = [var.ssh_public_key]
  
  tags = [
    "environment:\${var.environment}",
    "phase:\${var.scaling_phase}",
    "app:sikka-transport"
  ]
}

# NodeBalancer (Load Balancer)
resource "linode_nodebalancer" "main" {
  label  = "sikka-lb"
  region = var.region
  
  tags = [
    "environment:\${var.environment}",
    "app:sikka-transport"
  ]
}

resource "linode_nodebalancer_config" "main" {
  nodebalancer_id = linode_nodebalancer.main.id
  port            = 80
  protocol        = "http"
  algorithm       = "roundrobin"
  stickiness      = "none"
  
  check          = "http"
  check_path     = "/health"
  check_attempts = 3
  check_timeout  = 30
  check_interval = 40
}

resource "linode_nodebalancer_node" "app_nodes" {
  count           = var.instance_count
  nodebalancer_id = linode_nodebalancer.main.id
  config_id       = linode_nodebalancer_config.main.id
  
  label   = "sikka-app-\${count.index + 1}"
  address = "\${linode_instance.app_server[count.index].private_ip_address}:3000"
  weight  = 100
}

# Database
resource "linode_database_postgresql" "main" {
  label  = "sikka-db"
  engine = "postgresql"
  region = var.region
  type   = var.database_type
  
  encrypted = true
  
  tags = [
    "environment:\${var.environment}",
    "app:sikka-transport"
  ]
}
`;
  }

  private getTemplateVariables(phaseConfig: ScalingPhaseConfig, options: InfrastructureOptions): Record<string, any> {
    const instanceSpecs = this.getInstanceSpecsForPhase(phaseConfig.phase);
    
    return {
      linode_token: {
        description: 'Linode API token',
        type: 'string',
        sensitive: true,
      },
      region: {
        description: 'Linode region',
        type: 'string',
        default: options.region,
      },
      environment: {
        description: 'Environment name',
        type: 'string',
        default: options.environment,
      },
      scaling_phase: {
        description: 'Current scaling phase',
        type: 'string',
        default: phaseConfig.phase,
      },
      instance_count: {
        description: 'Number of application instances',
        type: 'number',
        default: instanceSpecs.count,
      },
      instance_type: {
        description: 'Linode instance type',
        type: 'string',
        default: instanceSpecs.type,
      },
      database_type: {
        description: 'Database instance type',
        type: 'string',
        default: instanceSpecs.dbType,
      },
      image: {
        description: 'Linode image to use',
        type: 'string',
        default: 'linode/ubuntu20.04',
      },
      ssh_public_key: {
        description: 'SSH public key for access',
        type: 'string',
      },
    };
  }

  private getTemplateOutputs(): Record<string, string> {
    return {
      load_balancer_ip: 'linode_nodebalancer.main.ipv4',
      database_host: 'linode_database_postgresql.main.host',
      database_port: 'linode_database_postgresql.main.port',
      instance_ips: 'linode_instance.app_server[*].ip_address',
    };
  }

  private estimateDeploymentTime(phaseConfig: ScalingPhaseConfig): number {
    const baseTime = 15; // Base deployment time in minutes
    const instanceMultiplier = this.getInstanceSpecsForPhase(phaseConfig.phase).count * 2;
    return baseTime + instanceMultiplier;
  }

  private async calculateCostBreakdown(
    phaseConfig: ScalingPhaseConfig,
    region: string,
    options: CostCalculationOptions
  ): Promise<CostBreakdown[]> {
    const specs = this.getInstanceSpecsForPhase(phaseConfig.phase);
    const regionMultiplier = await this.getRegionCostMultiplier(region);

    const breakdown = [
      {
        service: 'Linode Instances',
        category: 'compute' as const,
        monthlyCost: specs.instanceCost * specs.count * regionMultiplier,
        unit: 'instance',
        quantity: specs.count,
        unitCost: specs.instanceCost * regionMultiplier,
        description: `${specs.count}x ${specs.type} instances`,
      },
      {
        service: 'NodeBalancer',
        category: 'networking' as const,
        monthlyCost: 10 * regionMultiplier,
        unit: 'balancer',
        quantity: 1,
        unitCost: 10 * regionMultiplier,
        description: 'Load balancer with health checks',
      },
      {
        service: 'PostgreSQL Database',
        category: 'database' as const,
        monthlyCost: specs.dbCost * regionMultiplier,
        unit: 'database',
        quantity: 1,
        unitCost: specs.dbCost * regionMultiplier,
        description: `Managed PostgreSQL ${specs.dbType}`,
      },
    ];

    if (options.includeBackups) {
      breakdown.push({
        service: 'Backups',
        category: 'storage' as const,
        monthlyCost: 5 * specs.count * regionMultiplier,
        unit: 'backup',
        quantity: specs.count,
        unitCost: 5 * regionMultiplier,
        description: 'Automated daily backups',
      });
    }

    if (options.includeMonitoring) {
      breakdown.push({
        service: 'Longview Pro',
        category: 'monitoring' as const,
        monthlyCost: 0, // Longview is included
        unit: 'service',
        quantity: 1,
        unitCost: 0,
        description: 'Included monitoring service',
      });
    }

    return breakdown;
  }

  private getInstanceSpecsForPhase(phase: string): any {
    const specs = {
      launch: {
        type: 'g6-standard-2',
        count: 2,
        instanceCost: 24,
        dbType: 'g6-standard-1',
        dbCost: 15,
      },
      growth: {
        type: 'g6-standard-4',
        count: 3,
        instanceCost: 48,
        dbType: 'g6-standard-2',
        dbCost: 30,
      },
      scale: {
        type: 'g6-standard-8',
        count: 5,
        instanceCost: 96,
        dbType: 'g6-standard-4',
        dbCost: 60,
      },
    };

    return specs[phase] || specs.launch;
  }

  private async getRegionCostMultiplier(region: string): Promise<number> {
    const regions = await this.getAvailableRegions();
    const regionInfo = regions.find(r => r.id === region);
    return regionInfo?.costMultiplier || 1.0;
  }

  private getComputeRecommendation(phaseConfig: ScalingPhaseConfig, requirements: ServiceRequirements): ServiceRecommendation | null {
    const specs = this.getInstanceSpecsForPhase(phaseConfig.phase);
    
    return {
      service: 'Linode Compute',
      instanceType: specs.type,
      configuration: {
        vcpu: specs.type.includes('standard-2') ? 2 : specs.type.includes('standard-4') ? 4 : 8,
        memory: specs.type.includes('standard-2') ? 4 : specs.type.includes('standard-4') ? 8 : 16,
        storage: 80,
        network: 1000,
      },
      monthlyCost: specs.instanceCost * specs.count,
      performance: {
        cpu: specs.type.includes('standard-2') ? 2 : specs.type.includes('standard-4') ? 4 : 8,
        memory: specs.type.includes('standard-2') ? 4 : specs.type.includes('standard-4') ? 8 : 16,
        storage: 80,
        network: 1000,
      },
      rationale: 'Cost-effective general purpose instances with good performance',
      alternatives: [
        {
          instanceType: 'g6-dedicated-2',
          monthlyCost: specs.instanceCost * 1.5,
          tradeoffs: 'Higher cost but dedicated CPU resources',
        },
      ],
    };
  }

  private getDatabaseRecommendation(phaseConfig: ScalingPhaseConfig, requirements: ServiceRequirements): ServiceRecommendation | null {
    const specs = this.getInstanceSpecsForPhase(phaseConfig.phase);
    
    return {
      service: 'Linode Database',
      instanceType: specs.dbType,
      configuration: {
        engine: 'postgresql',
        version: '13',
        storage: 25,
        backups: true,
      },
      monthlyCost: specs.dbCost,
      performance: {
        cpu: 1,
        memory: 2,
        storage: 25,
        network: 1000,
      },
      rationale: 'Managed PostgreSQL with automated backups and monitoring',
      alternatives: [
        {
          instanceType: 'self-managed',
          monthlyCost: specs.dbCost * 0.6,
          tradeoffs: 'Lower cost but requires manual management',
        },
      ],
    };
  }

  private getLoadBalancerRecommendation(phaseConfig: ScalingPhaseConfig, requirements: ServiceRequirements): ServiceRecommendation | null {
    return {
      service: 'NodeBalancer',
      instanceType: 'standard',
      configuration: {
        algorithm: 'roundrobin',
        healthChecks: true,
        sslTermination: true,
      },
      monthlyCost: 10,
      performance: {
        cpu: 0,
        memory: 0,
        storage: 0,
        network: 10000, // 10 Gbps
      },
      rationale: 'Simple and cost-effective load balancing solution',
      alternatives: [
        {
          instanceType: 'nginx-proxy',
          monthlyCost: 5,
          tradeoffs: 'Lower cost but requires manual configuration',
        },
      ],
    };
  }
}
