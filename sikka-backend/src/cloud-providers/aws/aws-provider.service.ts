import { Injectable } from '@nestjs/common';
import { CloudProviderInterface } from '../interfaces/cloud-provider.interface';
import { InfrastructureConfig, CloudRegion, InfrastructureTemplate, CostEstimate, ServiceRecommendation, ValidationResult, MonitoringConfig } from '../interfaces/infrastructure-config.interface';
import { AwsProviderConfig } from '../../config/aws-provider.config';

@Injectable()
export class AwsProviderService implements CloudProviderInterface {
  constructor(private readonly awsConfig: AwsProviderConfig) {}

  getProviderName(): string {
    return 'aws';
  }

  async getAvailableRegions(): Promise<CloudRegion[]> {
    const config = this.awsConfig.getProviderConfig();
    return config.regions.map(region => ({
      id: region.id,
      name: region.name,
      location: region.location,
      latency: region.latency,
      available: region.available,
      features: region.features
    }));
  }

  async generateInfrastructureTemplate(
    scalingPhase: 'launch' | 'growth' | 'scale',
    region: string,
    config: InfrastructureConfig
  ): Promise<InfrastructureTemplate> {
    const awsConfig = this.awsConfig.getProviderConfig();
    const phaseConfig = awsConfig.scalingPhases[scalingPhase];

    // Generate Terraform template for AWS
    const terraformTemplate = this.generateTerraformTemplate(scalingPhase, region, config, phaseConfig);
    
    return {
      provider: 'aws',
      scalingPhase,
      region,
      template: terraformTemplate,
      templateType: 'terraform',
      estimatedCost: await this.calculateCost(scalingPhase, region, config),
      deploymentTime: phaseConfig.deploymentTime,
      resources: this.getResourceList(scalingPhase, phaseConfig)
    };
  }

  async calculateCost(
    scalingPhase: 'launch' | 'growth' | 'scale',
    region: string,
    config: InfrastructureConfig
  ): Promise<CostEstimate> {
    const awsConfig = this.awsConfig.getProviderConfig();
    const phaseConfig = awsConfig.scalingPhases[scalingPhase];

    // Calculate costs for each service
    const computeCost = this.calculateComputeCost(phaseConfig.compute);
    const databaseCost = this.calculateDatabaseCost(phaseConfig.database);
    const cacheCost = this.calculateCacheCost(phaseConfig.cache);
    const loadBalancerCost = this.calculateLoadBalancerCost(phaseConfig.loadBalancer);
    const storageCost = this.calculateStorageCost(phaseConfig.storage);
    const networkingCost = this.calculateNetworkingCost(phaseConfig.networking);
    const monitoringCost = this.calculateMonitoringCost(phaseConfig.monitoring);

    const totalMonthlyCost = computeCost + databaseCost + cacheCost + 
                           loadBalancerCost + storageCost + networkingCost + monitoringCost;

    return {
      provider: 'aws',
      scalingPhase,
      region,
      currency: 'USD',
      totalMonthlyCost,
      breakdown: {
        compute: computeCost,
        database: databaseCost,
        cache: cacheCost,
        loadBalancer: loadBalancerCost,
        storage: storageCost,
        networking: networkingCost,
        monitoring: monitoringCost
      },
      estimatedAt: new Date().toISOString()
    };
  }

  async getServiceRecommendations(
    scalingPhase: 'launch' | 'growth' | 'scale',
    config: InfrastructureConfig
  ): Promise<ServiceRecommendation[]> {
    const recommendations: ServiceRecommendation[] = [];

    // Compute recommendations
    recommendations.push({
      service: 'compute',
      recommendation: this.getComputeRecommendation(scalingPhase),
      reason: this.getComputeReason(scalingPhase),
      priority: 'high',
      estimatedSavings: this.getComputeSavings(scalingPhase)
    });

    // Database recommendations
    recommendations.push({
      service: 'database',
      recommendation: this.getDatabaseRecommendation(scalingPhase),
      reason: this.getDatabaseReason(scalingPhase),
      priority: 'high',
      estimatedSavings: this.getDatabaseSavings(scalingPhase)
    });

    // Cache recommendations
    recommendations.push({
      service: 'cache',
      recommendation: this.getCacheRecommendation(scalingPhase),
      reason: this.getCacheReason(scalingPhase),
      priority: 'medium',
      estimatedSavings: this.getCacheSavings(scalingPhase)
    });

    return recommendations;
  }

  async validateConfiguration(config: InfrastructureConfig): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate compute configuration
    if (!config.compute?.instanceType) {
      errors.push('Compute instance type is required');
    }

    // Validate database configuration
    if (!config.database?.engine) {
      errors.push('Database engine is required');
    }

    // Validate networking configuration
    if (!config.networking?.vpcCidr) {
      warnings.push('VPC CIDR not specified, using default');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  async getEnvironmentVariables(
    scalingPhase: 'launch' | 'growth' | 'scale',
    region: string
  ): Promise<Record<string, string>> {
    return {
      AWS_REGION: region,
      AWS_DEFAULT_REGION: region,
      CLOUD_PROVIDER: 'aws',
      SCALING_PHASE: scalingPhase,
      DATABASE_TYPE: 'rds',
      CACHE_TYPE: 'elasticache',
      LOAD_BALANCER_TYPE: 'alb',
      STORAGE_TYPE: 's3',
      MONITORING_TYPE: 'cloudwatch'
    };
  }

  async getMonitoringConfiguration(
    scalingPhase: 'launch' | 'growth' | 'scale'
  ): Promise<MonitoringConfig> {
    const awsConfig = this.awsConfig.getProviderConfig();
    const monitoringConfig = awsConfig.scalingPhases[scalingPhase].monitoring;

    return {
      provider: 'aws',
      service: 'cloudwatch',
      metrics: monitoringConfig.metrics,
      alarms: monitoringConfig.alarms,
      dashboards: monitoringConfig.dashboards,
      logs: monitoringConfig.logs,
      retentionDays: monitoringConfig.retentionDays,
      alerting: {
        enabled: true,
        channels: ['email', 'sns'],
        thresholds: monitoringConfig.alarms
      }
    };
  }

  private generateTerraformTemplate(
    scalingPhase: string,
    region: string,
    config: InfrastructureConfig,
    phaseConfig: any
  ): string {
    return `# AWS Infrastructure Template - ${scalingPhase} Phase
# Generated for region: ${region}

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "${region}"
}

# VPC Configuration
resource "aws_vpc" "main" {
  cidr_block           = "${phaseConfig.networking.vpc.cidr}"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "sikka-vpc-${scalingPhase}"
    Environment = "${scalingPhase}"
    Project = "sikka-transport"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "sikka-igw-${scalingPhase}"
  }
}

# Public Subnet
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "${phaseConfig.networking.subnets.public.cidr}"
  availability_zone       = "${region}a"
  map_public_ip_on_launch = true

  tags = {
    Name = "sikka-public-subnet-${scalingPhase}"
  }
}

# Private Subnet
resource "aws_subnet" "private" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "${phaseConfig.networking.subnets.private.cidr}"
  availability_zone = "${region}b"

  tags = {
    Name = "sikka-private-subnet-${scalingPhase}"
  }
}

# Route Table for Public Subnet
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "sikka-public-rt-${scalingPhase}"
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# Security Groups
resource "aws_security_group" "web" {
  name_prefix = "sikka-web-${scalingPhase}"
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
    Name = "sikka-web-sg-${scalingPhase}"
  }
}

# EC2 Instance
resource "aws_instance" "app" {
  ami           = "ami-0c02fb55956c7d316" # Amazon Linux 2
  instance_type = "${phaseConfig.compute.instanceType}"
  subnet_id     = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.web.id]

  user_data = <<-EOF
    #!/bin/bash
    yum update -y
    yum install -y docker
    systemctl start docker
    systemctl enable docker
    usermod -a -G docker ec2-user
  EOF

  tags = {
    Name = "sikka-app-${scalingPhase}"
    Environment = "${scalingPhase}"
  }
}

# RDS Database
resource "aws_db_instance" "main" {
  identifier = "sikka-db-${scalingPhase}"
  
  engine         = "${phaseConfig.database.engine}"
  engine_version = "${phaseConfig.database.version}"
  instance_class = "${phaseConfig.database.instanceClass}"
  
  allocated_storage     = ${phaseConfig.database.storage}
  max_allocated_storage = ${phaseConfig.database.maxStorage}
  
  db_name  = "sikka"
  username = "sikka_user"
  password = "change_me_in_production"
  
  vpc_security_group_ids = [aws_security_group.database.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  backup_retention_period = ${phaseConfig.database.backupRetention}
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  skip_final_snapshot = true
  
  tags = {
    Name = "sikka-db-${scalingPhase}"
  }
}

# ElastiCache Redis
resource "aws_elasticache_subnet_group" "main" {
  name       = "sikka-cache-subnet-${scalingPhase}"
  subnet_ids = [aws_subnet.private.id]
}

resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "sikka-redis-${scalingPhase}"
  engine               = "redis"
  node_type            = "${phaseConfig.cache.nodeType}"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.cache.id]

  tags = {
    Name = "sikka-redis-${scalingPhase}"
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "sikka-alb-${scalingPhase}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.web.id]
  subnets            = [aws_subnet.public.id]

  tags = {
    Name = "sikka-alb-${scalingPhase}"
  }
}

# S3 Bucket for Storage
resource "aws_s3_bucket" "main" {
  bucket = "sikka-storage-${scalingPhase}-\${random_id.bucket_suffix.hex}"

  tags = {
    Name = "sikka-storage-${scalingPhase}"
  }
}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "app" {
  name              = "/aws/ec2/sikka-${scalingPhase}"
  retention_in_days = ${phaseConfig.monitoring.retentionDays}

  tags = {
    Name = "sikka-logs-${scalingPhase}"
  }
}

# Outputs
output "vpc_id" {
  value = aws_vpc.main.id
}

output "instance_ip" {
  value = aws_instance.app.public_ip
}

output "database_endpoint" {
  value = aws_db_instance.main.endpoint
}

output "redis_endpoint" {
  value = aws_elasticache_cluster.redis.cache_nodes[0].address
}

output "load_balancer_dns" {
  value = aws_lb.main.dns_name
}

output "s3_bucket" {
  value = aws_s3_bucket.main.bucket
}
`;
  }

  private calculateComputeCost(computeConfig: any): number {
    // EC2 instance cost calculation
    const instanceCost = computeConfig.pricing.hourly * 24 * 30; // Monthly cost
    return instanceCost;
  }

  private calculateDatabaseCost(databaseConfig: any): number {
    // RDS instance cost calculation
    const instanceCost = databaseConfig.pricing.hourly * 24 * 30;
    const storageCost = databaseConfig.storage * databaseConfig.pricing.storage;
    return instanceCost + storageCost;
  }

  private calculateCacheCost(cacheConfig: any): number {
    // ElastiCache cost calculation
    return cacheConfig.pricing.hourly * 24 * 30;
  }

  private calculateLoadBalancerCost(lbConfig: any): number {
    // ALB cost calculation
    return lbConfig.pricing.monthly;
  }

  private calculateStorageCost(storageConfig: any): number {
    // S3 storage cost calculation
    return storageConfig.pricing.perGB * storageConfig.defaultSize;
  }

  private calculateNetworkingCost(networkingConfig: any): number {
    // Data transfer and NAT gateway costs
    return networkingConfig.pricing.dataTransfer + networkingConfig.pricing.natGateway;
  }

  private calculateMonitoringCost(monitoringConfig: any): number {
    // CloudWatch costs
    return monitoringConfig.pricing.monthly;
  }

  private getResourceList(scalingPhase: string, phaseConfig: any): string[] {
    return [
      `EC2 Instance (${phaseConfig.compute.instanceType})`,
      `RDS ${phaseConfig.database.engine} (${phaseConfig.database.instanceClass})`,
      `ElastiCache Redis (${phaseConfig.cache.nodeType})`,
      'Application Load Balancer',
      'S3 Bucket',
      'VPC with Public/Private Subnets',
      'Security Groups',
      'CloudWatch Monitoring'
    ];
  }

  private getComputeRecommendation(scalingPhase: string): string {
    switch (scalingPhase) {
      case 'launch':
        return 'Use t3.micro for cost optimization during initial launch';
      case 'growth':
        return 'Upgrade to c5.large for better performance with growing user base';
      case 'scale':
        return 'Use c5.xlarge with auto-scaling for high-traffic scenarios';
      default:
        return 'Use appropriate instance type for your scaling phase';
    }
  }

  private getComputeReason(scalingPhase: string): string {
    switch (scalingPhase) {
      case 'launch':
        return 'T3 instances provide burstable performance suitable for variable workloads';
      case 'growth':
        return 'C5 instances offer consistent high performance for steady traffic';
      case 'scale':
        return 'Larger instances with auto-scaling handle traffic spikes efficiently';
      default:
        return 'Instance type should match expected workload characteristics';
    }
  }

  private getComputeSavings(scalingPhase: string): number {
    switch (scalingPhase) {
      case 'launch':
        return 0; // Baseline
      case 'growth':
        return 15; // 15% savings with reserved instances
      case 'scale':
        return 25; // 25% savings with spot instances and reserved capacity
      default:
        return 0;
    }
  }

  private getDatabaseRecommendation(scalingPhase: string): string {
    switch (scalingPhase) {
      case 'launch':
        return 'Use db.t3.micro for initial deployment';
      case 'growth':
        return 'Upgrade to db.t3.medium with read replica';
      case 'scale':
        return 'Use db.r5.large with multi-AZ and multiple read replicas';
      default:
        return 'Choose database instance based on expected load';
    }
  }

  private getDatabaseReason(scalingPhase: string): string {
    switch (scalingPhase) {
      case 'launch':
        return 'T3 micro provides sufficient performance for initial user base';
      case 'growth':
        return 'Medium instance with read replica improves read performance';
      case 'scale':
        return 'R5 instances optimized for memory-intensive database workloads';
      default:
        return 'Database sizing should match application requirements';
    }
  }

  private getDatabaseSavings(scalingPhase: string): number {
    switch (scalingPhase) {
      case 'launch':
        return 0;
      case 'growth':
        return 20; // Reserved instance savings
      case 'scale':
        return 30; // Multi-year reserved instance savings
      default:
        return 0;
    }
  }

  private getCacheRecommendation(scalingPhase: string): string {
    switch (scalingPhase) {
      case 'launch':
        return 'Use cache.t3.micro for basic caching needs';
      case 'growth':
        return 'Upgrade to cache.m5.large for better performance';
      case 'scale':
        return 'Use cache.r6g.xlarge with clustering for high availability';
      default:
        return 'Size cache based on application caching requirements';
    }
  }

  private getCacheReason(scalingPhase: string): string {
    switch (scalingPhase) {
      case 'launch':
        return 'Basic caching sufficient for initial user sessions';
      case 'growth':
        return 'Larger cache improves application response times';
      case 'scale':
        return 'Clustered cache provides high availability and performance';
      default:
        return 'Cache sizing should match session and data caching needs';
    }
  }

  private getCacheSavings(scalingPhase: string): number {
    switch (scalingPhase) {
      case 'launch':
        return 0;
      case 'growth':
        return 10; // Reserved node savings
      case 'scale':
        return 20; // Long-term reserved node savings
      default:
        return 0;
    }
  }
}

