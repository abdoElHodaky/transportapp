import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ScalingPhasesConfig } from './scaling-phases.config';
import Redis, { Cluster } from 'ioredis';

@Injectable()
export class RedisScalingConfig {
  constructor(
    private configService: ConfigService,
    private scalingConfig: ScalingPhasesConfig,
  ) {}

  /**
   * Create Redis connection based on scaling phase
   */
  createRedisConnection(): Redis | Cluster {
    const phaseConfig = this.scalingConfig.getCurrentPhaseConfig();
    const redisConfig = phaseConfig.redisConfig;

    if (redisConfig.enableClustering) {
      return this.createClusterConnection();
    } else if (redisConfig.enableSentinel) {
      return this.createSentinelConnection();
    } else {
      return this.createStandardConnection();
    }
  }

  /**
   * Create standard Redis connection (Launch phase)
   */
  private createStandardConnection(): Redis {
    const phaseConfig = this.scalingConfig.getCurrentPhaseConfig();

    return new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: parseInt(this.configService.get('REDIS_PORT', '6379')),
      password: this.configService.get('REDIS_PASSWORD'),
      db: parseInt(this.configService.get('REDIS_DB', '0')),
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      // Connection pool settings
      family: 4,
      connectTimeout: 10000,
      commandTimeout: 5000,
    });
  }

  /**
   * Create Redis Sentinel connection (Growth phase)
   */
  private createSentinelConnection(): Redis {
    return new Redis({
      sentinels: [
        {
          host: this.configService.get('REDIS_SENTINEL_1_HOST', 'localhost'),
          port: parseInt(
            this.configService.get('REDIS_SENTINEL_1_PORT', '26379'),
          ),
        },
        {
          host: this.configService.get('REDIS_SENTINEL_2_HOST', 'localhost'),
          port: parseInt(
            this.configService.get('REDIS_SENTINEL_2_PORT', '26380'),
          ),
        },
        {
          host: this.configService.get('REDIS_SENTINEL_3_HOST', 'localhost'),
          port: parseInt(
            this.configService.get('REDIS_SENTINEL_3_PORT', '26381'),
          ),
        },
      ],
      name: this.configService.get(
        'REDIS_SENTINEL_MASTER_NAME',
        'sikka-master',
      ),
      password: this.configService.get('REDIS_PASSWORD'),
      db: parseInt(this.configService.get('REDIS_DB', '0')),
      // Sentinel-specific settings
      maxRetriesPerRequest: 3,
      // High availability settings
      enableReadyCheck: true,
      lazyConnect: true,
      keepAlive: 30000,
    });
  }

  /**
   * Create Redis Cluster connection (Scale phase)
   */
  private createClusterConnection(): Cluster {
    const clusterNodes = [
      {
        host: this.configService.get('REDIS_CLUSTER_1_HOST', 'localhost'),
        port: parseInt(this.configService.get('REDIS_CLUSTER_1_PORT', '7000')),
      },
      {
        host: this.configService.get('REDIS_CLUSTER_2_HOST', 'localhost'),
        port: parseInt(this.configService.get('REDIS_CLUSTER_2_PORT', '7001')),
      },
      {
        host: this.configService.get('REDIS_CLUSTER_3_HOST', 'localhost'),
        port: parseInt(this.configService.get('REDIS_CLUSTER_3_PORT', '7002')),
      },
      {
        host: this.configService.get('REDIS_CLUSTER_4_HOST', 'localhost'),
        port: parseInt(this.configService.get('REDIS_CLUSTER_4_PORT', '7003')),
      },
      {
        host: this.configService.get('REDIS_CLUSTER_5_HOST', 'localhost'),
        port: parseInt(this.configService.get('REDIS_CLUSTER_5_PORT', '7004')),
      },
      {
        host: this.configService.get('REDIS_CLUSTER_6_HOST', 'localhost'),
        port: parseInt(this.configService.get('REDIS_CLUSTER_6_PORT', '7005')),
      },
    ];

    return new Redis.Cluster(clusterNodes, {
      redisOptions: {
        password: this.configService.get('REDIS_PASSWORD'),
        connectTimeout: 10000,
        commandTimeout: 5000,
        lazyConnect: true,
        keepAlive: 30000,
        family: 4,
      },
      // Cluster-specific settings
      enableOfflineQueue: false,
      scaleReads: 'slave', // Read from slave nodes
      // Performance optimization
      enableReadyCheck: true,
    });
  }

  /**
   * Get Redis configuration for different phases
   */
  getRedisConfiguration(): {
    phase: string;
    config: Record<string, any>;
    dockerCompose: string;
  } {
    const phaseConfig = this.scalingConfig.getCurrentPhaseConfig();
    const redisConfig = phaseConfig.redisConfig;

    const baseConfig = {
      maxmemory: redisConfig.maxMemory,
      'maxmemory-policy': 'allkeys-lru',
      save: '900 1 300 10 60 10000', // Persistence settings
      appendonly: 'yes',
      appendfsync: 'everysec',
      'tcp-keepalive': '300',
      timeout: '0',
      'tcp-backlog': '511',
      databases: '16',
    };

    if (redisConfig.enableClustering) {
      return {
        phase: phaseConfig.phase,
        config: {
          ...baseConfig,
          'cluster-enabled': 'yes',
          'cluster-config-file': 'nodes.conf',
          'cluster-node-timeout': '15000',
          'cluster-announce-ip': '${REDIS_ANNOUNCE_IP}',
          'cluster-announce-port': '${REDIS_ANNOUNCE_PORT}',
          'cluster-announce-bus-port': '${REDIS_ANNOUNCE_BUS_PORT}',
        },
        dockerCompose: this.getClusterDockerCompose(),
      };
    } else if (redisConfig.enableSentinel) {
      return {
        phase: phaseConfig.phase,
        config: {
          ...baseConfig,
          'replica-read-only': 'yes',
          'replica-serve-stale-data': 'yes',
        },
        dockerCompose: this.getSentinelDockerCompose(),
      };
    } else {
      return {
        phase: phaseConfig.phase,
        config: baseConfig,
        dockerCompose: this.getStandardDockerCompose(),
      };
    }
  }

  /**
   * Get standard Redis Docker Compose configuration
   */
  private getStandardDockerCompose(): string {
    const phaseConfig = this.scalingConfig.getCurrentPhaseConfig();

    return `
  # ⚡ Redis Cache - ${phaseConfig.phase} phase
  redis:
    image: redis:7-alpine
    container_name: sikka-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
      - ./redis/redis.conf:/usr/local/etc/redis/redis.conf
    command: redis-server /usr/local/etc/redis/redis.conf
    environment:
      - REDIS_MAXMEMORY=${phaseConfig.redisConfig.maxMemory}
    networks:
      - sikka-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
`;
  }

  /**
   * Get Redis Sentinel Docker Compose configuration
   */
  private getSentinelDockerCompose(): string {
    const phaseConfig = this.scalingConfig.getCurrentPhaseConfig();

    return `
  # ⚡ Redis Master - ${phaseConfig.phase} phase
  redis-master:
    image: redis:7-alpine
    container_name: sikka-redis-master
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_master_data:/data
      - ./redis/master.conf:/usr/local/etc/redis/redis.conf
    command: redis-server /usr/local/etc/redis/redis.conf
    networks:
      - sikka-network

  # ⚡ Redis Slave 1
  redis-slave-1:
    image: redis:7-alpine
    container_name: sikka-redis-slave-1
    restart: unless-stopped
    ports:
      - "6380:6379"
    volumes:
      - redis_slave_1_data:/data
      - ./redis/slave.conf:/usr/local/etc/redis/redis.conf
    command: redis-server /usr/local/etc/redis/redis.conf --replicaof redis-master 6379
    depends_on:
      - redis-master
    networks:
      - sikka-network

  # ⚡ Redis Slave 2
  redis-slave-2:
    image: redis:7-alpine
    container_name: sikka-redis-slave-2
    restart: unless-stopped
    ports:
      - "6381:6379"
    volumes:
      - redis_slave_2_data:/data
      - ./redis/slave.conf:/usr/local/etc/redis/redis.conf
    command: redis-server /usr/local/etc/redis/redis.conf --replicaof redis-master 6379
    depends_on:
      - redis-master
    networks:
      - sikka-network

  # 🛡️ Redis Sentinel 1
  redis-sentinel-1:
    image: redis:7-alpine
    container_name: sikka-redis-sentinel-1
    restart: unless-stopped
    ports:
      - "26379:26379"
    volumes:
      - ./redis/sentinel.conf:/usr/local/etc/redis/sentinel.conf
    command: redis-sentinel /usr/local/etc/redis/sentinel.conf
    depends_on:
      - redis-master
    networks:
      - sikka-network

  # 🛡️ Redis Sentinel 2
  redis-sentinel-2:
    image: redis:7-alpine
    container_name: sikka-redis-sentinel-2
    restart: unless-stopped
    ports:
      - "26380:26379"
    volumes:
      - ./redis/sentinel.conf:/usr/local/etc/redis/sentinel.conf
    command: redis-sentinel /usr/local/etc/redis/sentinel.conf
    depends_on:
      - redis-master
    networks:
      - sikka-network

  # 🛡️ Redis Sentinel 3
  redis-sentinel-3:
    image: redis:7-alpine
    container_name: sikka-redis-sentinel-3
    restart: unless-stopped
    ports:
      - "26381:26379"
    volumes:
      - ./redis/sentinel.conf:/usr/local/etc/redis/sentinel.conf
    command: redis-sentinel /usr/local/etc/redis/sentinel.conf
    depends_on:
      - redis-master
    networks:
      - sikka-network
`;
  }

  /**
   * Get Redis Cluster Docker Compose configuration
   */
  private getClusterDockerCompose(): string {
    return `
  # ⚡ Redis Cluster - Scale phase
  redis-cluster-1:
    image: redis:7-alpine
    container_name: sikka-redis-cluster-1
    restart: unless-stopped
    ports:
      - "7000:7000"
      - "17000:17000"
    volumes:
      - redis_cluster_1_data:/data
      - ./redis/cluster.conf:/usr/local/etc/redis/redis.conf
    command: redis-server /usr/local/etc/redis/redis.conf --port 7000 --cluster-announce-ip redis-cluster-1
    networks:
      - sikka-network

  redis-cluster-2:
    image: redis:7-alpine
    container_name: sikka-redis-cluster-2
    restart: unless-stopped
    ports:
      - "7001:7001"
      - "17001:17001"
    volumes:
      - redis_cluster_2_data:/data
      - ./redis/cluster.conf:/usr/local/etc/redis/redis.conf
    command: redis-server /usr/local/etc/redis/redis.conf --port 7001 --cluster-announce-ip redis-cluster-2
    networks:
      - sikka-network

  redis-cluster-3:
    image: redis:7-alpine
    container_name: sikka-redis-cluster-3
    restart: unless-stopped
    ports:
      - "7002:7002"
      - "17002:17002"
    volumes:
      - redis_cluster_3_data:/data
      - ./redis/cluster.conf:/usr/local/etc/redis/redis.conf
    command: redis-server /usr/local/etc/redis/redis.conf --port 7002 --cluster-announce-ip redis-cluster-3
    networks:
      - sikka-network

  redis-cluster-4:
    image: redis:7-alpine
    container_name: sikka-redis-cluster-4
    restart: unless-stopped
    ports:
      - "7003:7003"
      - "17003:17003"
    volumes:
      - redis_cluster_4_data:/data
      - ./redis/cluster.conf:/usr/local/etc/redis/redis.conf
    command: redis-server /usr/local/etc/redis/redis.conf --port 7003 --cluster-announce-ip redis-cluster-4
    networks:
      - sikka-network

  redis-cluster-5:
    image: redis:7-alpine
    container_name: sikka-redis-cluster-5
    restart: unless-stopped
    ports:
      - "7004:7004"
      - "17004:17004"
    volumes:
      - redis_cluster_5_data:/data
      - ./redis/cluster.conf:/usr/local/etc/redis/redis.conf
    command: redis-server /usr/local/etc/redis/redis.conf --port 7004 --cluster-announce-ip redis-cluster-5
    networks:
      - sikka-network

  redis-cluster-6:
    image: redis:7-alpine
    container_name: sikka-redis-cluster-6
    restart: unless-stopped
    ports:
      - "7005:7005"
      - "17005:17005"
    volumes:
      - redis_cluster_6_data:/data
      - ./redis/cluster.conf:/usr/local/etc/redis/redis.conf
    command: redis-server /usr/local/etc/redis/redis.conf --port 7005 --cluster-announce-ip redis-cluster-6
    networks:
      - sikka-network

  # 🔧 Redis Cluster Setup
  redis-cluster-setup:
    image: redis:7-alpine
    container_name: sikka-redis-cluster-setup
    command: >
      sh -c "
        sleep 10 &&
        redis-cli --cluster create 
        redis-cluster-1:7000 
        redis-cluster-2:7001 
        redis-cluster-3:7002 
        redis-cluster-4:7003 
        redis-cluster-5:7004 
        redis-cluster-6:7005 
        --cluster-replicas 1 --cluster-yes
      "
    depends_on:
      - redis-cluster-1
      - redis-cluster-2
      - redis-cluster-3
      - redis-cluster-4
      - redis-cluster-5
      - redis-cluster-6
    networks:
      - sikka-network
`;
  }

  /**
   * Get Redis monitoring and optimization recommendations
   */
  getRedisOptimizations(): {
    phase: string;
    optimizations: Array<{
      category: string;
      action: string;
      impact: 'high' | 'medium' | 'low';
      effort: 'high' | 'medium' | 'low';
      description: string;
    }>;
    monitoringCommands: Record<string, string>;
  } {
    const phaseConfig = this.scalingConfig.getCurrentPhaseConfig();

    const baseOptimizations = [
      {
        category: 'Memory Management',
        action: 'Configure memory policies',
        impact: 'high' as const,
        effort: 'low' as const,
        description: 'Set appropriate maxmemory and eviction policies',
      },
      {
        category: 'Persistence',
        action: 'Optimize persistence settings',
        impact: 'medium' as const,
        effort: 'low' as const,
        description: 'Configure RDB and AOF for data durability',
      },
    ];

    const phaseSpecificOptimizations = {
      launch: [
        {
          category: 'Configuration',
          action: 'Basic Redis tuning',
          impact: 'medium' as const,
          effort: 'low' as const,
          description: 'Optimize basic Redis settings for single instance',
        },
      ],
      growth: [
        {
          category: 'High Availability',
          action: 'Implement Redis Sentinel',
          impact: 'high' as const,
          effort: 'medium' as const,
          description: 'Set up Redis Sentinel for automatic failover',
        },
        {
          category: 'Read Scaling',
          action: 'Configure read replicas',
          impact: 'medium' as const,
          effort: 'medium' as const,
          description: 'Use read replicas for read-heavy operations',
        },
      ],
      scale: [
        {
          category: 'Horizontal Scaling',
          action: 'Implement Redis Cluster',
          impact: 'high' as const,
          effort: 'high' as const,
          description: 'Set up Redis Cluster for horizontal scaling',
        },
        {
          category: 'Performance',
          action: 'Optimize cluster performance',
          impact: 'high' as const,
          effort: 'medium' as const,
          description: 'Fine-tune cluster settings for maximum performance',
        },
      ],
    };

    const monitoringCommands = {
      memory_usage: 'INFO memory',
      connected_clients: 'INFO clients',
      operations_per_second: 'INFO stats',
      keyspace_info: 'INFO keyspace',
      replication_info: 'INFO replication',
      cluster_info: 'CLUSTER INFO',
      cluster_nodes: 'CLUSTER NODES',
      slow_log: 'SLOWLOG GET 10',
      config_get: 'CONFIG GET *',
    };

    return {
      phase: phaseConfig.phase,
      optimizations: [
        ...baseOptimizations,
        ...phaseSpecificOptimizations[phaseConfig.phase],
      ],
      monitoringCommands,
    };
  }
}
