import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Cloud Provider Configuration
 * 
 * Manages configuration for multiple cloud providers and provides
 * intelligent provider selection based on cost, performance, and requirements.
 */

export interface CloudProviderConfig {
  name: 'aws' | 'linode';
  displayName: string;
  enabled: boolean;
  priority: number; // Lower number = higher priority
  regions: CloudProviderRegion[];
  services: CloudProviderServices;
  pricing: CloudProviderPricing;
  features: CloudProviderFeatures;
  limits: CloudProviderLimits;
}

export interface CloudProviderRegion {
  id: string;
  name: string;
  location: string;
  available: boolean;
  latency?: number; // Average latency in ms from primary region
  costMultiplier: number; // Regional cost multiplier (1.0 = base cost)
  dataResidency: string[]; // Compliance regions (EU, US, etc.)
}

export interface CloudProviderServices {
  compute: ComputeServiceConfig;
  database: DatabaseServiceConfig;
  cache: CacheServiceConfig;
  loadBalancer: LoadBalancerServiceConfig;
  storage: StorageServiceConfig;
  monitoring: MonitoringServiceConfig;
  networking: NetworkingServiceConfig;
}

export interface ComputeServiceConfig {
  available: boolean;
  instanceTypes: InstanceType[];
  autoScaling: boolean;
  spotInstances: boolean;
  reservedInstances: boolean;
  containerOrchestration: boolean;
}

export interface InstanceType {
  name: string;
  vcpu: number;
  memory: number; // GB
  storage: number; // GB
  networkPerformance: string;
  costPerHour: number;
  costPerMonth: number;
  suitable: ('launch' | 'growth' | 'scale')[];
}

export interface DatabaseServiceConfig {
  available: boolean;
  engines: string[]; // postgresql, mysql, etc.
  managedService: boolean;
  readReplicas: boolean;
  multiAZ: boolean;
  backupRetention: number; // days
  pointInTimeRecovery: boolean;
}

export interface CacheServiceConfig {
  available: boolean;
  engines: string[]; // redis, memcached
  managedService: boolean;
  clustering: boolean;
  sentinel: boolean;
  persistence: boolean;
}

export interface LoadBalancerServiceConfig {
  available: boolean;
  types: string[]; // application, network, classic
  sslTermination: boolean;
  healthChecks: boolean;
  stickySessions: boolean;
  costPerHour: number;
}

export interface StorageServiceConfig {
  objectStorage: {
    available: boolean;
    costPerGB: number;
    s3Compatible: boolean;
  };
  blockStorage: {
    available: boolean;
    costPerGB: number;
    maxIOPS: number;
  };
  fileStorage: {
    available: boolean;
    costPerGB: number;
    nfsCompatible: boolean;
  };
}

export interface MonitoringServiceConfig {
  available: boolean;
  managedService: boolean;
  customMetrics: boolean;
  alerting: boolean;
  dashboards: boolean;
  logAggregation: boolean;
  costPerMetric: number;
}

export interface NetworkingServiceConfig {
  vpc: boolean;
  privateNetworking: boolean;
  cdn: boolean;
  dns: boolean;
  firewall: boolean;
  ddosProtection: boolean;
}

export interface CloudProviderPricing {
  currency: string;
  dataTransfer: {
    inbound: number; // per GB
    outbound: number; // per GB
    interRegion: number; // per GB
  };
  support: {
    basic: number; // monthly cost
    standard: number;
    premium: number;
  };
  discounts: {
    reservedInstances: number; // percentage discount
    spotInstances: number; // percentage discount
    volumeDiscount: number; // percentage discount for high usage
  };
}

export interface CloudProviderFeatures {
  compliance: string[]; // GDPR, HIPAA, SOC2, etc.
  sla: number; // 99.9, 99.95, 99.99
  support: {
    documentation: 'excellent' | 'good' | 'fair' | 'poor';
    community: 'excellent' | 'good' | 'fair' | 'poor';
    enterprise: boolean;
  };
  ecosystem: {
    thirdPartyIntegrations: number;
    marketplaceApps: number;
    apiQuality: 'excellent' | 'good' | 'fair' | 'poor';
  };
}

export interface CloudProviderLimits {
  maxInstances: number;
  maxStorage: number; // GB
  maxDatabases: number;
  maxLoadBalancers: number;
  apiRateLimit: number; // requests per minute
}

@Injectable()
export class CloudProvidersConfig {
  constructor(private configService: ConfigService) {}

  /**
   * Get all available cloud provider configurations
   */
  getAllProviders(): CloudProviderConfig[] {
    return [
      this.getAwsConfig(),
      this.getLinodeConfig(),
    ].filter(provider => provider.enabled);
  }

  /**
   * Get configuration for a specific provider
   */
  getProviderConfig(providerName: 'aws' | 'linode'): CloudProviderConfig | null {
    switch (providerName) {
      case 'aws':
        return this.getAwsConfig();
      case 'linode':
        return this.getLinodeConfig();
      default:
        return null;
    }
  }

  /**
   * Get the preferred provider based on configuration
   */
  getPreferredProvider(): CloudProviderConfig {
    const preferredProvider = this.configService.get('PREFERRED_CLOUD_PROVIDER', 'auto');
    
    if (preferredProvider === 'auto') {
      return this.selectOptimalProvider();
    }
    
    const provider = this.getProviderConfig(preferredProvider as 'aws' | 'linode');
    return provider || this.getLinodeConfig(); // Default to Linode for cost optimization
  }

  /**
   * Select optimal provider based on cost and performance
   */
  private selectOptimalProvider(): CloudProviderConfig {
    const providers = this.getAllProviders();
    const scalingPhase = this.configService.get('SCALING_PHASE', 'launch');
    
    // For launch phase, prioritize cost (Linode)
    if (scalingPhase === 'launch') {
      return providers.find(p => p.name === 'linode') || providers[0];
    }
    
    // For growth and scale phases, consider feature availability
    return providers.sort((a, b) => a.priority - b.priority)[0];
  }

  /**
   * AWS Configuration
   */
  private getAwsConfig(): CloudProviderConfig {
    return {
      name: 'aws',
      displayName: 'Amazon Web Services',
      enabled: this.configService.get('AWS_ENABLED', 'true') === 'true',
      priority: 2,
      regions: [
        {
          id: 'us-east-1',
          name: 'US East (N. Virginia)',
          location: 'Virginia, USA',
          available: true,
          latency: 50,
          costMultiplier: 1.0,
          dataResidency: ['US'],
        },
        {
          id: 'us-west-2',
          name: 'US West (Oregon)',
          location: 'Oregon, USA',
          available: true,
          latency: 80,
          costMultiplier: 1.0,
          dataResidency: ['US'],
        },
        {
          id: 'eu-west-1',
          name: 'Europe (Ireland)',
          location: 'Dublin, Ireland',
          available: true,
          latency: 120,
          costMultiplier: 1.1,
          dataResidency: ['EU'],
        },
      ],
      services: {
        compute: {
          available: true,
          instanceTypes: [
            {
              name: 't3.micro',
              vcpu: 2,
              memory: 1,
              storage: 20,
              networkPerformance: 'Up to 5 Gbps',
              costPerHour: 0.0104,
              costPerMonth: 7.59,
              suitable: ['launch'],
            },
            {
              name: 't3.medium',
              vcpu: 2,
              memory: 4,
              storage: 20,
              networkPerformance: 'Up to 5 Gbps',
              costPerHour: 0.0416,
              costPerMonth: 30.37,
              suitable: ['launch', 'growth'],
            },
            {
              name: 'c5.large',
              vcpu: 2,
              memory: 4,
              storage: 20,
              networkPerformance: 'Up to 10 Gbps',
              costPerHour: 0.085,
              costPerMonth: 62.05,
              suitable: ['growth'],
            },
            {
              name: 'c5.2xlarge',
              vcpu: 8,
              memory: 16,
              storage: 80,
              networkPerformance: 'Up to 10 Gbps',
              costPerHour: 0.34,
              costPerMonth: 248.20,
              suitable: ['scale'],
            },
          ],
          autoScaling: true,
          spotInstances: true,
          reservedInstances: true,
          containerOrchestration: true,
        },
        database: {
          available: true,
          engines: ['postgresql', 'mysql', 'mariadb'],
          managedService: true,
          readReplicas: true,
          multiAZ: true,
          backupRetention: 35,
          pointInTimeRecovery: true,
        },
        cache: {
          available: true,
          engines: ['redis', 'memcached'],
          managedService: true,
          clustering: true,
          sentinel: true,
          persistence: true,
        },
        loadBalancer: {
          available: true,
          types: ['application', 'network', 'classic'],
          sslTermination: true,
          healthChecks: true,
          stickySessions: true,
          costPerHour: 0.0225,
        },
        storage: {
          objectStorage: {
            available: true,
            costPerGB: 0.023,
            s3Compatible: true,
          },
          blockStorage: {
            available: true,
            costPerGB: 0.10,
            maxIOPS: 64000,
          },
          fileStorage: {
            available: true,
            costPerGB: 0.30,
            nfsCompatible: true,
          },
        },
        monitoring: {
          available: true,
          managedService: true,
          customMetrics: true,
          alerting: true,
          dashboards: true,
          logAggregation: true,
          costPerMetric: 0.30,
        },
        networking: {
          vpc: true,
          privateNetworking: true,
          cdn: true,
          dns: true,
          firewall: true,
          ddosProtection: true,
        },
      },
      pricing: {
        currency: 'USD',
        dataTransfer: {
          inbound: 0.00,
          outbound: 0.09,
          interRegion: 0.02,
        },
        support: {
          basic: 0,
          standard: 29,
          premium: 100,
        },
        discounts: {
          reservedInstances: 30,
          spotInstances: 70,
          volumeDiscount: 10,
        },
      },
      features: {
        compliance: ['GDPR', 'HIPAA', 'SOC2', 'PCI-DSS', 'ISO27001'],
        sla: 99.99,
        support: {
          documentation: 'excellent',
          community: 'excellent',
          enterprise: true,
        },
        ecosystem: {
          thirdPartyIntegrations: 1000,
          marketplaceApps: 500,
          apiQuality: 'excellent',
        },
      },
      limits: {
        maxInstances: 1000,
        maxStorage: 1000000,
        maxDatabases: 100,
        maxLoadBalancers: 50,
        apiRateLimit: 1000,
      },
    };
  }

  /**
   * Linode Configuration
   */
  private getLinodeConfig(): CloudProviderConfig {
    return {
      name: 'linode',
      displayName: 'Linode (Akamai Cloud)',
      enabled: this.configService.get('LINODE_ENABLED', 'true') === 'true',
      priority: 1, // Higher priority for cost optimization
      regions: [
        {
          id: 'us-east',
          name: 'Newark, NJ',
          location: 'Newark, New Jersey, USA',
          available: true,
          latency: 45,
          costMultiplier: 1.0,
          dataResidency: ['US'],
        },
        {
          id: 'us-west',
          name: 'Fremont, CA',
          location: 'Fremont, California, USA',
          available: true,
          latency: 75,
          costMultiplier: 1.0,
          dataResidency: ['US'],
        },
        {
          id: 'eu-west',
          name: 'London, UK',
          location: 'London, United Kingdom',
          available: true,
          latency: 110,
          costMultiplier: 1.0,
          dataResidency: ['EU'],
        },
        {
          id: 'ap-south',
          name: 'Singapore',
          location: 'Singapore',
          available: true,
          latency: 180,
          costMultiplier: 1.0,
          dataResidency: ['APAC'],
        },
      ],
      services: {
        compute: {
          available: true,
          instanceTypes: [
            {
              name: 'Shared CPU 1GB',
              vcpu: 1,
              memory: 1,
              storage: 25,
              networkPerformance: '40 Gbps',
              costPerHour: 0.0075,
              costPerMonth: 5.50,
              suitable: ['launch'],
            },
            {
              name: 'Shared CPU 4GB',
              vcpu: 2,
              memory: 4,
              storage: 80,
              networkPerformance: '40 Gbps',
              costPerHour: 0.033,
              costPerMonth: 24.00,
              suitable: ['launch', 'growth'],
            },
            {
              name: 'Dedicated CPU 4GB',
              vcpu: 2,
              memory: 4,
              storage: 80,
              networkPerformance: '40 Gbps',
              costPerHour: 0.06,
              costPerMonth: 43.00,
              suitable: ['growth'],
            },
            {
              name: 'Dedicated CPU 16GB',
              vcpu: 8,
              memory: 16,
              storage: 320,
              networkPerformance: '40 Gbps',
              costPerHour: 0.24,
              costPerMonth: 173.00,
              suitable: ['scale'],
            },
          ],
          autoScaling: true,
          spotInstances: false,
          reservedInstances: false,
          containerOrchestration: true,
        },
        database: {
          available: true,
          engines: ['postgresql', 'mysql'],
          managedService: true,
          readReplicas: true,
          multiAZ: true,
          backupRetention: 30,
          pointInTimeRecovery: true,
        },
        cache: {
          available: false, // Self-managed Redis on compute instances
          engines: ['redis'],
          managedService: false,
          clustering: true,
          sentinel: true,
          persistence: true,
        },
        loadBalancer: {
          available: true,
          types: ['nodebalancer'],
          sslTermination: true,
          healthChecks: true,
          stickySessions: true,
          costPerHour: 0.014,
        },
        storage: {
          objectStorage: {
            available: true,
            costPerGB: 0.02,
            s3Compatible: true,
          },
          blockStorage: {
            available: true,
            costPerGB: 0.10,
            maxIOPS: 40000,
          },
          fileStorage: {
            available: false,
            costPerGB: 0,
            nfsCompatible: false,
          },
        },
        monitoring: {
          available: true,
          managedService: true,
          customMetrics: true,
          alerting: true,
          dashboards: true,
          logAggregation: false,
          costPerMetric: 0.00, // Included with Longview
        },
        networking: {
          vpc: true,
          privateNetworking: true,
          cdn: false,
          dns: true,
          firewall: true,
          ddosProtection: true,
        },
      },
      pricing: {
        currency: 'USD',
        dataTransfer: {
          inbound: 0.00,
          outbound: 0.005,
          interRegion: 0.01,
        },
        support: {
          basic: 0,
          standard: 0, // Included
          premium: 0, // Included
        },
        discounts: {
          reservedInstances: 0,
          spotInstances: 0,
          volumeDiscount: 5,
        },
      },
      features: {
        compliance: ['GDPR', 'SOC2'],
        sla: 99.9,
        support: {
          documentation: 'good',
          community: 'good',
          enterprise: true,
        },
        ecosystem: {
          thirdPartyIntegrations: 100,
          marketplaceApps: 50,
          apiQuality: 'good',
        },
      },
      limits: {
        maxInstances: 200,
        maxStorage: 100000,
        maxDatabases: 50,
        maxLoadBalancers: 20,
        apiRateLimit: 400,
      },
    };
  }
}

