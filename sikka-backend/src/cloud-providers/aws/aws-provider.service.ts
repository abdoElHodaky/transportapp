import { Injectable } from '@nestjs/common';
import {
  CloudProviderInterface,
  CloudRegion,
  InfrastructureTemplate,
  InfrastructureOptions,
  CostEstimate,
  CostCalculationOptions,
  ServiceRecommendation,
  ServiceRequirements,
  ValidationResult,
  MonitoringConfig,
  CostBreakdown,
} from '../interfaces/cloud-provider.interface';
import { ScalingPhaseConfig } from '../../config/scaling-phases.config';
import { AwsProviderConfig } from '../../config/aws-provider.config';

/**
 * AWS Cloud Provider Service
 *
 * Implements the CloudProviderInterface for Amazon Web Services.
 * Provides comprehensive AWS infrastructure management and cost optimization
 * for the Sikka Transportation Platform scaling strategy.
 */
@Injectable()
export class AwsProviderService implements CloudProviderInterface {
  constructor(private readonly awsConfig: AwsProviderConfig) {}

  getProviderName(): string {
    return 'aws';
  }

  async getAvailableRegions(): Promise<CloudRegion[]> {
    // AWS regions with their characteristics
    return [
      {
        id: 'us-east-1',
        name: 'N. Virginia',
        location: 'United States East',
        available: true,
        latency: 50,
        costMultiplier: 1.0,
      },
      {
        id: 'us-west-2',
        name: 'Oregon',
        location: 'United States West',
        available: true,
        latency: 70,
        costMultiplier: 1.0,
      },
      {
        id: 'eu-west-1',
        name: 'Ireland',
        location: 'Europe West',
        available: true,
        latency: 90,
        costMultiplier: 1.1,
      },
      {
        id: 'ap-southeast-1',
        name: 'Singapore',
        location: 'Asia Pacific',
        available: true,
        latency: 130,
        costMultiplier: 1.15,
      },
    ];
  }

  async generateInfrastructureTemplate(
    phaseConfig: ScalingPhaseConfig,
    options: InfrastructureOptions,
  ): Promise<InfrastructureTemplate> {
    const template = this.generateTerraformTemplate(phaseConfig, options);

    return {
      templateType: 'terraform',
      template,
      variables: this.getTemplateVariables(phaseConfig, options),
      outputs: this.getTemplateOutputs(),
      dependencies: ['hashicorp/aws', 'hashicorp/random'],
      estimatedDeploymentTime: this.estimateDeploymentTime(phaseConfig),
    };
  }

  async calculateCost(
    phaseConfig: ScalingPhaseConfig,
    region: string,
    options: CostCalculationOptions,
  ): Promise<CostEstimate> {
    const breakdown = await this.calculateCostBreakdown(
      phaseConfig,
      region,
      options,
    );
    const total = breakdown.reduce((sum, item) => sum + item.monthlyCost, 0);

    return {
      totalMonthlyCost: total,
      currency: 'USD',
      breakdown,
      confidence: 0.9,
      lastUpdated: new Date(),
      assumptions: [
        'Based on AWS on-demand pricing',
        'Assumes moderate usage patterns',
        'Includes standard monitoring and backups',
      ],
      recommendations: [
        {
          type: 'reserved_instances',
          description: 'Consider Reserved Instances for 20-40% savings',
          potentialSavings: total * 0.3,
          effort: 'low',
          impact: 'high',
        },
      ],
    };
  }

  async getServiceRecommendations(
    phaseConfig: ScalingPhaseConfig,
    requirements: ServiceRequirements,
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
    region: string,
  ): Promise<ValidationResult> {
    const errors = [];
    const warnings = [];
    const recommendations = [];

    // Validate region availability
    const regions = await this.getAvailableRegions();
    if (!regions.find((r) => r.id === region)) {
      errors.push({
        field: 'region',
        message: `Region ${region} is not available for AWS`,
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
    if (phaseConfig.expectedUsers > 50000) {
      recommendations.push(
        'Consider using AWS Auto Scaling Groups for better scalability',
      );
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
    region: string,
  ): Promise<Record<string, string>> {
    return {
      CLOUD_PROVIDER: 'aws',
      AWS_REGION: region,
      AWS_DEFAULT_REGION: region,
      SCALING_PHASE: phaseConfig.phase,
      EXPECTED_USERS: phaseConfig.expectedUsers.toString(),
    };
  }

  async getMonitoringConfiguration(
    phaseConfig: ScalingPhaseConfig,
  ): Promise<MonitoringConfig> {
    return {
      metrics: [
        {
          name: 'cpu_utilization',
          type: 'gauge',
          source: 'cloudwatch',
          interval: 60,
          retention: 30,
        },
        {
          name: 'memory_utilization',
          type: 'gauge',
          source: 'cloudwatch',
          interval: 60,
          retention: 30,
        },
        {
          name: 'request_count',
          type: 'counter',
          source: 'alb',
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
          notificationChannels: ['email', 'sns'],
        },
        {
          name: 'high_error_rate',
          condition: 'error_rate > 5',
          threshold: 5,
          severity: 'critical',
          notificationChannels: ['email', 'sns', 'pagerduty'],
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
              title: 'Request Count',
              metrics: ['request_count'],
              timeRange: '1h',
            },
          ],
          refreshInterval: 300,
        },
      ],
      logRetention: 30,
    };
  }

  private generateTerraformTemplate(
    phaseConfig: ScalingPhaseConfig,
    options: InfrastructureOptions,
  ): string {
    return `
# AWS Infrastructure Template for ${phaseConfig.phase} phase
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "sikka-vpc-\${var.environment}"
    Environment = var.environment
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "sikka-igw-\${var.environment}"
  }
}

# Public Subnets
resource "aws_subnet" "public" {
  count = 2
  
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.\${count.index + 1}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "sikka-public-subnet-\${count.index + 1}"
  }
}

# Private Subnets
resource "aws_subnet" "private" {
  count = 2
  
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.\${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "sikka-private-subnet-\${count.index + 1}"
  }
}

# Route Tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "sikka-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  count = 2
  
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Security Groups
resource "aws_security_group" "web" {
  name_prefix = "sikka-web-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "sikka-web-sg"
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "sikka-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.web.id]
  subnets            = aws_subnet.public[*].id

  tags = {
    Name = "sikka-alb"
  }
}

# EC2 Launch Template
resource "aws_launch_template" "app" {
  name_prefix   = "sikka-app-"
  image_id      = var.ami_id
  instance_type = var.instance_type
  key_name      = var.key_name

  vpc_security_group_ids = [aws_security_group.app.id]

  user_data = base64encode(<<-EOF
    #!/bin/bash
    yum update -y
    yum install -y docker
    systemctl start docker
    systemctl enable docker
    usermod -a -G docker ec2-user
  EOF
  )

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "sikka-app"
      Environment = var.environment
    }
  }
}

# Auto Scaling Group
resource "aws_autoscaling_group" "app" {
  name                = "sikka-asg"
  vpc_zone_identifier = aws_subnet.private[*].id
  target_group_arns   = [aws_lb_target_group.app.arn]
  health_check_type   = "ELB"
  
  min_size         = var.min_instances
  max_size         = var.max_instances
  desired_capacity = var.desired_instances

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "sikka-asg"
    propagate_at_launch = false
  }
}

# RDS Database
resource "aws_db_instance" "main" {
  identifier = "sikka-db"
  
  engine         = var.db_engine
  engine_version = var.db_version
  instance_class = var.db_instance_class
  
  allocated_storage     = var.db_storage
  max_allocated_storage = var.db_max_storage
  
  db_name  = var.db_name
  username = var.db_username
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.database.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  backup_retention_period = var.backup_retention
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  skip_final_snapshot = true
  
  tags = {
    Name = "sikka-db"
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}
`;
  }

  private getTemplateVariables(
    phaseConfig: ScalingPhaseConfig,
    options: InfrastructureOptions,
  ): Record<string, any> {
    const instanceSpecs = this.getInstanceSpecsForPhase(phaseConfig.phase);

    return {
      aws_region: {
        description: 'AWS region',
        type: 'string',
        default: options.region,
      },
      environment: {
        description: 'Environment name',
        type: 'string',
        default: options.environment,
      },
      vpc_cidr: {
        description: 'VPC CIDR block',
        type: 'string',
        default: '10.0.0.0/16',
      },
      instance_type: {
        description: 'EC2 instance type',
        type: 'string',
        default: instanceSpecs.type,
      },
      min_instances: {
        description: 'Minimum number of instances',
        type: 'number',
        default: instanceSpecs.minCount,
      },
      max_instances: {
        description: 'Maximum number of instances',
        type: 'number',
        default: instanceSpecs.maxCount,
      },
      desired_instances: {
        description: 'Desired number of instances',
        type: 'number',
        default: instanceSpecs.desiredCount,
      },
      db_instance_class: {
        description: 'RDS instance class',
        type: 'string',
        default: instanceSpecs.dbClass,
      },
      ami_id: {
        description: 'AMI ID for EC2 instances',
        type: 'string',
        default: 'ami-0abcdef1234567890', // Amazon Linux 2
      },
      key_name: {
        description: 'EC2 Key Pair name',
        type: 'string',
      },
    };
  }

  private getTemplateOutputs(): Record<string, string> {
    return {
      vpc_id: 'aws_vpc.main.id',
      load_balancer_dns: 'aws_lb.main.dns_name',
      database_endpoint: 'aws_db_instance.main.endpoint',
      autoscaling_group_arn: 'aws_autoscaling_group.app.arn',
    };
  }

  private estimateDeploymentTime(phaseConfig: ScalingPhaseConfig): number {
    const baseTime = 20; // Base deployment time in minutes
    const instanceMultiplier =
      this.getInstanceSpecsForPhase(phaseConfig.phase).desiredCount * 3;
    return baseTime + instanceMultiplier;
  }

  private async calculateCostBreakdown(
    phaseConfig: ScalingPhaseConfig,
    region: string,
    options: CostCalculationOptions,
  ): Promise<CostBreakdown[]> {
    const specs = this.getInstanceSpecsForPhase(phaseConfig.phase);
    const regionMultiplier = await this.getRegionCostMultiplier(region);

    const breakdown: CostBreakdown[] = [
      {
        service: 'EC2 Instances',
        category: 'compute' as const,
        monthlyCost: specs.instanceCost * specs.desiredCount * regionMultiplier,
        unit: 'instance',
        quantity: specs.desiredCount,
        unitCost: specs.instanceCost * regionMultiplier,
        description: `${specs.desiredCount}x ${specs.type} instances`,
      },
      {
        service: 'Application Load Balancer',
        category: 'networking' as const,
        monthlyCost: 16 * regionMultiplier,
        unit: 'balancer',
        quantity: 1,
        unitCost: 16 * regionMultiplier,
        description: 'Application Load Balancer',
      },
      {
        service: 'RDS PostgreSQL',
        category: 'database' as const,
        monthlyCost: specs.dbCost * regionMultiplier,
        unit: 'database',
        quantity: 1,
        unitCost: specs.dbCost * regionMultiplier,
        description: `RDS ${specs.dbClass} instance`,
      },
      {
        service: 'EBS Storage',
        category: 'storage' as const,
        monthlyCost: 10 * specs.desiredCount * regionMultiplier,
        unit: 'GB',
        quantity: 100 * specs.desiredCount,
        unitCost: 0.1 * regionMultiplier,
        description: 'EBS GP3 storage for instances',
      },
    ];

    if (options.includeBackups) {
      breakdown.push({
        service: 'RDS Backups',
        category: 'storage' as const,
        monthlyCost: 5 * regionMultiplier,
        unit: 'backup',
        quantity: 1,
        unitCost: 5 * regionMultiplier,
        description: 'Automated database backups',
      });
    }

    if (options.includeMonitoring) {
      breakdown.push({
        service: 'CloudWatch',
        category: 'monitoring' as const,
        monthlyCost: 10 * regionMultiplier,
        unit: 'service',
        quantity: 1,
        unitCost: 10 * regionMultiplier,
        description: 'CloudWatch monitoring and logs',
      });
    }

    return breakdown;
  }

  private getInstanceSpecsForPhase(phase: string): any {
    const specs = {
      launch: {
        type: 't3.medium',
        minCount: 1,
        maxCount: 3,
        desiredCount: 2,
        instanceCost: 30,
        dbClass: 'db.t3.micro',
        dbCost: 20,
      },
      growth: {
        type: 'c5.large',
        minCount: 2,
        maxCount: 6,
        desiredCount: 3,
        instanceCost: 62,
        dbClass: 'db.t3.small',
        dbCost: 40,
      },
      scale: {
        type: 'c5.xlarge',
        minCount: 3,
        maxCount: 10,
        desiredCount: 5,
        instanceCost: 124,
        dbClass: 'db.r5.large',
        dbCost: 120,
      },
    };

    return specs[phase] || specs.launch;
  }

  private async getRegionCostMultiplier(region: string): Promise<number> {
    const regions = await this.getAvailableRegions();
    const regionInfo = regions.find((r) => r.id === region);
    return regionInfo?.costMultiplier || 1.0;
  }

  private getComputeRecommendation(
    phaseConfig: ScalingPhaseConfig,
    requirements: ServiceRequirements,
  ): ServiceRecommendation | null {
    const specs = this.getInstanceSpecsForPhase(phaseConfig.phase);

    return {
      service: 'EC2 Compute',
      instanceType: specs.type,
      configuration: {
        vcpu: specs.type.includes('medium')
          ? 2
          : specs.type.includes('large')
            ? 4
            : 8,
        memory: specs.type.includes('medium')
          ? 4
          : specs.type.includes('large')
            ? 8
            : 16,
        storage: 100,
        network: 'Up to 5 Gbps',
      },
      monthlyCost: specs.instanceCost * specs.desiredCount,
      performance: {
        cpu: specs.type.includes('medium')
          ? 2
          : specs.type.includes('large')
            ? 4
            : 8,
        memory: specs.type.includes('medium')
          ? 4
          : specs.type.includes('large')
            ? 8
            : 16,
        storage: 100,
        network: 5000,
      },
      rationale: 'Balanced compute instances with good price-performance ratio',
      alternatives: [
        {
          instanceType: specs.type.replace('c5', 'm5'),
          monthlyCost: specs.instanceCost * 0.9,
          tradeoffs: 'Slightly lower cost but less CPU performance',
        },
      ],
    };
  }

  private getDatabaseRecommendation(
    phaseConfig: ScalingPhaseConfig,
    requirements: ServiceRequirements,
  ): ServiceRecommendation | null {
    const specs = this.getInstanceSpecsForPhase(phaseConfig.phase);

    return {
      service: 'RDS PostgreSQL',
      instanceType: specs.dbClass,
      configuration: {
        engine: 'postgresql',
        version: '13.7',
        storage: 100,
        backups: true,
        multiAZ: phaseConfig.phase === 'scale',
      },
      monthlyCost: specs.dbCost,
      performance: {
        cpu: 1,
        memory: specs.dbClass.includes('micro')
          ? 1
          : specs.dbClass.includes('small')
            ? 2
            : 8,
        storage: 100,
        network: 1000,
      },
      rationale: 'Managed PostgreSQL with automated backups and maintenance',
      alternatives: [
        {
          instanceType: 'self-managed',
          monthlyCost: specs.dbCost * 0.5,
          tradeoffs:
            'Lower cost but requires manual management and maintenance',
        },
      ],
    };
  }

  private getLoadBalancerRecommendation(
    phaseConfig: ScalingPhaseConfig,
    requirements: ServiceRequirements,
  ): ServiceRecommendation | null {
    return {
      service: 'Application Load Balancer',
      instanceType: 'standard',
      configuration: {
        type: 'application',
        scheme: 'internet-facing',
        healthChecks: true,
        sslTermination: true,
      },
      monthlyCost: 16,
      performance: {
        cpu: 0,
        memory: 0,
        storage: 0,
        network: 25000, // 25 Gbps
      },
      rationale:
        'Highly available load balancer with SSL termination and health checks',
      alternatives: [
        {
          instanceType: 'network-load-balancer',
          monthlyCost: 16,
          tradeoffs: 'Better for TCP traffic but no SSL termination',
        },
      ],
    };
  }
}
