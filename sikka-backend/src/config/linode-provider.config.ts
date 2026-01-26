import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Linode Provider Specific Configuration
 * 
 * Contains Linode-specific settings, service mappings, and optimizations
 * for the Sikka Transportation Platform scaling strategy.
 */

export interface LinodeServiceMapping {
  compute: LinodeComputeConfig;
  database: LinodeDatabaseConfig;
  cache: LinodeCacheConfig;
  loadBalancer: LinodeLoadBalancerConfig;
  storage: LinodeStorageConfig;
  monitoring: LinodeMonitoringConfig;
  networking: LinodeNetworkingConfig;
}

export interface LinodeComputeConfig {
  instanceTypes: {
    launch: LinodeInstanceSpec[];
    growth: LinodeInstanceSpec[];
    scale: LinodeInstanceSpec[];
  };
  autoScaling: {
    enabled: boolean;
    minInstances: number;
    maxInstances: number;
    targetCpuUtilization: number;
    scaleUpCooldown: number;
    scaleDownCooldown: number;
  };
  kubernetes: {
    enabled: boolean;
    version: string;
    nodePoolConfig: LinodeNodePoolConfig[];
  };
}

export interface LinodeInstanceSpec {
  type: string;
  label: string;
  vcpu: number;
  memory: number; // GB
  storage: number; // GB
  transfer: number; // GB
  networkPerformance: string;
  costPerHour: number;
  costPerMonth: number;
  dedicated: boolean;
  suitable: string[];
}

export interface LinodeNodePoolConfig {
  type: string;
  count: number;
  minCount: number;
  maxCount: number;
  autoScale: boolean;
  tags: string[];
}

export interface LinodeDatabaseConfig {
  managedDatabase: {
    engines: ('postgresql' | 'mysql')[];
    versions: {
      postgresql: string[];
      mysql: string[];
    };
    plans: {
      launch: LinodeDatabasePlan[];
      growth: LinodeDatabasePlan[];
      scale: LinodeDatabasePlan[];
    };
    features: {
      readReplicas: boolean;
      pointInTimeRecovery: boolean;
      automaticBackups: boolean;
      ssl: boolean;
      privateNetworking: boolean;
    };
    backup: {
      retentionPeriod: number; // days
      backupWindow: string;
      crossRegionBackup: boolean;
    };
  };
}

export interface LinodeDatabasePlan {
  type: string;
  label: string;
  vcpu: number;
  memory: number; // GB
  storage: number; // GB
  costPerHour: number;
  costPerMonth: number;
  maxConnections: number;
  suitable: string[];
}

export interface LinodeCacheConfig {
  selfManaged: {
    enabled: boolean;
    redisVersion: string;
    instanceTypes: LinodeInstanceSpec[];
    clustering: {
      enabled: boolean;
      minNodes: number;
      maxNodes: number;
    };
    sentinel: {
      enabled: boolean;
      instances: number;
    };
    persistence: {
      enabled: boolean;
      snapshotInterval: number; // seconds
    };
  };
}

export interface LinodeLoadBalancerConfig {
  nodeBalancer: {
    enabled: boolean;
    algorithm: 'roundrobin' | 'leastconn' | 'source';
    stickiness: 'none' | 'table' | 'http_cookie';
    healthCheck: {
      type: 'connection' | 'http' | 'http_body';
      interval: number; // seconds
      timeout: number; // seconds
      attempts: number;
      path?: string;
      body?: string;
    };
    ssl: {
      enabled: boolean;
      certificate: string;
      privateKey: string;
    };
    costPerHour: number;
    costPerMonth: number;
  };
}

export interface LinodeStorageConfig {
  objectStorage: {
    enabled: boolean;
    regions: string[];
    bucketName: string;
    accessKey: string;
    secretKey: string;
    s3Compatible: boolean;
    costPerGB: number;
    features: {
      versioning: boolean;
      lifecycle: boolean;
      cors: boolean;
      staticWebsite: boolean;
    };
  };
  blockStorage: {
    enabled: boolean;
    volumes: LinodeVolumeConfig[];
    encryption: boolean;
    costPerGB: number;
    maxSize: number; // GB
    maxIOPS: number;
  };
}

export interface LinodeVolumeConfig {
  label: string;
  size: number; // GB
  region: string;
  linodeId?: number;
  filesystemPath?: string;
  tags: string[];
}

export interface LinodeMonitoringConfig {
  longview: {
    enabled: boolean;
    plan: 'free' | 'pro';
    features: {
      processMonitoring: boolean;
      networkMonitoring: boolean;
      diskMonitoring: boolean;
      apacheMonitoring: boolean;
      nginxMonitoring: boolean;
      mysqlMonitoring: boolean;
    };
    alerting: {
      enabled: boolean;
      cpuThreshold: number;
      memoryThreshold: number;
      diskThreshold: number;
      networkThreshold: number;
    };
  };
  customMetrics: {
    enabled: boolean;
    endpoint: string;
    apiKey: string;
    retentionPeriod: number; // days
  };
}

export interface LinodeNetworkingConfig {
  vpc: {
    enabled: boolean;
    label: string;
    region: string;
    description: string;
    subnets: LinodeSubnetConfig[];
  };
  privateNetworking: {
    enabled: boolean;
    vlanLabel: string;
    ipamAddress: string;
  };
  firewall: {
    enabled: boolean;
    rules: LinodeFirewallRule[];
    tags: string[];
  };
  dns: {
    enabled: boolean;
    domain: string;
    records: LinodeDnsRecord[];
  };
}

export interface LinodeSubnetConfig {
  label: string;
  ipv4: string;
  ipv6?: string;
}

export interface LinodeFirewallRule {
  action: 'ACCEPT' | 'DROP';
  protocol: 'TCP' | 'UDP' | 'ICMP';
  ports?: string;
  addresses: {
    ipv4?: string[];
    ipv6?: string[];
  };
  label: string;
  description: string;
}

export interface LinodeDnsRecord {
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'SRV';
  name: string;
  target: string;
  priority?: number;
  weight?: number;
  port?: number;
  service?: string;
  protocol?: string;
  ttlSec: number;
}

@Injectable()
export class LinodeProviderConfig {
  constructor(private configService: ConfigService) {}

  /**
   * Get Linode service mapping configuration
   */
  getServiceMapping(): LinodeServiceMapping {
    return {
      compute: this.getComputeConfig(),
      database: this.getDatabaseConfig(),
      cache: this.getCacheConfig(),
      loadBalancer: this.getLoadBalancerConfig(),
      storage: this.getStorageConfig(),
      monitoring: this.getMonitoringConfig(),
      networking: this.getNetworkingConfig(),
    };
  }

  /**
   * Get Linode region configuration
   */
  getRegionConfig(): string {
    return this.configService.get('LINODE_REGION', 'us-east');
  }

  /**
   * Get Linode API configuration
   */
  getApiConfig(): {
    token: string;
    baseUrl: string;
    version: string;
  } {
    return {
      token: this.configService.get('LINODE_API_TOKEN', ''),
      baseUrl: 'https://api.linode.com',
      version: 'v4',
    };
  }

  /**
   * Get Linode tags configuration
   */
  getTagsConfig(): string[] {
    return [
      'sikka-transportation',
      `env:${this.configService.get('NODE_ENV', 'development')}`,
      'managed-by:sikka-scaling-service',
      'cost-center:engineering',
      'owner:platform-team',
    ];
  }

  private getComputeConfig(): LinodeComputeConfig {
    return {
      instanceTypes: {
        launch: [
          {
            type: 'g6-nanode-1',
            label: 'Shared CPU 1GB',
            vcpu: 1,
            memory: 1,
            storage: 25,
            transfer: 1000,
            networkPerformance: '40 Gbps',
            costPerHour: 0.0075,
            costPerMonth: 5.50,
            dedicated: false,
            suitable: ['web', 'api'],
          },
          {
            type: 'g6-standard-2',
            label: 'Shared CPU 4GB',
            vcpu: 2,
            memory: 4,
            storage: 80,
            transfer: 4000,
            networkPerformance: '40 Gbps',
            costPerHour: 0.033,
            costPerMonth: 24.00,
            dedicated: false,
            suitable: ['web', 'api', 'worker'],
          },
        ],
        growth: [
          {
            type: 'g6-standard-4',
            label: 'Shared CPU 8GB',
            vcpu: 4,
            memory: 8,
            storage: 160,
            transfer: 5000,
            networkPerformance: '40 Gbps',
            costPerHour: 0.066,
            costPerMonth: 48.00,
            dedicated: false,
            suitable: ['web', 'api', 'worker'],
          },
          {
            type: 'g6-dedicated-4',
            label: 'Dedicated CPU 8GB',
            vcpu: 4,
            memory: 8,
            storage: 160,
            transfer: 4000,
            networkPerformance: '40 Gbps',
            costPerHour: 0.12,
            costPerMonth: 86.00,
            dedicated: true,
            suitable: ['api', 'worker', 'database'],
          },
        ],
        scale: [
          {
            type: 'g6-dedicated-8',
            label: 'Dedicated CPU 16GB',
            vcpu: 8,
            memory: 16,
            storage: 320,
            transfer: 6000,
            networkPerformance: '40 Gbps',
            costPerHour: 0.24,
            costPerMonth: 173.00,
            dedicated: true,
            suitable: ['api', 'worker', 'database'],
          },
          {
            type: 'g6-dedicated-16',
            label: 'Dedicated CPU 32GB',
            vcpu: 16,
            memory: 32,
            storage: 640,
            transfer: 7000,
            networkPerformance: '40 Gbps',
            costPerHour: 0.48,
            costPerMonth: 346.00,
            dedicated: true,
            suitable: ['api', 'worker', 'database', 'cache'],
          },
        ],
      },
      autoScaling: {
        enabled: true,
        minInstances: 2,
        maxInstances: 15,
        targetCpuUtilization: 70,
        scaleUpCooldown: 300,
        scaleDownCooldown: 300,
      },
      kubernetes: {
        enabled: true,
        version: '1.28',
        nodePoolConfig: [
          {
            type: 'g6-standard-2',
            count: 3,
            minCount: 2,
            maxCount: 10,
            autoScale: true,
            tags: ['worker-nodes'],
          },
        ],
      },
    };
  }

  private getDatabaseConfig(): LinodeDatabaseConfig {
    return {
      managedDatabase: {
        engines: ['postgresql', 'mysql'],
        versions: {
          postgresql: ['13', '14', '15'],
          mysql: ['8.0'],
        },
        plans: {
          launch: [
            {
              type: 'g6-nanode-1',
              label: 'Managed Database 1GB',
              vcpu: 1,
              memory: 1,
              storage: 25,
              costPerHour: 0.021,
              costPerMonth: 15.00,
              maxConnections: 97,
              suitable: ['development', 'testing'],
            },
            {
              type: 'g6-standard-1',
              label: 'Managed Database 2GB',
              vcpu: 1,
              memory: 2,
              storage: 50,
              costPerHour: 0.042,
              costPerMonth: 30.00,
              maxConnections: 197,
              suitable: ['launch'],
            },
          ],
          growth: [
            {
              type: 'g6-standard-2',
              label: 'Managed Database 4GB',
              vcpu: 2,
              memory: 4,
              storage: 80,
              costPerHour: 0.083,
              costPerMonth: 60.00,
              maxConnections: 397,
              suitable: ['growth'],
            },
            {
              type: 'g6-standard-4',
              label: 'Managed Database 8GB',
              vcpu: 4,
              memory: 8,
              storage: 160,
              costPerHour: 0.167,
              costPerMonth: 120.00,
              maxConnections: 797,
              suitable: ['growth'],
            },
          ],
          scale: [
            {
              type: 'g6-standard-8',
              label: 'Managed Database 16GB',
              vcpu: 8,
              memory: 16,
              storage: 320,
              costPerHour: 0.333,
              costPerMonth: 240.00,
              maxConnections: 1597,
              suitable: ['scale'],
            },
            {
              type: 'g6-dedicated-16',
              label: 'Managed Database 32GB',
              vcpu: 16,
              memory: 32,
              storage: 640,
              costPerHour: 0.667,
              costPerMonth: 480.00,
              maxConnections: 3197,
              suitable: ['scale'],
            },
          ],
        },
        features: {
          readReplicas: true,
          pointInTimeRecovery: true,
          automaticBackups: true,
          ssl: true,
          privateNetworking: true,
        },
        backup: {
          retentionPeriod: 30,
          backupWindow: '02:00-04:00',
          crossRegionBackup: false,
        },
      },
    };
  }

  private getCacheConfig(): LinodeCacheConfig {
    return {
      selfManaged: {
        enabled: true,
        redisVersion: '7.0',
        instanceTypes: [
          {
            type: 'g6-standard-1',
            label: 'Redis 2GB',
            vcpu: 1,
            memory: 2,
            storage: 50,
            transfer: 2000,
            networkPerformance: '40 Gbps',
            costPerHour: 0.015,
            costPerMonth: 11.00,
            dedicated: false,
            suitable: ['launch'],
          },
          {
            type: 'g6-standard-2',
            label: 'Redis 4GB',
            vcpu: 2,
            memory: 4,
            storage: 80,
            transfer: 4000,
            networkPerformance: '40 Gbps',
            costPerHour: 0.033,
            costPerMonth: 24.00,
            dedicated: false,
            suitable: ['growth'],
          },
          {
            type: 'g6-dedicated-8',
            label: 'Redis 16GB',
            vcpu: 8,
            memory: 16,
            storage: 320,
            transfer: 6000,
            networkPerformance: '40 Gbps',
            costPerHour: 0.24,
            costPerMonth: 173.00,
            dedicated: true,
            suitable: ['scale'],
          },
        ],
        clustering: {
          enabled: true,
          minNodes: 3,
          maxNodes: 12,
        },
        sentinel: {
          enabled: true,
          instances: 3,
        },
        persistence: {
          enabled: true,
          snapshotInterval: 3600, // 1 hour
        },
      },
    };
  }

  private getLoadBalancerConfig(): LinodeLoadBalancerConfig {
    return {
      nodeBalancer: {
        enabled: true,
        algorithm: 'roundrobin',
        stickiness: 'http_cookie',
        healthCheck: {
          type: 'http',
          interval: 5,
          timeout: 3,
          attempts: 2,
          path: '/health',
        },
        ssl: {
          enabled: true,
          certificate: '',
          privateKey: '',
        },
        costPerHour: 0.014,
        costPerMonth: 10.00,
      },
    };
  }

  private getStorageConfig(): LinodeStorageConfig {
    return {
      objectStorage: {
        enabled: true,
        regions: ['us-east-1', 'eu-central-1', 'ap-south-1'],
        bucketName: 'sikka-transportation-storage',
        accessKey: this.configService.get('LINODE_OBJECT_STORAGE_ACCESS_KEY', ''),
        secretKey: this.configService.get('LINODE_OBJECT_STORAGE_SECRET_KEY', ''),
        s3Compatible: true,
        costPerGB: 0.02,
        features: {
          versioning: true,
          lifecycle: true,
          cors: true,
          staticWebsite: true,
        },
      },
      blockStorage: {
        enabled: true,
        volumes: [
          {
            label: 'sikka-app-data',
            size: 100,
            region: this.getRegionConfig(),
            tags: ['app-data', 'production'],
          },
          {
            label: 'sikka-database-backup',
            size: 200,
            region: this.getRegionConfig(),
            tags: ['database-backup', 'production'],
          },
        ],
        encryption: true,
        costPerGB: 0.10,
        maxSize: 10240, // 10TB
        maxIOPS: 40000,
      },
    };
  }

  private getMonitoringConfig(): LinodeMonitoringConfig {
    return {
      longview: {
        enabled: true,
        plan: 'free',
        features: {
          processMonitoring: true,
          networkMonitoring: true,
          diskMonitoring: true,
          apacheMonitoring: false,
          nginxMonitoring: true,
          mysqlMonitoring: false,
        },
        alerting: {
          enabled: true,
          cpuThreshold: 80,
          memoryThreshold: 85,
          diskThreshold: 90,
          networkThreshold: 1000, // MB/s
        },
      },
      customMetrics: {
        enabled: false, // Can integrate with external monitoring
        endpoint: '',
        apiKey: '',
        retentionPeriod: 30,
      },
    };
  }

  private getNetworkingConfig(): LinodeNetworkingConfig {
    return {
      vpc: {
        enabled: true,
        label: 'sikka-transportation-vpc',
        region: this.getRegionConfig(),
        description: 'VPC for Sikka Transportation Platform',
        subnets: [
          {
            label: 'sikka-public-subnet',
            ipv4: '10.0.1.0/24',
          },
          {
            label: 'sikka-private-subnet',
            ipv4: '10.0.2.0/24',
          },
        ],
      },
      privateNetworking: {
        enabled: true,
        vlanLabel: 'sikka-private-network',
        ipamAddress: '10.0.0.0/16',
      },
      firewall: {
        enabled: true,
        rules: [
          {
            action: 'ACCEPT',
            protocol: 'TCP',
            ports: '22',
            addresses: {
              ipv4: ['0.0.0.0/0'], // Restrict in production
            },
            label: 'SSH Access',
            description: 'Allow SSH access',
          },
          {
            action: 'ACCEPT',
            protocol: 'TCP',
            ports: '80,443',
            addresses: {
              ipv4: ['0.0.0.0/0'],
            },
            label: 'HTTP/HTTPS Access',
            description: 'Allow web traffic',
          },
          {
            action: 'ACCEPT',
            protocol: 'TCP',
            ports: '3000',
            addresses: {
              ipv4: ['10.0.0.0/16'],
            },
            label: 'App Access',
            description: 'Allow internal app access',
          },
          {
            action: 'ACCEPT',
            protocol: 'TCP',
            ports: '5432',
            addresses: {
              ipv4: ['10.0.0.0/16'],
            },
            label: 'Database Access',
            description: 'Allow internal database access',
          },
          {
            action: 'ACCEPT',
            protocol: 'TCP',
            ports: '6379',
            addresses: {
              ipv4: ['10.0.0.0/16'],
            },
            label: 'Redis Access',
            description: 'Allow internal Redis access',
          },
        ],
        tags: this.getTagsConfig(),
      },
      dns: {
        enabled: true,
        domain: 'sikka-transport.com',
        records: [
          {
            type: 'A',
            name: 'api',
            target: '0.0.0.0', // Will be updated with actual IP
            ttlSec: 300,
          },
          {
            type: 'A',
            name: 'www',
            target: '0.0.0.0', // Will be updated with actual IP
            ttlSec: 300,
          },
          {
            type: 'CNAME',
            name: 'app',
            target: 'api.sikka-transport.com',
            ttlSec: 300,
          },
        ],
      },
    };
  }
}

