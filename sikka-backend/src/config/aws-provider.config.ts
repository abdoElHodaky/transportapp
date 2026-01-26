import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * AWS Provider Specific Configuration
 *
 * Contains AWS-specific settings, service mappings, and optimizations
 * for the Sikka Transportation Platform scaling strategy.
 */

export interface AwsServiceMapping {
  compute: AwsComputeConfig;
  database: AwsDatabaseConfig;
  cache: AwsCacheConfig;
  loadBalancer: AwsLoadBalancerConfig;
  storage: AwsStorageConfig;
  monitoring: AwsMonitoringConfig;
  networking: AwsNetworkingConfig;
}

export interface AwsComputeConfig {
  instanceTypes: {
    launch: AwsInstanceSpec[];
    growth: AwsInstanceSpec[];
    scale: AwsInstanceSpec[];
  };
  autoScaling: {
    enabled: boolean;
    minInstances: number;
    maxInstances: number;
    targetCpuUtilization: number;
    scaleUpCooldown: number;
    scaleDownCooldown: number;
  };
  spotInstances: {
    enabled: boolean;
    maxSpotPrice: number;
    spotFleetRequestType: 'maintain' | 'request';
  };
  reservedInstances: {
    enabled: boolean;
    term: '1year' | '3year';
    paymentOption: 'no-upfront' | 'partial-upfront' | 'all-upfront';
  };
}

export interface AwsInstanceSpec {
  instanceType: string;
  vcpu: number;
  memory: number; // GB
  storage: number; // GB
  networkPerformance: string;
  costPerHour: number;
  costPerMonth: number;
  ebsOptimized: boolean;
  enhancedNetworking: boolean;
  suitable: string[];
}

export interface AwsDatabaseConfig {
  rds: {
    engine: 'postgres' | 'mysql';
    version: string;
    instanceClasses: {
      launch: string[];
      growth: string[];
      scale: string[];
    };
    multiAZ: boolean;
    readReplicas: {
      enabled: boolean;
      maxReplicas: number;
      crossRegion: boolean;
    };
    backup: {
      retentionPeriod: number;
      backupWindow: string;
      maintenanceWindow: string;
      deleteAutomatedBackups: boolean;
    };
    monitoring: {
      performanceInsights: boolean;
      enhancedMonitoring: boolean;
      monitoringInterval: number;
    };
  };
  aurora: {
    enabled: boolean;
    serverless: boolean;
    globalDatabase: boolean;
    backtrack: boolean;
  };
}

export interface AwsCacheConfig {
  elastiCache: {
    engine: 'redis' | 'memcached';
    version: string;
    nodeTypes: {
      launch: string[];
      growth: string[];
      scale: string[];
    };
    replicationGroup: {
      enabled: boolean;
      numCacheClusters: number;
      automaticFailover: boolean;
      multiAZ: boolean;
    };
    cluster: {
      enabled: boolean;
      numNodeGroups: number;
      replicasPerNodeGroup: number;
    };
    backup: {
      snapshotRetentionLimit: number;
      snapshotWindow: string;
    };
  };
}

export interface AwsLoadBalancerConfig {
  applicationLoadBalancer: {
    enabled: boolean;
    scheme: 'internet-facing' | 'internal';
    ipAddressType: 'ipv4' | 'dualstack';
    deletionProtection: boolean;
    accessLogs: {
      enabled: boolean;
      s3Bucket: string;
      s3Prefix: string;
    };
  };
  networkLoadBalancer: {
    enabled: boolean;
    crossZoneLoadBalancing: boolean;
    preserveClientIp: boolean;
  };
  targetGroups: {
    healthCheck: {
      enabled: boolean;
      intervalSeconds: number;
      timeoutSeconds: number;
      healthyThresholdCount: number;
      unhealthyThresholdCount: number;
      path: string;
      matcher: string;
    };
    stickiness: {
      enabled: boolean;
      type: 'lb_cookie' | 'app_cookie';
      durationSeconds: number;
    };
  };
}

export interface AwsStorageConfig {
  s3: {
    bucketName: string;
    region: string;
    versioning: boolean;
    encryption: {
      enabled: boolean;
      kmsKeyId?: string;
    };
    lifecycle: {
      enabled: boolean;
      transitionToIA: number; // days
      transitionToGlacier: number; // days
      expiration: number; // days
    };
    cors: {
      enabled: boolean;
      allowedOrigins: string[];
      allowedMethods: string[];
      allowedHeaders: string[];
    };
  };
  ebs: {
    volumeType: 'gp2' | 'gp3' | 'io1' | 'io2';
    size: number; // GB
    iops?: number;
    throughput?: number; // MB/s
    encrypted: boolean;
    kmsKeyId?: string;
    deleteOnTermination: boolean;
  };
  efs: {
    enabled: boolean;
    performanceMode: 'generalPurpose' | 'maxIO';
    throughputMode: 'bursting' | 'provisioned';
    provisionedThroughputInMibps?: number;
    encrypted: boolean;
  };
}

export interface AwsMonitoringConfig {
  cloudWatch: {
    enabled: boolean;
    detailedMonitoring: boolean;
    customMetrics: boolean;
    logGroups: {
      retentionInDays: number;
      kmsKeyId?: string;
    };
    alarms: {
      cpuUtilization: {
        threshold: number;
        comparisonOperator: string;
        evaluationPeriods: number;
      };
      memoryUtilization: {
        threshold: number;
        comparisonOperator: string;
        evaluationPeriods: number;
      };
      diskUtilization: {
        threshold: number;
        comparisonOperator: string;
        evaluationPeriods: number;
      };
    };
  };
  xRay: {
    enabled: boolean;
    tracingConfig: 'Active' | 'PassThrough';
  };
  cloudTrail: {
    enabled: boolean;
    includeGlobalServiceEvents: boolean;
    isMultiRegionTrail: boolean;
    enableLogFileValidation: boolean;
    s3BucketName: string;
  };
}

export interface AwsNetworkingConfig {
  vpc: {
    cidrBlock: string;
    enableDnsHostnames: boolean;
    enableDnsSupport: boolean;
    instanceTenancy: 'default' | 'dedicated';
  };
  subnets: {
    public: {
      cidrBlocks: string[];
      mapPublicIpOnLaunch: boolean;
    };
    private: {
      cidrBlocks: string[];
      mapPublicIpOnLaunch: boolean;
    };
  };
  internetGateway: {
    enabled: boolean;
  };
  natGateway: {
    enabled: boolean;
    count: number; // Number of NAT gateways for HA
  };
  securityGroups: {
    web: {
      ingressRules: SecurityGroupRule[];
      egressRules: SecurityGroupRule[];
    };
    app: {
      ingressRules: SecurityGroupRule[];
      egressRules: SecurityGroupRule[];
    };
    database: {
      ingressRules: SecurityGroupRule[];
      egressRules: SecurityGroupRule[];
    };
  };
  route53: {
    enabled: boolean;
    hostedZoneName: string;
    recordTypes: string[];
  };
  cloudFront: {
    enabled: boolean;
    priceClass: 'PriceClass_All' | 'PriceClass_200' | 'PriceClass_100';
    cacheBehaviors: {
      defaultTTL: number;
      maxTTL: number;
      minTTL: number;
    };
  };
}

export interface SecurityGroupRule {
  protocol: 'tcp' | 'udp' | 'icmp' | 'all';
  fromPort: number;
  toPort: number;
  cidrBlocks?: string[];
  sourceSecurityGroupId?: string;
  description: string;
}

@Injectable()
export class AwsProviderConfig {
  constructor(private configService: ConfigService) {}

  /**
   * Get AWS service mapping configuration
   */
  getServiceMapping(): AwsServiceMapping {
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
   * Get AWS region configuration
   */
  getRegionConfig(): string {
    return this.configService.get('AWS_REGION', 'us-east-1');
  }

  /**
   * Get AWS credentials configuration
   */
  getCredentialsConfig(): {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  } {
    return {
      accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID', ''),
      secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY', ''),
      sessionToken: this.configService.get('AWS_SESSION_TOKEN'),
    };
  }

  /**
   * Get AWS tags configuration
   */
  getTagsConfig(): Record<string, string> {
    return {
      Project: 'Sikka-Transportation',
      Environment: this.configService.get('NODE_ENV', 'development'),
      ManagedBy: 'Sikka-Scaling-Service',
      CostCenter: 'Engineering',
      Owner: 'Platform-Team',
    };
  }

  private getComputeConfig(): AwsComputeConfig {
    return {
      instanceTypes: {
        launch: [
          {
            instanceType: 't3.micro',
            vcpu: 2,
            memory: 1,
            storage: 20,
            networkPerformance: 'Up to 5 Gbps',
            costPerHour: 0.0104,
            costPerMonth: 7.59,
            ebsOptimized: true,
            enhancedNetworking: false,
            suitable: ['web', 'api'],
          },
          {
            instanceType: 't3.small',
            vcpu: 2,
            memory: 2,
            storage: 20,
            networkPerformance: 'Up to 5 Gbps',
            costPerHour: 0.0208,
            costPerMonth: 15.18,
            ebsOptimized: true,
            enhancedNetworking: false,
            suitable: ['web', 'api', 'worker'],
          },
        ],
        growth: [
          {
            instanceType: 't3.medium',
            vcpu: 2,
            memory: 4,
            storage: 20,
            networkPerformance: 'Up to 5 Gbps',
            costPerHour: 0.0416,
            costPerMonth: 30.37,
            ebsOptimized: true,
            enhancedNetworking: false,
            suitable: ['web', 'api', 'worker'],
          },
          {
            instanceType: 'c5.large',
            vcpu: 2,
            memory: 4,
            storage: 20,
            networkPerformance: 'Up to 10 Gbps',
            costPerHour: 0.085,
            costPerMonth: 62.05,
            ebsOptimized: true,
            enhancedNetworking: true,
            suitable: ['api', 'worker'],
          },
        ],
        scale: [
          {
            instanceType: 'c5.xlarge',
            vcpu: 4,
            memory: 8,
            storage: 40,
            networkPerformance: 'Up to 10 Gbps',
            costPerHour: 0.17,
            costPerMonth: 124.1,
            ebsOptimized: true,
            enhancedNetworking: true,
            suitable: ['api', 'worker'],
          },
          {
            instanceType: 'c5.2xlarge',
            vcpu: 8,
            memory: 16,
            storage: 80,
            networkPerformance: 'Up to 10 Gbps',
            costPerHour: 0.34,
            costPerMonth: 248.2,
            ebsOptimized: true,
            enhancedNetworking: true,
            suitable: ['api', 'worker', 'database'],
          },
        ],
      },
      autoScaling: {
        enabled: true,
        minInstances: 2,
        maxInstances: 20,
        targetCpuUtilization: 70,
        scaleUpCooldown: 300,
        scaleDownCooldown: 300,
      },
      spotInstances: {
        enabled: false, // Disabled for production stability
        maxSpotPrice: 0.1,
        spotFleetRequestType: 'maintain',
      },
      reservedInstances: {
        enabled: true,
        term: '1year',
        paymentOption: 'no-upfront',
      },
    };
  }

  private getDatabaseConfig(): AwsDatabaseConfig {
    return {
      rds: {
        engine: 'postgres',
        version: '15.4',
        instanceClasses: {
          launch: ['db.t3.micro', 'db.t3.small'],
          growth: ['db.t3.medium', 'db.r5.large'],
          scale: ['db.r5.xlarge', 'db.r5.2xlarge'],
        },
        multiAZ: true,
        readReplicas: {
          enabled: true,
          maxReplicas: 5,
          crossRegion: false,
        },
        backup: {
          retentionPeriod: 7,
          backupWindow: '03:00-04:00',
          maintenanceWindow: 'sun:04:00-sun:05:00',
          deleteAutomatedBackups: false,
        },
        monitoring: {
          performanceInsights: true,
          enhancedMonitoring: true,
          monitoringInterval: 60,
        },
      },
      aurora: {
        enabled: false, // Start with standard RDS
        serverless: false,
        globalDatabase: false,
        backtrack: false,
      },
    };
  }

  private getCacheConfig(): AwsCacheConfig {
    return {
      elastiCache: {
        engine: 'redis',
        version: '7.0',
        nodeTypes: {
          launch: ['cache.t3.micro', 'cache.t3.small'],
          growth: ['cache.r6g.large', 'cache.r6g.xlarge'],
          scale: ['cache.r6g.2xlarge', 'cache.r6g.4xlarge'],
        },
        replicationGroup: {
          enabled: true,
          numCacheClusters: 2,
          automaticFailover: true,
          multiAZ: true,
        },
        cluster: {
          enabled: false, // Enable for scale phase
          numNodeGroups: 3,
          replicasPerNodeGroup: 1,
        },
        backup: {
          snapshotRetentionLimit: 5,
          snapshotWindow: '02:00-03:00',
        },
      },
    };
  }

  private getLoadBalancerConfig(): AwsLoadBalancerConfig {
    return {
      applicationLoadBalancer: {
        enabled: true,
        scheme: 'internet-facing',
        ipAddressType: 'ipv4',
        deletionProtection: true,
        accessLogs: {
          enabled: true,
          s3Bucket: 'sikka-alb-logs',
          s3Prefix: 'access-logs',
        },
      },
      networkLoadBalancer: {
        enabled: false, // Use for scale phase if needed
        crossZoneLoadBalancing: true,
        preserveClientIp: true,
      },
      targetGroups: {
        healthCheck: {
          enabled: true,
          intervalSeconds: 30,
          timeoutSeconds: 5,
          healthyThresholdCount: 2,
          unhealthyThresholdCount: 3,
          path: '/health',
          matcher: '200',
        },
        stickiness: {
          enabled: true,
          type: 'lb_cookie',
          durationSeconds: 86400,
        },
      },
    };
  }

  private getStorageConfig(): AwsStorageConfig {
    return {
      s3: {
        bucketName: 'sikka-transportation-storage',
        region: this.getRegionConfig(),
        versioning: true,
        encryption: {
          enabled: true,
          kmsKeyId: undefined, // Use default S3 encryption
        },
        lifecycle: {
          enabled: true,
          transitionToIA: 30,
          transitionToGlacier: 90,
          expiration: 365,
        },
        cors: {
          enabled: true,
          allowedOrigins: ['*'],
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
          allowedHeaders: ['*'],
        },
      },
      ebs: {
        volumeType: 'gp3',
        size: 100,
        iops: 3000,
        throughput: 125,
        encrypted: true,
        deleteOnTermination: false,
      },
      efs: {
        enabled: false, // Enable if shared file storage needed
        performanceMode: 'generalPurpose',
        throughputMode: 'bursting',
        encrypted: true,
      },
    };
  }

  private getMonitoringConfig(): AwsMonitoringConfig {
    return {
      cloudWatch: {
        enabled: true,
        detailedMonitoring: true,
        customMetrics: true,
        logGroups: {
          retentionInDays: 30,
        },
        alarms: {
          cpuUtilization: {
            threshold: 80,
            comparisonOperator: 'GreaterThanThreshold',
            evaluationPeriods: 2,
          },
          memoryUtilization: {
            threshold: 85,
            comparisonOperator: 'GreaterThanThreshold',
            evaluationPeriods: 2,
          },
          diskUtilization: {
            threshold: 90,
            comparisonOperator: 'GreaterThanThreshold',
            evaluationPeriods: 1,
          },
        },
      },
      xRay: {
        enabled: true,
        tracingConfig: 'Active',
      },
      cloudTrail: {
        enabled: true,
        includeGlobalServiceEvents: true,
        isMultiRegionTrail: true,
        enableLogFileValidation: true,
        s3BucketName: 'sikka-cloudtrail-logs',
      },
    };
  }

  private getNetworkingConfig(): AwsNetworkingConfig {
    return {
      vpc: {
        cidrBlock: '10.0.0.0/16',
        enableDnsHostnames: true,
        enableDnsSupport: true,
        instanceTenancy: 'default',
      },
      subnets: {
        public: {
          cidrBlocks: ['10.0.1.0/24', '10.0.2.0/24'],
          mapPublicIpOnLaunch: true,
        },
        private: {
          cidrBlocks: ['10.0.10.0/24', '10.0.20.0/24'],
          mapPublicIpOnLaunch: false,
        },
      },
      internetGateway: {
        enabled: true,
      },
      natGateway: {
        enabled: true,
        count: 2, // One per AZ for HA
      },
      securityGroups: {
        web: {
          ingressRules: [
            {
              protocol: 'tcp',
              fromPort: 80,
              toPort: 80,
              cidrBlocks: ['0.0.0.0/0'],
              description: 'HTTP access',
            },
            {
              protocol: 'tcp',
              fromPort: 443,
              toPort: 443,
              cidrBlocks: ['0.0.0.0/0'],
              description: 'HTTPS access',
            },
          ],
          egressRules: [
            {
              protocol: 'all',
              fromPort: 0,
              toPort: 65535,
              cidrBlocks: ['0.0.0.0/0'],
              description: 'All outbound traffic',
            },
          ],
        },
        app: {
          ingressRules: [
            {
              protocol: 'tcp',
              fromPort: 3000,
              toPort: 3000,
              sourceSecurityGroupId: 'sg-web',
              description: 'App access from web tier',
            },
          ],
          egressRules: [
            {
              protocol: 'all',
              fromPort: 0,
              toPort: 65535,
              cidrBlocks: ['0.0.0.0/0'],
              description: 'All outbound traffic',
            },
          ],
        },
        database: {
          ingressRules: [
            {
              protocol: 'tcp',
              fromPort: 5432,
              toPort: 5432,
              sourceSecurityGroupId: 'sg-app',
              description: 'PostgreSQL access from app tier',
            },
          ],
          egressRules: [],
        },
      },
      route53: {
        enabled: true,
        hostedZoneName: 'sikka-transport.com',
        recordTypes: ['A', 'CNAME', 'MX'],
      },
      cloudFront: {
        enabled: true,
        priceClass: 'PriceClass_100',
        cacheBehaviors: {
          defaultTTL: 86400,
          maxTTL: 31536000,
          minTTL: 0,
        },
      },
    };
  }

  /**
   * Get the complete AWS provider configuration
   */
  getProviderConfig(): AwsServiceMapping {
    return this.getServiceMapping();
  }
}
