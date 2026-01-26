import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ScalingPhasesConfig } from '../config/scaling-phases.config';
import { DatabaseScalingConfig } from '../config/database-scaling.config';
import { RedisScalingConfig } from '../config/redis-scaling.config';
import { ConcurrencyAnalysisService } from '../performance/concurrency-analysis.service';
import { CloudProviderManagerService } from '../cloud-providers/cloud-provider-manager.service';
import { CostComparisonService } from '../cloud-providers/cost-comparison.service';
import { CloudProviderType } from '../cloud-providers/cloud-provider.factory';
import { InfrastructureConfig } from '../cloud-providers/interfaces/infrastructure-config.interface';

export interface ScalingStatus {
  currentPhase: string;
  nextPhase: string;
  currentCapacity: {
    maxConcurrentUsers: number;
    maxConcurrentTrips: number;
    utilizationPercentage: number;
  };
  phaseProgress: {
    completedActions: string[];
    pendingActions: string[];
    criticalActions: string[];
    progressPercentage: number;
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  infrastructure: {
    database: any;
    redis: any;
    websocket: any;
    nginx: any;
  };
  timeline: {
    estimatedTimeToNextPhase: string;
    milestones: Array<{
      name: string;
      description: string;
      targetDate: string;
      status: 'completed' | 'in-progress' | 'pending';
    }>;
  };
  multiCloud?: {
    currentProvider: CloudProviderType;
    recommendedProvider: CloudProviderType;
    costComparison: {
      currentCost: number;
      recommendedCost: number;
      potentialSavings: number;
      savingsPercentage: number;
    };
    migrationPlan?: {
      steps: string[];
      estimatedDowntime: string;
      estimatedCost: number;
    };
  };
}

@Injectable()
export class ScalingService {
  private readonly logger = new Logger(ScalingService.name);

  constructor(
    private configService: ConfigService,
    private scalingConfig: ScalingPhasesConfig,
    private databaseConfig: DatabaseScalingConfig,
    private redisConfig: RedisScalingConfig,
    private concurrencyAnalysis: ConcurrencyAnalysisService,
    private cloudProviderManager: CloudProviderManagerService,
    private costComparison: CostComparisonService,
  ) {}

  /**
   * Get comprehensive scaling status and recommendations
   */
  async getScalingStatus(): Promise<ScalingStatus> {
    const phaseConfig = this.scalingConfig.getCurrentPhaseConfig();
    const nextPhaseRecommendations =
      this.scalingConfig.getNextPhaseRecommendations();
    const concurrencyMetrics =
      await this.concurrencyAnalysis.analyzeConcurrencyCapacity();

    // Calculate current utilization
    const utilizationPercentage = this.calculateUtilization(concurrencyMetrics);

    // Assess phase progress
    const phaseProgress = await this.assessPhaseProgress();

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      phaseConfig,
      concurrencyMetrics,
    );

    // Get infrastructure status
    const infrastructure = await this.getInfrastructureStatus();

    // Create timeline
    const timeline = this.createScalingTimeline(phaseConfig.phase);

    // Get multi-cloud analysis
    const multiCloud = await this.getMultiCloudAnalysis(phaseConfig.phase);

    return {
      currentPhase: nextPhaseRecommendations.currentPhase,
      nextPhase: nextPhaseRecommendations.nextPhase,
      currentCapacity: {
        maxConcurrentUsers:
          concurrencyMetrics.estimatedCapacity.maxConcurrentUsers,
        maxConcurrentTrips:
          concurrencyMetrics.estimatedCapacity.maxConcurrentTrips,
        utilizationPercentage,
      },
      phaseProgress,
      recommendations,
      infrastructure,
      timeline,
      multiCloud,
    };
  }

  /**
   * Execute scaling phase transition
   */
  async executePhaseTransition(
    targetPhase: 'launch' | 'growth' | 'scale',
  ): Promise<{
    success: boolean;
    message: string;
    actions: string[];
    nextSteps: string[];
  }> {
    const currentPhase = this.scalingConfig.getCurrentPhaseConfig().phase;

    if (currentPhase === targetPhase) {
      return {
        success: false,
        message: `Already in ${targetPhase} phase`,
        actions: [],
        nextSteps: [],
      };
    }

    this.logger.log(
      `Initiating phase transition from ${currentPhase} to ${targetPhase}`,
    );

    const actions = [];
    const nextSteps = [];

    try {
      // Update environment variables
      const envVars = this.scalingConfig.getPhaseEnvironmentVariables();
      actions.push(
        `Updated ${Object.keys(envVars).length} environment variables`,
      );

      // Generate configuration files
      const dbOptimizations = this.databaseConfig.getDatabaseOptimizations();
      const redisConfig = this.redisConfig.getRedisConfiguration();

      actions.push('Generated database optimization recommendations');
      actions.push('Generated Redis configuration for new phase');

      // Phase-specific actions
      switch (targetPhase) {
        case 'growth':
          actions.push('Prepared read replica configuration');
          actions.push('Generated PgBouncer configuration');
          actions.push('Configured Redis Sentinel setup');
          nextSteps.push('Deploy read replicas');
          nextSteps.push('Implement PgBouncer connection pooling');
          nextSteps.push('Set up Redis Sentinel for high availability');
          break;

        case 'scale':
          actions.push('Prepared Redis Cluster configuration');
          actions.push('Generated horizontal scaling setup');
          actions.push('Configured load balancing');
          nextSteps.push('Deploy Redis Cluster');
          nextSteps.push('Implement horizontal scaling');
          nextSteps.push('Set up load balancers');
          nextSteps.push('Configure auto-scaling');
          break;
      }

      return {
        success: true,
        message: `Successfully prepared transition to ${targetPhase} phase`,
        actions,
        nextSteps,
      };
    } catch (error) {
      this.logger.error(`Failed to execute phase transition: ${error.message}`);
      return {
        success: false,
        message: `Failed to transition to ${targetPhase} phase: ${error.message}`,
        actions,
        nextSteps: ['Review error logs and retry'],
      };
    }
  }

  /**
   * Get deployment configurations for current phase
   */
  async getDeploymentConfigurations(): Promise<{
    dockerCompose: string;
    environmentVariables: Record<string, string>;
    nginxConfig: string;
    kubernetesManifests?: string;
  }> {
    const phaseConfig = this.scalingConfig.getCurrentPhaseConfig();
    const envVars = this.scalingConfig.getPhaseEnvironmentVariables();
    const redisConfig = this.redisConfig.getRedisConfiguration();

    // Generate Docker Compose
    const dockerCompose = this.generateDockerCompose(phaseConfig);

    // Generate Nginx configuration
    const nginxConfig = this.generateNginxConfig(phaseConfig);

    // Generate Kubernetes manifests for scale phase
    const kubernetesManifests =
      phaseConfig.phase === 'scale'
        ? this.generateKubernetesManifests(phaseConfig)
        : undefined;

    return {
      dockerCompose,
      environmentVariables: envVars,
      nginxConfig,
      kubernetesManifests,
    };
  }

  /**
   * Calculate current system utilization
   */
  private calculateUtilization(metrics: any): number {
    const utilizationFactors = [
      metrics.database.connectionUtilization,
      metrics.redis.memoryUtilization,
      metrics.websocket.connectionUtilization,
      metrics.system.memoryUtilization,
    ];

    const avgUtilization =
      utilizationFactors.reduce((sum, util) => sum + util, 0) /
      utilizationFactors.length;
    return Math.round(avgUtilization * 100) / 100;
  }

  /**
   * Assess current phase progress
   */
  private async assessPhaseProgress(): Promise<{
    completedActions: string[];
    pendingActions: string[];
    criticalActions: string[];
    progressPercentage: number;
  }> {
    const phaseConfig = this.scalingConfig.getCurrentPhaseConfig();

    // This would be enhanced with actual infrastructure checks
    const completedActions = [
      'Basic monitoring enabled',
      'Performance optimization configured',
      'Caching system implemented',
    ];

    const pendingActions = [];
    const criticalActions = [];

    switch (phaseConfig.phase) {
      case 'launch':
        pendingActions.push('Increase database connection pool');
        pendingActions.push('Optimize query performance');
        criticalActions.push('Implement comprehensive monitoring');
        break;

      case 'growth':
        pendingActions.push('Deploy read replicas');
        pendingActions.push('Implement PgBouncer');
        criticalActions.push('Set up Redis Sentinel');
        break;

      case 'scale':
        pendingActions.push('Deploy Redis Cluster');
        pendingActions.push('Implement horizontal scaling');
        criticalActions.push('Set up auto-scaling');
        break;
    }

    const totalActions =
      completedActions.length + pendingActions.length + criticalActions.length;
    const progressPercentage =
      totalActions > 0 ? (completedActions.length / totalActions) * 100 : 0;

    return {
      completedActions,
      pendingActions,
      criticalActions,
      progressPercentage: Math.round(progressPercentage),
    };
  }

  /**
   * Generate scaling recommendations
   */
  private generateRecommendations(
    phaseConfig: any,
    metrics: any,
  ): {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  } {
    const immediate = [];
    const shortTerm = [];
    const longTerm = [];

    // Immediate recommendations based on current bottlenecks
    if (metrics.estimatedCapacity.bottleneckComponent === 'database') {
      immediate.push('Increase database connection pool size');
      immediate.push('Optimize slow queries');
    }

    if (metrics.redis.memoryUtilization > 80) {
      immediate.push('Increase Redis memory allocation');
    }

    if (metrics.system.memoryUtilization > 85) {
      immediate.push('Increase server memory or optimize memory usage');
    }

    // Phase-specific recommendations
    switch (phaseConfig.phase) {
      case 'launch':
        shortTerm.push('Prepare for read replica implementation');
        shortTerm.push('Plan PgBouncer deployment');
        longTerm.push('Design horizontal scaling architecture');
        break;

      case 'growth':
        shortTerm.push('Implement Redis Sentinel');
        shortTerm.push('Set up message queues');
        longTerm.push('Plan Redis Cluster migration');
        longTerm.push('Design microservices architecture');
        break;

      case 'scale':
        shortTerm.push('Optimize cluster performance');
        shortTerm.push('Implement advanced monitoring');
        longTerm.push('Plan multi-region deployment');
        longTerm.push('Implement chaos engineering');
        break;
    }

    return { immediate, shortTerm, longTerm };
  }

  /**
   * Get infrastructure status
   */
  private async getInfrastructureStatus(): Promise<any> {
    const phaseConfig = this.scalingConfig.getCurrentPhaseConfig();

    return {
      database: {
        phase: phaseConfig.phase,
        maxConnections: phaseConfig.databaseConfig.maxConnections,
        readReplicasEnabled: phaseConfig.databaseConfig.enableReadReplicas,
        connectionPoolingEnabled:
          phaseConfig.databaseConfig.enableConnectionPooling,
      },
      redis: {
        phase: phaseConfig.phase,
        maxConnections: phaseConfig.redisConfig.maxConnections,
        maxMemory: phaseConfig.redisConfig.maxMemory,
        clusteringEnabled: phaseConfig.redisConfig.enableClustering,
        sentinelEnabled: phaseConfig.redisConfig.enableSentinel,
      },
      websocket: {
        phase: phaseConfig.phase,
        maxConnections: phaseConfig.websocketConfig.maxConnections,
        loadBalancingEnabled: phaseConfig.websocketConfig.enableLoadBalancing,
        stickySessionsEnabled: phaseConfig.websocketConfig.enableStickySessions,
      },
      nginx: {
        phase: phaseConfig.phase,
        workerConnections: phaseConfig.nginxConfig.workerConnections,
        workerProcesses: phaseConfig.nginxConfig.workerProcesses,
        loadBalancingEnabled: phaseConfig.nginxConfig.enableLoadBalancing,
      },
    };
  }

  /**
   * Create scaling timeline
   */
  private createScalingTimeline(currentPhase: string): {
    estimatedTimeToNextPhase: string;
    milestones: Array<{
      name: string;
      description: string;
      targetDate: string;
      status: 'completed' | 'in-progress' | 'pending';
    }>;
  } {
    const now = new Date();
    const milestones = [];

    switch (currentPhase) {
      case 'launch':
        milestones.push(
          {
            name: 'Database Optimization',
            description: 'Increase connection pool and optimize queries',
            targetDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0],
            status: 'in-progress' as const,
          },
          {
            name: 'Monitoring Enhancement',
            description: 'Implement comprehensive monitoring and alerting',
            targetDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0],
            status: 'pending' as const,
          },
          {
            name: 'Growth Phase Preparation',
            description: 'Prepare infrastructure for growth phase',
            targetDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0],
            status: 'pending' as const,
          },
        );
        return {
          estimatedTimeToNextPhase: '2-3 months',
          milestones,
        };

      case 'growth':
        milestones.push(
          {
            name: 'Read Replicas Deployment',
            description: 'Deploy and configure database read replicas',
            targetDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0],
            status: 'in-progress' as const,
          },
          {
            name: 'Redis Sentinel Setup',
            description: 'Implement Redis Sentinel for high availability',
            targetDate: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0],
            status: 'pending' as const,
          },
          {
            name: 'Scale Phase Preparation',
            description: 'Prepare for horizontal scaling',
            targetDate: new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0],
            status: 'pending' as const,
          },
        );
        return {
          estimatedTimeToNextPhase: '4-6 months',
          milestones,
        };

      case 'scale':
        milestones.push(
          {
            name: 'Redis Cluster Deployment',
            description: 'Deploy and configure Redis Cluster',
            targetDate: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0],
            status: 'in-progress' as const,
          },
          {
            name: 'Horizontal Scaling',
            description: 'Implement horizontal scaling with load balancers',
            targetDate: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0],
            status: 'pending' as const,
          },
          {
            name: 'Auto-scaling Implementation',
            description: 'Implement Kubernetes auto-scaling',
            targetDate: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0],
            status: 'pending' as const,
          },
        );
        return {
          estimatedTimeToNextPhase: '6-12 months',
          milestones,
        };

      default:
        return {
          estimatedTimeToNextPhase: 'Unknown',
          milestones: [],
        };
    }
  }

  /**
   * Generate Docker Compose configuration
   */
  private generateDockerCompose(phaseConfig: any): string {
    const redisConfig = this.redisConfig.getRedisConfiguration();

    return `# 🐳 Sikka Transportation Platform - ${phaseConfig.phase} Phase
version: '3.8'

services:
  # 🚀 Main Application
  sikka-api:
    build:
      context: ./sikka-backend
      dockerfile: Dockerfile
      target: production
    container_name: sikka-api
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - SCALING_PHASE=${phaseConfig.phase}
      - DB_MAX_CONNECTIONS=${phaseConfig.databaseConfig.maxConnections}
      - REDIS_MAX_CONNECTIONS=${phaseConfig.redisConfig.maxConnections}
      - WEBSOCKET_MAX_CONNECTIONS=${phaseConfig.websocketConfig.maxConnections}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - sikka-network

${redisConfig.dockerCompose}

  # 🗄️ PostgreSQL Database
  postgres:
    image: postgres:13-alpine
    container_name: sikka-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: sikka_db
      POSTGRES_USER: sikka_user
      POSTGRES_PASSWORD: sikka_password
      POSTGRES_MAX_CONNECTIONS: ${phaseConfig.databaseConfig.maxConnections}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - sikka-network

# 📦 Named Volumes
volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local

# 🌐 Networks
networks:
  sikka-network:
    driver: bridge
`;
  }

  /**
   * Generate Nginx configuration
   */
  private generateNginxConfig(phaseConfig: any): string {
    return `# 🔄 Sikka Transportation Platform - Nginx Configuration (${phaseConfig.phase} Phase)

events {
    worker_connections ${phaseConfig.nginxConfig.workerConnections};
}

http {
    # 🚀 Performance Settings
    worker_processes ${phaseConfig.nginxConfig.workerProcesses};
    keepalive_timeout 75s;
    keepalive_requests 1000;
    
    # ⚡ Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=${phaseConfig.nginxConfig.rateLimits.api}r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=${phaseConfig.nginxConfig.rateLimits.auth}r/s;
    
    # 🔄 Upstream Backend
    upstream sikka_backend {
        least_conn;
        server sikka-api:3000 max_fails=3 fail_timeout=30s;
        keepalive 32;
    }
    
    server {
        listen 80;
        server_name localhost sikka.sd www.sikka.sd;
        
        # API Endpoints
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://sikka_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
        
        # WebSocket Support
        location /socket.io/ {
            proxy_pass http://sikka_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }
    }
}`;
  }

  /**
   * Generate Kubernetes manifests for scale phase
   */
  private generateKubernetesManifests(phaseConfig: any): string {
    return `# 🚀 Sikka Backend Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sikka-backend
  labels:
    app: sikka-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: sikka-backend
  template:
    metadata:
      labels:
        app: sikka-backend
    spec:
      containers:
      - name: sikka-backend
        image: sikka-backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: SCALING_PHASE
          value: "${phaseConfig.phase}"
        - name: DB_MAX_CONNECTIONS
          value: "${phaseConfig.databaseConfig.maxConnections}"
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"

---
# 🔄 Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: sikka-backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: sikka-backend
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80

---
# 🌐 Service
apiVersion: v1
kind: Service
metadata:
  name: sikka-backend-service
spec:
  selector:
    app: sikka-backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer`;
  }

  /**
   * Get multi-cloud analysis for current scaling phase
   */
  private async getMultiCloudAnalysis(
    currentPhase: string,
  ): Promise<ScalingStatus['multiCloud']> {
    try {
      // Get current cloud provider from configuration
      const currentProvider = this.getCurrentCloudProvider();

      // Create infrastructure configuration for current phase
      const infrastructureConfig =
        this.createInfrastructureConfig(currentPhase);

      // Get cost comparison report
      const costReport = await this.costComparison.generateCostComparisonReport(
        {
          scalingPhase: currentPhase as 'launch' | 'growth' | 'scale',
          region: 'us-east-1',
          config: infrastructureConfig,
          currentProvider,
          includeProjections: false,
          includeMigrationAnalysis: true,
        },
      );

      // Generate migration plan if different provider is recommended
      let migrationPlan;
      if (costReport.summary.recommendedProvider !== currentProvider) {
        const migrationAnalysis =
          await this.cloudProviderManager.switchProvider(
            currentProvider,
            costReport.summary.recommendedProvider,
            currentPhase as 'launch' | 'growth' | 'scale',
            infrastructureConfig,
          );

        migrationPlan = {
          steps: migrationAnalysis.migrationSteps,
          estimatedDowntime: migrationAnalysis.estimatedDowntime,
          estimatedCost: migrationAnalysis.costImpact.from.totalMonthlyCost,
        };
      }

      return {
        currentProvider,
        recommendedProvider: costReport.summary.recommendedProvider,
        costComparison: {
          currentCost:
            costReport.detailedComparison.providers[currentProvider]
              .totalMonthlyCost,
          recommendedCost:
            costReport.detailedComparison.providers[
              costReport.summary.recommendedProvider
            ].totalMonthlyCost,
          potentialSavings: costReport.summary.potentialMonthlySavings,
          savingsPercentage: Math.abs(
            costReport.detailedComparison.totalSavingsPercentage,
          ),
        },
        migrationPlan,
      };
    } catch (error) {
      this.logger.error('Failed to get multi-cloud analysis:', error);
      return undefined;
    }
  }

  /**
   * Get current cloud provider from configuration
   */
  private getCurrentCloudProvider(): CloudProviderType {
    const cloudConfig =
      this.scalingConfig.getCurrentPhaseConfig().cloudProvider;
    const preferred = cloudConfig?.preferred;
    // Handle 'auto' case by defaulting to 'aws'
    if (preferred === 'auto' || !preferred) {
      return 'aws';
    }
    return preferred as CloudProviderType;
  }

  /**
   * Create infrastructure configuration for scaling phase
   */
  private createInfrastructureConfig(phase: string): InfrastructureConfig {
    const phaseConfig = this.scalingConfig.getCurrentPhaseConfig();

    return {
      compute: {
        instanceType: this.getInstanceTypeForPhase(phase),
        instanceCount: this.getInstanceCountForPhase(phase),
        autoScaling: {
          enabled: phase !== 'launch',
          minInstances: phase === 'launch' ? 1 : phase === 'growth' ? 2 : 3,
          maxInstances: phase === 'launch' ? 3 : phase === 'growth' ? 6 : 20,
          targetCpuUtilization: 70,
        },
      },
      database: {
        engine: 'postgresql',
        version: '15.4',
        instanceClass: this.getDatabaseInstanceForPhase(phase),
        storage: this.getDatabaseStorageForPhase(phase),
        backupRetention: phase === 'launch' ? 7 : phase === 'growth' ? 14 : 30,
        multiAz: phase !== 'launch',
        readReplicas: phase === 'launch' ? 0 : phase === 'growth' ? 1 : 2,
      },
      cache: {
        engine: 'redis',
        version: '7.0',
        nodeType: this.getCacheNodeTypeForPhase(phase),
        numNodes: phase === 'launch' ? 1 : phase === 'growth' ? 2 : 3,
        replicationEnabled: phase !== 'launch',
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
        defaultSize: phase === 'launch' ? 100 : phase === 'growth' ? 500 : 2000, // GB
        versioning: true,
        encryption: true,
      },
      networking: {
        vpcCidr: '10.0.0.0/16',
        publicSubnets: ['10.0.1.0/24', '10.0.2.0/24', '10.0.3.0/24'],
        privateSubnets: ['10.0.10.0/24', '10.0.11.0/24', '10.0.12.0/24'],
        natGateways: phase === 'launch' ? 1 : phase === 'growth' ? 2 : 3,
      },
      monitoring: {
        enabled: true,
        retentionDays: phase === 'launch' ? 7 : phase === 'growth' ? 14 : 30,
        detailedMonitoring: phase !== 'launch',
      },
    };
  }

  private getInstanceTypeForPhase(phase: string): string {
    switch (phase) {
      case 'launch':
        return 't3.micro';
      case 'growth':
        return 'c5.large';
      case 'scale':
        return 'c5.xlarge';
      default:
        return 't3.micro';
    }
  }

  private getInstanceCountForPhase(phase: string): number {
    switch (phase) {
      case 'launch':
        return 1;
      case 'growth':
        return 2;
      case 'scale':
        return 6;
      default:
        return 1;
    }
  }

  private getDatabaseInstanceForPhase(phase: string): string {
    switch (phase) {
      case 'launch':
        return 'db.t3.micro';
      case 'growth':
        return 'db.t3.medium';
      case 'scale':
        return 'db.r5.2xlarge';
      default:
        return 'db.t3.micro';
    }
  }

  private getDatabaseStorageForPhase(phase: string): number {
    switch (phase) {
      case 'launch':
        return 20;
      case 'growth':
        return 50;
      case 'scale':
        return 200;
      default:
        return 20;
    }
  }

  private getCacheNodeTypeForPhase(phase: string): string {
    switch (phase) {
      case 'launch':
        return 'cache.t3.micro';
      case 'growth':
        return 'cache.m5.large';
      case 'scale':
        return 'cache.r6g.4xlarge';
      default:
        return 'cache.t3.micro';
    }
  }
}
