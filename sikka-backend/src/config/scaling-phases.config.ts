import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ScalingPhaseConfig {
  phase: 'launch' | 'growth' | 'scale';
  expectedUsers: number;
  maxConcurrentUsers: number;
  maxConcurrentTrips: number;
  databaseConfig: {
    maxConnections: number;
    poolSize: number;
    enableReadReplicas: boolean;
    enableConnectionPooling: boolean;
  };
  redisConfig: {
    maxConnections: number;
    maxMemory: string;
    enableClustering: boolean;
    enableSentinel: boolean;
  };
  websocketConfig: {
    maxConnections: number;
    enableLoadBalancing: boolean;
    enableStickySessions: boolean;
  };
  nginxConfig: {
    workerConnections: number;
    workerProcesses: number;
    enableLoadBalancing: boolean;
    rateLimits: {
      api: number;
      auth: number;
    };
  };
  monitoringConfig: {
    enableAdvancedMetrics: boolean;
    enableAlerting: boolean;
    enablePerformanceOptimization: boolean;
  };
  features: {
    enableCaching: boolean;
    enableMessageQueues: boolean;
    enableCDN: boolean;
    enableAutoScaling: boolean;
  };
  // Multi-cloud configuration
  cloudProvider?: {
    preferred: 'aws' | 'linode' | 'auto';
    fallback?: 'aws' | 'linode';
    costOptimization: boolean;
    regionPreferences: string[];
    deploymentStrategy: 'single-cloud' | 'multi-cloud' | 'hybrid';
    providerSpecific?: {
      aws?: AwsProviderConfig;
      linode?: LinodeProviderConfig;
    };
  };
}

export interface AwsProviderConfig {
  region: string;
  instanceTypes: {
    compute: string;
    database: string;
    cache: string;
  };
  useSpotInstances: boolean;
  useReservedInstances: boolean;
  enableCloudWatch: boolean;
  enableCloudTrail: boolean;
}

export interface LinodeProviderConfig {
  region: string;
  instanceTypes: {
    compute: string;
    database: string;
  };
  useDedicatedCpu: boolean;
  enableLongview: boolean;
  enableCloudFirewall: boolean;
}

@Injectable()
export class ScalingPhasesConfig {
  constructor(private configService: ConfigService) {}

  /**
   * Get configuration for current scaling phase
   */
  getCurrentPhaseConfig(): ScalingPhaseConfig {
    const currentPhase = this.configService.get('SCALING_PHASE', 'launch') as
      | 'launch'
      | 'growth'
      | 'scale';

    switch (currentPhase) {
      case 'launch':
        return this.getLaunchPhaseConfig();
      case 'growth':
        return this.getGrowthPhaseConfig();
      case 'scale':
        return this.getScalePhaseConfig();
      default:
        return this.getLaunchPhaseConfig();
    }
  }

  /**
   * Phase 1: Launch Configuration (1,000-2,000 concurrent users)
   * Focus: Stability, monitoring, and basic optimizations
   */
  private getLaunchPhaseConfig(): ScalingPhaseConfig {
    return {
      phase: 'launch',
      expectedUsers: 2000,
      maxConcurrentUsers: 2000,
      maxConcurrentTrips: 600,
      databaseConfig: {
        maxConnections: 30, // Increased from 20
        poolSize: 25,
        enableReadReplicas: false,
        enableConnectionPooling: false,
      },
      redisConfig: {
        maxConnections: 5000,
        maxMemory: '1gb',
        enableClustering: false,
        enableSentinel: false,
      },
      websocketConfig: {
        maxConnections: 5000,
        enableLoadBalancing: false,
        enableStickySessions: false,
      },
      nginxConfig: {
        workerConnections: 1024,
        workerProcesses: 4,
        enableLoadBalancing: false,
        rateLimits: {
          api: 15, // Increased from 10
          auth: 8, // Increased from 5
        },
      },
      monitoringConfig: {
        enableAdvancedMetrics: true,
        enableAlerting: true,
        enablePerformanceOptimization: true,
      },
      features: {
        enableCaching: true,
        enableMessageQueues: false,
        enableCDN: false,
        enableAutoScaling: false,
      },
    };
  }

  /**
   * Phase 2: Growth Configuration (3,000-5,000 concurrent users)
   * Focus: Database scaling, read replicas, advanced caching
   */
  private getGrowthPhaseConfig(): ScalingPhaseConfig {
    return {
      phase: 'growth',
      expectedUsers: 5000,
      maxConcurrentUsers: 5000,
      maxConcurrentTrips: 1500,
      databaseConfig: {
        maxConnections: 75, // Significantly increased
        poolSize: 60,
        enableReadReplicas: true, // Enable read replicas
        enableConnectionPooling: true, // Enable PgBouncer
      },
      redisConfig: {
        maxConnections: 10000,
        maxMemory: '4gb', // Increased memory
        enableClustering: false,
        enableSentinel: true, // Enable high availability
      },
      websocketConfig: {
        maxConnections: 8000,
        enableLoadBalancing: false,
        enableStickySessions: true, // Enable sticky sessions
      },
      nginxConfig: {
        workerConnections: 2048, // Doubled
        workerProcesses: 8,
        enableLoadBalancing: false,
        rateLimits: {
          api: 25, // Increased rate limits
          auth: 12,
        },
      },
      monitoringConfig: {
        enableAdvancedMetrics: true,
        enableAlerting: true,
        enablePerformanceOptimization: true,
      },
      features: {
        enableCaching: true,
        enableMessageQueues: true, // Enable message queues
        enableCDN: true, // Enable CDN
        enableAutoScaling: false,
      },
    };
  }

  /**
   * Phase 3: Scale Configuration (10,000+ concurrent users)
   * Focus: Horizontal scaling, clustering, auto-scaling
   */
  private getScalePhaseConfig(): ScalingPhaseConfig {
    return {
      phase: 'scale',
      expectedUsers: 15000,
      maxConcurrentUsers: 15000,
      maxConcurrentTrips: 4500,
      databaseConfig: {
        maxConnections: 150, // High connection count
        poolSize: 120,
        enableReadReplicas: true,
        enableConnectionPooling: true,
      },
      redisConfig: {
        maxConnections: 20000,
        maxMemory: '8gb', // High memory allocation
        enableClustering: true, // Enable Redis clustering
        enableSentinel: true,
      },
      websocketConfig: {
        maxConnections: 15000,
        enableLoadBalancing: true, // Enable WebSocket load balancing
        enableStickySessions: true,
      },
      nginxConfig: {
        workerConnections: 4096, // High connection count
        workerProcesses: 16,
        enableLoadBalancing: true, // Enable Nginx load balancing
        rateLimits: {
          api: 50, // High rate limits
          auth: 25,
        },
      },
      monitoringConfig: {
        enableAdvancedMetrics: true,
        enableAlerting: true,
        enablePerformanceOptimization: true,
      },
      features: {
        enableCaching: true,
        enableMessageQueues: true,
        enableCDN: true,
        enableAutoScaling: true, // Enable auto-scaling
      },
    };
  }

  /**
   * Get environment variables for current phase
   */
  getPhaseEnvironmentVariables(): Record<string, string> {
    const config = this.getCurrentPhaseConfig();

    return {
      // Database configuration
      DB_MAX_CONNECTIONS: config.databaseConfig.maxConnections.toString(),
      DB_POOL_SIZE: config.databaseConfig.poolSize.toString(),
      DB_ENABLE_READ_REPLICAS:
        config.databaseConfig.enableReadReplicas.toString(),
      DB_ENABLE_CONNECTION_POOLING:
        config.databaseConfig.enableConnectionPooling.toString(),

      // Redis configuration
      REDIS_MAX_CONNECTIONS: config.redisConfig.maxConnections.toString(),
      REDIS_MAX_MEMORY: config.redisConfig.maxMemory,
      REDIS_ENABLE_CLUSTERING: config.redisConfig.enableClustering.toString(),
      REDIS_ENABLE_SENTINEL: config.redisConfig.enableSentinel.toString(),

      // WebSocket configuration
      WEBSOCKET_MAX_CONNECTIONS:
        config.websocketConfig.maxConnections.toString(),
      WEBSOCKET_ENABLE_LOAD_BALANCING:
        config.websocketConfig.enableLoadBalancing.toString(),
      WEBSOCKET_ENABLE_STICKY_SESSIONS:
        config.websocketConfig.enableStickySessions.toString(),

      // Nginx configuration
      NGINX_WORKER_CONNECTIONS: config.nginxConfig.workerConnections.toString(),
      NGINX_WORKER_PROCESSES: config.nginxConfig.workerProcesses.toString(),
      NGINX_ENABLE_LOAD_BALANCING:
        config.nginxConfig.enableLoadBalancing.toString(),
      NGINX_RATE_LIMIT_API: config.nginxConfig.rateLimits.api.toString(),
      NGINX_RATE_LIMIT_AUTH: config.nginxConfig.rateLimits.auth.toString(),

      // Feature flags
      ENABLE_CACHING: config.features.enableCaching.toString(),
      ENABLE_MESSAGE_QUEUES: config.features.enableMessageQueues.toString(),
      ENABLE_CDN: config.features.enableCDN.toString(),
      ENABLE_AUTO_SCALING: config.features.enableAutoScaling.toString(),

      // Monitoring
      ENABLE_ADVANCED_METRICS:
        config.monitoringConfig.enableAdvancedMetrics.toString(),
      ENABLE_ALERTING: config.monitoringConfig.enableAlerting.toString(),
      ENABLE_PERFORMANCE_OPTIMIZATION:
        config.monitoringConfig.enablePerformanceOptimization.toString(),
    };
  }

  /**
   * Get scaling recommendations for next phase
   */
  getNextPhaseRecommendations(): {
    currentPhase: string;
    nextPhase: string;
    recommendations: string[];
    estimatedTimeframe: string;
    criticalActions: string[];
  } {
    const currentConfig = this.getCurrentPhaseConfig();

    switch (currentConfig.phase) {
      case 'launch':
        return {
          currentPhase: 'Launch (1,000-2,000 users)',
          nextPhase: 'Growth (3,000-5,000 users)',
          recommendations: [
            'Increase database connection pool to 75 connections',
            'Implement database read replicas for location queries',
            'Enable PgBouncer connection pooling',
            'Increase Redis memory to 4GB',
            'Enable Redis Sentinel for high availability',
            'Implement message queues for asynchronous processing',
            'Enable CDN for static content delivery',
            'Increase Nginx worker connections to 2048',
          ],
          estimatedTimeframe: '2-3 months',
          criticalActions: [
            'Database read replica setup',
            'PgBouncer implementation',
            'Redis Sentinel configuration',
          ],
        };

      case 'growth':
        return {
          currentPhase: 'Growth (3,000-5,000 users)',
          nextPhase: 'Scale (10,000+ users)',
          recommendations: [
            'Implement horizontal scaling with multiple backend instances',
            'Enable Redis clustering for distributed caching',
            'Implement WebSocket load balancing with sticky sessions',
            'Enable Nginx load balancing across multiple instances',
            'Implement auto-scaling with Kubernetes',
            'Increase database connections to 150',
            'Increase Redis memory to 8GB',
            'Implement database sharding for high-scale operations',
          ],
          estimatedTimeframe: '4-6 months',
          criticalActions: [
            'Horizontal scaling implementation',
            'Redis clustering setup',
            'Kubernetes auto-scaling',
          ],
        };

      case 'scale':
        return {
          currentPhase: 'Scale (10,000+ users)',
          nextPhase: 'Enterprise (50,000+ users)',
          recommendations: [
            'Implement microservices architecture',
            'Database sharding and partitioning',
            'Multi-region deployment',
            'Advanced caching strategies (L1/L2 cache)',
            'Event-driven architecture with message streaming',
            'Advanced monitoring and observability',
            'Chaos engineering and resilience testing',
            'Performance optimization at scale',
          ],
          estimatedTimeframe: '6-12 months',
          criticalActions: [
            'Microservices migration',
            'Multi-region setup',
            'Advanced monitoring implementation',
          ],
        };

      default:
        return {
          currentPhase: 'Unknown',
          nextPhase: 'Launch',
          recommendations: ['Configure scaling phase'],
          estimatedTimeframe: 'Immediate',
          criticalActions: ['Set SCALING_PHASE environment variable'],
        };
    }
  }
}
