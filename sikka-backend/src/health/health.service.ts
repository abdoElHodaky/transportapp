import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';

export interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
}

export interface ReadinessStatus {
  status: 'ready' | 'not_ready';
  checks: {
    database: boolean;
    redis: boolean;
    external: boolean;
  };
  timestamp: string;
}

export interface DetailedHealthStatus extends HealthStatus {
  services: {
    database: {
      status: 'connected' | 'disconnected';
      responseTime?: number;
      error?: string;
    };
    redis: {
      status: 'connected' | 'disconnected';
      responseTime?: number;
      error?: string;
    };
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
    };
  };
}

@Injectable()
export class HealthService {
  private redis: Redis;

  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {
    // Initialize Redis connection for health checks
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
  }

  async getHealthStatus(): Promise<HealthStatus> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }

  async getReadinessStatus(): Promise<ReadinessStatus> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkExternalServices(),
    ]);

    const databaseReady = checks[0].status === 'fulfilled' && checks[0].value;
    const redisReady = checks[1].status === 'fulfilled' && checks[1].value;
    const externalReady = checks[2].status === 'fulfilled' && checks[2].value;

    const allReady = databaseReady && redisReady && externalReady;

    return {
      status: allReady ? 'ready' : 'not_ready',
      checks: {
        database: databaseReady,
        redis: redisReady,
        external: externalReady,
      },
      timestamp: new Date().toISOString(),
    };
  }

  async getLivenessStatus() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      pid: process.pid,
    };
  }

  async getDetailedHealthStatus(): Promise<DetailedHealthStatus> {
    const baseStatus = await this.getHealthStatus();
    
    const [databaseCheck, redisCheck] = await Promise.allSettled([
      this.checkDatabaseWithMetrics(),
      this.checkRedisWithMetrics(),
    ]);

    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      ...baseStatus,
      services: {
        database: databaseCheck.status === 'fulfilled' 
          ? databaseCheck.value 
          : { status: 'disconnected', error: 'Connection failed' },
        redis: redisCheck.status === 'fulfilled' 
          ? redisCheck.value 
          : { status: 'disconnected', error: 'Connection failed' },
        memory: {
          used: memoryUsage.heapUsed,
          total: memoryUsage.heapTotal,
          percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
        },
        cpu: {
          usage: Math.round((cpuUsage.user + cpuUsage.system) / 1000000), // Convert to milliseconds
        },
      },
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      if (!this.dataSource.isInitialized) {
        return false;
      }
      
      await this.dataSource.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  private async checkDatabaseWithMetrics() {
    const startTime = Date.now();
    
    try {
      if (!this.dataSource.isInitialized) {
        return { status: 'disconnected' as const, error: 'Not initialized' };
      }
      
      await this.dataSource.query('SELECT 1');
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'connected' as const,
        responseTime,
      };
    } catch (error) {
      return {
        status: 'disconnected' as const,
        error: error.message,
      };
    }
  }

  private async checkRedis(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }

  private async checkRedisWithMetrics() {
    const startTime = Date.now();
    
    try {
      await this.redis.ping();
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'connected' as const,
        responseTime,
      };
    } catch (error) {
      return {
        status: 'disconnected' as const,
        error: error.message,
      };
    }
  }

  private async checkExternalServices(): Promise<boolean> {
    try {
      // Check critical external services
      const checks = await Promise.allSettled([
        this.checkEBSGateway(),
        this.checkCyberPayGateway(),
        // Add other external service checks here
      ]);

      // Return true if at least one payment gateway is available
      return checks.some(check => check.status === 'fulfilled' && check.value);
    } catch (error) {
      console.error('External services health check failed:', error);
      return false;
    }
  }

  private async checkEBSGateway(): Promise<boolean> {
    try {
      // TODO: Implement actual EBS gateway health check
      // For now, return true if configuration exists
      return !!(process.env.EBS_BASE_URL && process.env.EBS_MERCHANT_ID);
    } catch (error) {
      return false;
    }
  }

  private async checkCyberPayGateway(): Promise<boolean> {
    try {
      // TODO: Implement actual CyberPay gateway health check
      // For now, return true if configuration exists
      return !!(process.env.CYBERPAY_BASE_URL && process.env.CYBERPAY_MERCHANT_ID);
    } catch (error) {
      return false;
    }
  }
}
