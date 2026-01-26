import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import * as os from 'os';

export interface ConcurrencyMetrics {
  timestamp: number;
  database: {
    maxConnections: number;
    currentConnections: number;
    availableConnections: number;
    connectionUtilization: number; // percentage
    recommendedMaxConcurrentQueries: number;
  };
  redis: {
    maxConnections: number;
    currentConnections: number;
    maxMemory: number; // bytes
    usedMemory: number; // bytes
    memoryUtilization: number; // percentage
    recommendedMaxConcurrentOperations: number;
  };
  websocket: {
    maxConnections: number;
    currentConnections: number;
    connectionUtilization: number; // percentage
    messagesPerSecond: number;
    recommendedMaxConcurrentSessions: number;
  };
  system: {
    cpuCores: number;
    totalMemory: number; // bytes
    freeMemory: number; // bytes
    memoryUtilization: number; // percentage
    loadAverage: number[];
    recommendedMaxConcurrentOperations: number;
  };
  nginx: {
    workerConnections: number;
    maxConcurrentConnections: number;
    rateLimitApi: number; // requests per second
    rateLimitAuth: number; // requests per second
    recommendedMaxConcurrentRequests: number;
  };
  estimatedCapacity: {
    maxConcurrentUsers: number;
    maxConcurrentTrips: number;
    maxConcurrentApiRequests: number;
    maxConcurrentWebSocketSessions: number;
    bottleneckComponent: string;
    scalingRecommendations: string[];
  };
}

@Injectable()
export class ConcurrencyAnalysisService {
  private readonly logger = new Logger(ConcurrencyAnalysisService.name);
  private redis: Redis;

  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    private configService: ConfigService,
  ) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
    });
  }

  /**
   * Analyze system concurrency and parallel processing capabilities
   */
  async analyzeConcurrencyCapacity(): Promise<ConcurrencyMetrics> {
    const timestamp = Date.now();

    // Analyze each component
    const databaseMetrics = await this.analyzeDatabaseConcurrency();
    const redisMetrics = await this.analyzeRedisConcurrency();
    const websocketMetrics = await this.analyzeWebSocketConcurrency();
    const systemMetrics = this.analyzeSystemConcurrency();
    const nginxMetrics = this.analyzeNginxConcurrency();

    // Calculate estimated capacity
    const estimatedCapacity = this.calculateEstimatedCapacity({
      database: databaseMetrics,
      redis: redisMetrics,
      websocket: websocketMetrics,
      system: systemMetrics,
      nginx: nginxMetrics,
    });

    return {
      timestamp,
      database: databaseMetrics,
      redis: redisMetrics,
      websocket: websocketMetrics,
      system: systemMetrics,
      nginx: nginxMetrics,
      estimatedCapacity,
    };
  }

  /**
   * Analyze database concurrency capabilities
   */
  private async analyzeDatabaseConcurrency() {
    try {
      // PostgreSQL default max_connections is typically 100
      // TypeORM default pool size is 10
      const maxConnections = parseInt(process.env.DB_MAX_CONNECTIONS || '20');
      
      // Get current connection count
      const connectionQuery = await this.dataSource.query(`
        SELECT count(*) as current_connections 
        FROM pg_stat_activity 
        WHERE state = 'active'
      `);
      
      const currentConnections = parseInt(connectionQuery[0]?.current_connections || '0');
      const availableConnections = maxConnections - currentConnections;
      const connectionUtilization = (currentConnections / maxConnections) * 100;

      // Each connection can handle ~100-500 queries per second depending on complexity
      // Conservative estimate: 200 queries per second per connection
      const recommendedMaxConcurrentQueries = maxConnections * 200;

      return {
        maxConnections,
        currentConnections,
        availableConnections,
        connectionUtilization: Math.round(connectionUtilization * 100) / 100,
        recommendedMaxConcurrentQueries,
      };
    } catch (error) {
      this.logger.error('Failed to analyze database concurrency:', error);
      return {
        maxConnections: 20,
        currentConnections: 0,
        availableConnections: 20,
        connectionUtilization: 0,
        recommendedMaxConcurrentQueries: 4000,
      };
    }
  }

  /**
   * Analyze Redis concurrency capabilities
   */
  private async analyzeRedisConcurrency() {
    try {
      const info = await this.redis.info();
      const memory = await this.redis.info('memory');
      
      // Parse Redis info
      const connectedClients = this.parseRedisInfo(info, 'connected_clients') || 0;
      const usedMemory = this.parseRedisInfo(memory, 'used_memory') || 0;
      const maxMemory = this.parseRedisInfo(memory, 'maxmemory') || (1024 * 1024 * 1024); // 1GB default
      
      // Redis can handle thousands of connections, but practical limit is ~10,000
      const maxConnections = parseInt(process.env.REDIS_MAX_CONNECTIONS || '10000');
      const memoryUtilization = (usedMemory / maxMemory) * 100;

      // Redis can handle ~100,000 operations per second on modern hardware
      // Conservative estimate: 50,000 operations per second
      const recommendedMaxConcurrentOperations = 50000;

      return {
        maxConnections,
        currentConnections: connectedClients,
        maxMemory,
        usedMemory,
        memoryUtilization: Math.round(memoryUtilization * 100) / 100,
        recommendedMaxConcurrentOperations,
      };
    } catch (error) {
      this.logger.error('Failed to analyze Redis concurrency:', error);
      return {
        maxConnections: 10000,
        currentConnections: 0,
        maxMemory: 1024 * 1024 * 1024,
        usedMemory: 0,
        memoryUtilization: 0,
        recommendedMaxConcurrentOperations: 50000,
      };
    }
  }

  /**
   * Analyze WebSocket concurrency capabilities
   */
  private async analyzeWebSocketConcurrency() {
    try {
      // Socket.IO can handle ~10,000 concurrent connections per instance
      // Limited by memory and CPU rather than the library itself
      const maxConnections = parseInt(process.env.WEBSOCKET_MAX_CONNECTIONS || '10000');
      
      // Get current WebSocket connections (this would need to be tracked in the gateway)
      const currentConnections = 0; // This would be injected from WebSocket gateway
      const connectionUtilization = (currentConnections / maxConnections) * 100;

      // Estimate messages per second based on typical usage
      // Conservative estimate: 1000 messages per second
      const messagesPerSecond = 1000;

      // Recommended max concurrent sessions considering memory usage
      // Each WebSocket connection uses ~8KB of memory
      const availableMemory = os.freemem();
      const memoryPerConnection = 8 * 1024; // 8KB
      const memoryBasedLimit = Math.floor(availableMemory * 0.3 / memoryPerConnection); // Use 30% of free memory
      
      const recommendedMaxConcurrentSessions = Math.min(maxConnections, memoryBasedLimit);

      return {
        maxConnections,
        currentConnections,
        connectionUtilization: Math.round(connectionUtilization * 100) / 100,
        messagesPerSecond,
        recommendedMaxConcurrentSessions,
      };
    } catch (error) {
      this.logger.error('Failed to analyze WebSocket concurrency:', error);
      return {
        maxConnections: 10000,
        currentConnections: 0,
        connectionUtilization: 0,
        messagesPerSecond: 1000,
        recommendedMaxConcurrentSessions: 5000,
      };
    }
  }

  /**
   * Analyze system-level concurrency capabilities
   */
  private analyzeSystemConcurrency() {
    const cpuCores = os.cpus().length;
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const memoryUtilization = ((totalMemory - freeMemory) / totalMemory) * 100;
    const loadAverage = os.loadavg();

    // Estimate max concurrent operations based on CPU cores
    // Rule of thumb: 100-500 concurrent operations per CPU core
    // Conservative estimate: 200 operations per core
    const recommendedMaxConcurrentOperations = cpuCores * 200;

    return {
      cpuCores,
      totalMemory,
      freeMemory,
      memoryUtilization: Math.round(memoryUtilization * 100) / 100,
      loadAverage,
      recommendedMaxConcurrentOperations,
    };
  }

  /**
   * Analyze Nginx concurrency capabilities
   */
  private analyzeNginxConcurrency() {
    // Based on nginx.conf configuration
    const workerConnections = 1024; // From nginx.conf
    const workerProcesses = os.cpus().length; // Typically set to number of CPU cores
    const maxConcurrentConnections = workerConnections * workerProcesses;

    // Rate limiting from nginx.conf
    const rateLimitApi = 10; // 10 requests per second
    const rateLimitAuth = 5; // 5 requests per second

    // Recommended max concurrent requests considering keep-alive connections
    // Typically 80% of max connections for active requests
    const recommendedMaxConcurrentRequests = Math.floor(maxConcurrentConnections * 0.8);

    return {
      workerConnections,
      maxConcurrentConnections,
      rateLimitApi,
      rateLimitAuth,
      recommendedMaxConcurrentRequests,
    };
  }

  /**
   * Calculate estimated system capacity
   */
  private calculateEstimatedCapacity(metrics: any) {
    // Calculate bottlenecks
    const capacityLimits = {
      database: metrics.database.recommendedMaxConcurrentQueries / 10, // Assume 10 queries per user session
      redis: metrics.redis.recommendedMaxConcurrentOperations / 20, // Assume 20 operations per user session
      websocket: metrics.websocket.recommendedMaxConcurrentSessions,
      system: metrics.system.recommendedMaxConcurrentOperations / 15, // Assume 15 operations per user session
      nginx: metrics.nginx.recommendedMaxConcurrentRequests,
    };

    // Find the bottleneck
    const bottleneck = Object.entries(capacityLimits).reduce((min, [key, value]) => 
      value < min.value ? { component: key, value } : min,
      { component: 'unknown', value: Infinity }
    );

    // Conservative estimates for concurrent operations
    const maxConcurrentUsers = Math.floor(bottleneck.value * 0.7); // 70% of bottleneck capacity
    const maxConcurrentTrips = Math.floor(maxConcurrentUsers * 0.3); // 30% of users in active trips
    const maxConcurrentApiRequests = Math.min(
      metrics.nginx.recommendedMaxConcurrentRequests,
      metrics.system.recommendedMaxConcurrentOperations
    );
    const maxConcurrentWebSocketSessions = metrics.websocket.recommendedMaxConcurrentSessions;

    // Scaling recommendations
    const scalingRecommendations = this.generateScalingRecommendations(metrics, bottleneck.component);

    return {
      maxConcurrentUsers,
      maxConcurrentTrips,
      maxConcurrentApiRequests,
      maxConcurrentWebSocketSessions,
      bottleneckComponent: bottleneck.component,
      scalingRecommendations,
    };
  }

  /**
   * Generate scaling recommendations based on bottlenecks
   */
  private generateScalingRecommendations(metrics: any, bottleneck: string): string[] {
    const recommendations = [];

    switch (bottleneck) {
      case 'database':
        recommendations.push('Increase database connection pool size');
        recommendations.push('Consider database read replicas for read-heavy operations');
        recommendations.push('Implement database connection pooling with PgBouncer');
        recommendations.push('Optimize slow queries and add database indexes');
        break;

      case 'redis':
        recommendations.push('Increase Redis memory allocation');
        recommendations.push('Consider Redis clustering for horizontal scaling');
        recommendations.push('Implement Redis connection pooling');
        recommendations.push('Optimize cache TTL and eviction policies');
        break;

      case 'websocket':
        recommendations.push('Implement WebSocket connection load balancing');
        recommendations.push('Consider horizontal scaling with multiple instances');
        recommendations.push('Optimize WebSocket message handling and reduce memory usage');
        recommendations.push('Implement connection throttling and rate limiting');
        break;

      case 'system':
        recommendations.push('Upgrade server CPU and memory resources');
        recommendations.push('Implement horizontal scaling with load balancers');
        recommendations.push('Optimize application code for better CPU utilization');
        recommendations.push('Consider containerization with Kubernetes for auto-scaling');
        break;

      case 'nginx':
        recommendations.push('Increase Nginx worker connections and processes');
        recommendations.push('Implement Nginx load balancing across multiple backend instances');
        recommendations.push('Optimize Nginx configuration for high concurrency');
        recommendations.push('Consider using a CDN for static content');
        break;

      default:
        recommendations.push('Monitor system performance and identify specific bottlenecks');
        recommendations.push('Implement comprehensive performance testing');
        recommendations.push('Consider horizontal scaling across multiple instances');
    }

    // General recommendations
    recommendations.push('Implement caching strategies to reduce database load');
    recommendations.push('Use message queues for asynchronous processing');
    recommendations.push('Monitor and alert on key performance metrics');

    return recommendations;
  }

  /**
   * Get load testing recommendations
   */
  async getLoadTestingRecommendations(): Promise<{
    testScenarios: Array<{
      name: string;
      description: string;
      concurrentUsers: number;
      duration: string;
      expectedThroughput: string;
    }>;
    toolRecommendations: string[];
    keyMetricsToMonitor: string[];
  }> {
    const capacity = await this.analyzeConcurrencyCapacity();

    const testScenarios = [
      {
        name: 'Baseline Load Test',
        description: 'Test normal operating conditions',
        concurrentUsers: Math.floor(capacity.estimatedCapacity.maxConcurrentUsers * 0.3),
        duration: '10 minutes',
        expectedThroughput: '95% requests under 200ms',
      },
      {
        name: 'Peak Load Test',
        description: 'Test expected peak traffic',
        concurrentUsers: Math.floor(capacity.estimatedCapacity.maxConcurrentUsers * 0.7),
        duration: '15 minutes',
        expectedThroughput: '95% requests under 500ms',
      },
      {
        name: 'Stress Test',
        description: 'Test system limits and breaking point',
        concurrentUsers: capacity.estimatedCapacity.maxConcurrentUsers,
        duration: '20 minutes',
        expectedThroughput: '90% requests under 1000ms',
      },
      {
        name: 'WebSocket Load Test',
        description: 'Test real-time messaging capacity',
        concurrentUsers: Math.floor(capacity.websocket.recommendedMaxConcurrentSessions * 0.8),
        duration: '30 minutes',
        expectedThroughput: '1000+ messages per second',
      },
    ];

    const toolRecommendations = [
      'Artillery.io - For API and WebSocket load testing',
      'Apache JMeter - For comprehensive load testing',
      'k6 - For developer-friendly load testing',
      'WebSocket King - For WebSocket-specific testing',
      'Grafana + Prometheus - For real-time monitoring during tests',
    ];

    const keyMetricsToMonitor = [
      'Response time percentiles (P50, P95, P99)',
      'Throughput (requests per second)',
      'Error rate percentage',
      'Database connection pool utilization',
      'Redis memory usage and hit rate',
      'WebSocket connection count and message latency',
      'CPU and memory utilization',
      'Network I/O and bandwidth usage',
    ];

    return {
      testScenarios,
      toolRecommendations,
      keyMetricsToMonitor,
    };
  }

  private parseRedisInfo(info: string, key: string): number {
    const match = info.match(new RegExp(`${key}:(\\d+)`));
    return match ? parseInt(match[1]) : 0;
  }
}

