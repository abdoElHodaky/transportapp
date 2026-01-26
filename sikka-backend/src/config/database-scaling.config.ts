import { Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ScalingPhasesConfig } from './scaling-phases.config';

@Injectable()
export class DatabaseScalingConfig implements TypeOrmOptionsFactory {
  constructor(
    private configService: ConfigService,
    private scalingConfig: ScalingPhasesConfig,
  ) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const phaseConfig = this.scalingConfig.getCurrentPhaseConfig();
    const dbConfig = phaseConfig.databaseConfig;

    const baseConfig: TypeOrmModuleOptions = {
      type: 'postgres',
      host: this.configService.get('DB_HOST', 'localhost'),
      port: this.configService.get('DB_PORT', 5432),
      username: this.configService.get('DB_USERNAME', 'postgres'),
      password: this.configService.get('DB_PASSWORD', 'password'),
      database: this.configService.get('DB_NAME', 'sikka_db'),
      entities: [__dirname + '/../entities/*.entity{.ts,.js}'],
      migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
      synchronize: this.configService.get('NODE_ENV') === 'development',
      logging: this.configService.get('NODE_ENV') === 'development',
      ssl:
        this.configService.get('NODE_ENV') === 'production'
          ? { rejectUnauthorized: false }
          : false,
      extra: {
        // Enable PostGIS extension
        charset: 'utf8mb4_unicode_ci',
        // Connection pool configuration based on scaling phase
        max: dbConfig.maxConnections,
        min: Math.floor(dbConfig.maxConnections * 0.1), // 10% minimum connections
        acquire: 30000, // 30 seconds
        idle: 10000, // 10 seconds
        // Connection pool optimization
        evict: 1000, // 1 second
        handleDisconnects: true,
        // Query optimization
        statement_timeout: 30000, // 30 seconds
        query_timeout: 30000, // 30 seconds
        // Performance tuning
        application_name: `sikka_backend_${phaseConfig.phase}`,
      },
    };

    // Add read replica configuration for growth and scale phases
    if (dbConfig.enableReadReplicas) {
      return {
        ...baseConfig,
        replication: {
          master: {
            host: this.configService.get('DB_MASTER_HOST', baseConfig.host),
            port: this.configService.get('DB_MASTER_PORT', baseConfig.port),
            username: baseConfig.username,
            password: baseConfig.password,
            database: baseConfig.database,
          },
          slaves: [
            {
              host: this.configService.get('DB_SLAVE_1_HOST', baseConfig.host),
              port: this.configService.get('DB_SLAVE_1_PORT', baseConfig.port),
              username: baseConfig.username,
              password: baseConfig.password,
              database: baseConfig.database,
            },
            // Add more read replicas for scale phase
            ...(phaseConfig.phase === 'scale' ? [
              {
                host: this.configService.get('DB_SLAVE_2_HOST', baseConfig.host),
                port: this.configService.get('DB_SLAVE_2_PORT', baseConfig.port),
                username: baseConfig.username,
                password: baseConfig.password,
                database: baseConfig.database,
              },
            ] : []),
          ],
        },
      };
    }

    return baseConfig;
  }

  /**
   * Get PgBouncer configuration for connection pooling
   */
  getPgBouncerConfig(): string {
    const phaseConfig = this.scalingConfig.getCurrentPhaseConfig();
    const dbConfig = phaseConfig.databaseConfig;

    if (!dbConfig.enableConnectionPooling) {
      return '';
    }

    return `
# PgBouncer Configuration for ${phaseConfig.phase} phase
[databases]
sikka_db = host=${this.configService.get('DB_HOST', 'localhost')} port=${this.configService.get('DB_PORT', 5432)} dbname=${this.configService.get('DB_NAME', 'sikka_db')}

[pgbouncer]
# Connection pool settings
pool_mode = transaction
max_client_conn = ${dbConfig.maxConnections * 2}
default_pool_size = ${dbConfig.poolSize}
min_pool_size = ${Math.floor(dbConfig.poolSize * 0.2)}
reserve_pool_size = ${Math.floor(dbConfig.poolSize * 0.1)}

# Connection limits
max_db_connections = ${dbConfig.maxConnections}
max_user_connections = ${dbConfig.maxConnections}

# Timeouts
server_connect_timeout = 15
server_login_retry = 15
query_timeout = 30
query_wait_timeout = 120
client_idle_timeout = 0
server_idle_timeout = 600
server_lifetime = 3600

# Authentication
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

# Logging
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1

# Performance
listen_addr = *
listen_port = 6432
unix_socket_dir = /var/run/postgresql
`;
  }

  /**
   * Get database monitoring queries for different phases
   */
  getMonitoringQueries(): Record<string, string> {
    return {
      // Connection monitoring
      active_connections: `
        SELECT count(*) as active_connections 
        FROM pg_stat_activity 
        WHERE state = 'active'
      `,
      
      // Connection pool utilization
      connection_stats: `
        SELECT 
          state,
          count(*) as count,
          round(count(*) * 100.0 / (SELECT count(*) FROM pg_stat_activity), 2) as percentage
        FROM pg_stat_activity 
        GROUP BY state
        ORDER BY count DESC
      `,
      
      // Slow queries
      slow_queries: `
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          rows
        FROM pg_stat_statements 
        WHERE mean_time > 1000 
        ORDER BY mean_time DESC 
        LIMIT 10
      `,
      
      // Database size and growth
      database_size: `
        SELECT 
          pg_database.datname,
          pg_size_pretty(pg_database_size(pg_database.datname)) AS size
        FROM pg_database
        WHERE pg_database.datname = current_database()
      `,
      
      // Index usage
      index_usage: `
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_tup_read,
          idx_tup_fetch,
          idx_scan
        FROM pg_stat_user_indexes 
        ORDER BY idx_scan DESC 
        LIMIT 10
      `,
      
      // Lock monitoring
      locks: `
        SELECT 
          mode,
          count(*) as count
        FROM pg_locks 
        WHERE granted = true 
        GROUP BY mode 
        ORDER BY count DESC
      `,
      
      // Replication lag (for read replicas)
      replication_lag: `
        SELECT 
          client_addr,
          state,
          pg_wal_lsn_diff(pg_current_wal_lsn(), flush_lsn) AS flush_lag_bytes,
          pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS replay_lag_bytes
        FROM pg_stat_replication
      `,
    };
  }

  /**
   * Get database optimization recommendations
   */
  getDatabaseOptimizations(): {
    phase: string;
    optimizations: Array<{
      category: string;
      action: string;
      impact: 'high' | 'medium' | 'low';
      effort: 'high' | 'medium' | 'low';
      description: string;
    }>;
  } {
    const phaseConfig = this.scalingConfig.getCurrentPhaseConfig();
    
    const baseOptimizations = [
      {
        category: 'Connection Management',
        action: 'Implement connection pooling',
        impact: 'high' as const,
        effort: 'medium' as const,
        description: 'Use PgBouncer to manage database connections efficiently',
      },
      {
        category: 'Query Optimization',
        action: 'Add database indexes',
        impact: 'high' as const,
        effort: 'low' as const,
        description: 'Create indexes on frequently queried columns (user_id, trip_id, location coordinates)',
      },
      {
        category: 'Monitoring',
        action: 'Enable query statistics',
        impact: 'medium' as const,
        effort: 'low' as const,
        description: 'Install pg_stat_statements extension for query performance monitoring',
      },
    ];

    const phaseSpecificOptimizations = {
      launch: [
        {
          category: 'Configuration',
          action: 'Tune PostgreSQL settings',
          impact: 'medium' as const,
          effort: 'low' as const,
          description: 'Optimize shared_buffers, work_mem, and maintenance_work_mem',
        },
      ],
      growth: [
        {
          category: 'Scaling',
          action: 'Implement read replicas',
          impact: 'high' as const,
          effort: 'high' as const,
          description: 'Set up read replicas for location queries and analytics',
        },
        {
          category: 'Partitioning',
          action: 'Partition large tables',
          impact: 'medium' as const,
          effort: 'medium' as const,
          description: 'Partition trips and locations tables by date',
        },
      ],
      scale: [
        {
          category: 'Sharding',
          action: 'Implement database sharding',
          impact: 'high' as const,
          effort: 'high' as const,
          description: 'Shard database by geographic regions or user segments',
        },
        {
          category: 'Caching',
          action: 'Implement query result caching',
          impact: 'high' as const,
          effort: 'medium' as const,
          description: 'Cache frequently accessed data in Redis',
        },
      ],
    };

    return {
      phase: phaseConfig.phase,
      optimizations: [
        ...baseOptimizations,
        ...phaseSpecificOptimizations[phaseConfig.phase],
      ],
    };
  }
}

