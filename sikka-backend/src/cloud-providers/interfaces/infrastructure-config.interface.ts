/**
 * Infrastructure Configuration Interfaces
 *
 * Defines the structure for infrastructure configurations that can be
 * translated into provider-specific templates and deployments.
 */

/**
 * Complete Infrastructure Configuration
 */
export interface InfrastructureConfig {
  metadata: InfrastructureMetadata;
  compute: ComputeConfig;
  database: DatabaseConfig;
  cache: CacheConfig;
  loadBalancer: LoadBalancerConfig;
  storage: StorageConfig;
  networking: NetworkingConfig;
  monitoring: MonitoringConfig;
  security: SecurityConfig;
}

/**
 * Infrastructure Metadata
 */
export interface InfrastructureMetadata {
  name: string;
  environment: 'development' | 'staging' | 'production';
  region: string;
  scalingPhase: 'launch' | 'growth' | 'scale';
  version: string;
  tags: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Compute Configuration
 */
export interface ComputeConfig {
  instances: ComputeInstance[];
  autoScaling: AutoScalingConfig;
  containerOrchestration?: ContainerConfig;
}

/**
 * Compute Instance Configuration
 */
export interface ComputeInstance {
  name: string;
  instanceType: string;
  count: number;
  minCount: number;
  maxCount: number;
  cpu: number;
  memory: number; // GB
  storage: StorageSpec;
  networkPerformance: string;
  operatingSystem: string;
  userData?: string;
  tags: Record<string, string>;
}

/**
 * Auto Scaling Configuration
 */
export interface AutoScalingConfig {
  enabled: boolean;
  minInstances: number;
  maxInstances: number;
  targetCpuUtilization: number;
  targetMemoryUtilization: number;
  scaleUpCooldown: number; // seconds
  scaleDownCooldown: number; // seconds
  metrics: ScalingMetric[];
}

/**
 * Scaling Metric
 */
export interface ScalingMetric {
  name: string;
  type: 'cpu' | 'memory' | 'network' | 'custom';
  threshold: number;
  comparisonOperator: 'GreaterThanThreshold' | 'LessThanThreshold';
  evaluationPeriods: number;
  period: number; // seconds
}

/**
 * Container Configuration
 */
export interface ContainerConfig {
  orchestrator: 'kubernetes' | 'docker-swarm' | 'ecs';
  clusterName: string;
  nodeGroups: NodeGroup[];
  services: ContainerService[];
}

/**
 * Container Node Group
 */
export interface NodeGroup {
  name: string;
  instanceType: string;
  minSize: number;
  maxSize: number;
  desiredSize: number;
  diskSize: number; // GB
  labels: Record<string, string>;
}

/**
 * Container Service
 */
export interface ContainerService {
  name: string;
  image: string;
  replicas: number;
  cpu: string; // e.g., "500m"
  memory: string; // e.g., "1Gi"
  ports: ServicePort[];
  environment: Record<string, string>;
}

/**
 * Service Port
 */
export interface ServicePort {
  name: string;
  port: number;
  targetPort: number;
  protocol: 'TCP' | 'UDP';
}

/**
 * Database Configuration
 */
export interface DatabaseConfig {
  primary: DatabaseInstance;
  readReplicas: DatabaseInstance[];
  backup: BackupConfig;
  maintenance: MaintenanceConfig;
}

/**
 * Database Instance Configuration
 */
export interface DatabaseInstance {
  name: string;
  engine: 'postgresql' | 'mysql' | 'mongodb';
  version: string;
  instanceClass: string;
  allocatedStorage: number; // GB
  storageType: 'gp2' | 'gp3' | 'io1' | 'io2';
  iops?: number;
  multiAZ: boolean;
  publiclyAccessible: boolean;
  vpcSecurityGroups: string[];
  subnetGroup: string;
  parameterGroup?: string;
  optionGroup?: string;
  backupRetentionPeriod: number; // days
  preferredBackupWindow: string;
  preferredMaintenanceWindow: string;
  deletionProtection: boolean;
  encryption: EncryptionConfig;
}

/**
 * Backup Configuration
 */
export interface BackupConfig {
  enabled: boolean;
  retentionPeriod: number; // days
  backupWindow: string;
  pointInTimeRecovery: boolean;
  crossRegionBackup: boolean;
  backupDestination?: string;
}

/**
 * Maintenance Configuration
 */
export interface MaintenanceConfig {
  maintenanceWindow: string;
  autoMinorVersionUpgrade: boolean;
  allowMajorVersionUpgrade: boolean;
  applyImmediately: boolean;
}

/**
 * Cache Configuration
 */
export interface CacheConfig {
  engine: 'redis' | 'memcached';
  version: string;
  nodeType: string;
  numCacheNodes: number;
  port: number;
  parameterGroup?: string;
  subnetGroup: string;
  securityGroups: string[];
  replicationGroup?: ReplicationGroupConfig;
  cluster?: ClusterConfig;
}

/**
 * Replication Group Configuration (Redis Sentinel)
 */
export interface ReplicationGroupConfig {
  replicationGroupId: string;
  description: string;
  numCacheClusters: number;
  automaticFailoverEnabled: boolean;
  multiAZEnabled: boolean;
  snapshotRetentionLimit: number;
  snapshotWindow: string;
}

/**
 * Cluster Configuration (Redis Cluster)
 */
export interface ClusterConfig {
  numNodeGroups: number;
  replicasPerNodeGroup: number;
  shardingEnabled: boolean;
}

/**
 * Load Balancer Configuration
 */
export interface LoadBalancerConfig {
  type: 'application' | 'network' | 'classic';
  scheme: 'internet-facing' | 'internal';
  ipAddressType: 'ipv4' | 'dualstack';
  subnets: string[];
  securityGroups: string[];
  listeners: LoadBalancerListener[];
  targetGroups: TargetGroup[];
  healthCheck: HealthCheckConfig;
  sslPolicy?: string;
  certificates?: string[];
}

/**
 * Load Balancer Listener
 */
export interface LoadBalancerListener {
  port: number;
  protocol: 'HTTP' | 'HTTPS' | 'TCP' | 'TLS' | 'UDP';
  defaultActions: ListenerAction[];
  rules?: ListenerRule[];
}

/**
 * Listener Action
 */
export interface ListenerAction {
  type: 'forward' | 'redirect' | 'fixed-response';
  targetGroupArn?: string;
  redirectConfig?: RedirectConfig;
  fixedResponseConfig?: FixedResponseConfig;
}

/**
 * Redirect Configuration
 */
export interface RedirectConfig {
  protocol: string;
  port: string;
  host: string;
  path: string;
  query: string;
  statusCode: string;
}

/**
 * Fixed Response Configuration
 */
export interface FixedResponseConfig {
  statusCode: string;
  contentType: string;
  messageBody: string;
}

/**
 * Listener Rule
 */
export interface ListenerRule {
  priority: number;
  conditions: RuleCondition[];
  actions: ListenerAction[];
}

/**
 * Rule Condition
 */
export interface RuleCondition {
  field: 'host-header' | 'path-pattern' | 'http-request-method';
  values: string[];
}

/**
 * Target Group Configuration
 */
export interface TargetGroup {
  name: string;
  protocol: 'HTTP' | 'HTTPS' | 'TCP' | 'TLS' | 'UDP';
  port: number;
  vpcId: string;
  targetType: 'instance' | 'ip' | 'lambda';
  healthCheck: HealthCheckConfig;
  stickiness?: StickinessConfig;
  targets: Target[];
}

/**
 * Health Check Configuration
 */
export interface HealthCheckConfig {
  enabled: boolean;
  protocol: 'HTTP' | 'HTTPS' | 'TCP';
  port: number;
  path?: string;
  intervalSeconds: number;
  timeoutSeconds: number;
  healthyThresholdCount: number;
  unhealthyThresholdCount: number;
  matcher?: string; // HTTP status codes
}

/**
 * Stickiness Configuration
 */
export interface StickinessConfig {
  enabled: boolean;
  type: 'lb_cookie' | 'app_cookie';
  durationSeconds: number;
  cookieName?: string;
}

/**
 * Target Configuration
 */
export interface Target {
  id: string;
  port: number;
  availabilityZone?: string;
}

/**
 * Storage Configuration
 */
export interface StorageConfig {
  blockStorage: BlockStorageConfig[];
  objectStorage: ObjectStorageConfig[];
  fileStorage?: FileStorageConfig[];
}

/**
 * Block Storage Configuration
 */
export interface BlockStorageConfig {
  name: string;
  size: number; // GB
  type: 'gp2' | 'gp3' | 'io1' | 'io2' | 'st1' | 'sc1';
  iops?: number;
  throughput?: number; // MB/s
  encrypted: boolean;
  kmsKeyId?: string;
  snapshotId?: string;
  availabilityZone: string;
  tags: Record<string, string>;
}

/**
 * Object Storage Configuration
 */
export interface ObjectStorageConfig {
  bucketName: string;
  region: string;
  versioning: boolean;
  encryption: EncryptionConfig;
  lifecycle: LifecycleRule[];
  cors?: CorsRule[];
  publicAccess: boolean;
  tags: Record<string, string>;
}

/**
 * Lifecycle Rule
 */
export interface LifecycleRule {
  id: string;
  status: 'Enabled' | 'Disabled';
  filter: LifecycleFilter;
  transitions: LifecycleTransition[];
  expiration?: LifecycleExpiration;
}

/**
 * Lifecycle Filter
 */
export interface LifecycleFilter {
  prefix?: string;
  tags?: Record<string, string>;
}

/**
 * Lifecycle Transition
 */
export interface LifecycleTransition {
  days: number;
  storageClass: string;
}

/**
 * Lifecycle Expiration
 */
export interface LifecycleExpiration {
  days: number;
}

/**
 * CORS Rule
 */
export interface CorsRule {
  allowedHeaders: string[];
  allowedMethods: string[];
  allowedOrigins: string[];
  exposeHeaders: string[];
  maxAgeSeconds: number;
}

/**
 * File Storage Configuration
 */
export interface FileStorageConfig {
  name: string;
  performanceMode: 'generalPurpose' | 'maxIO';
  throughputMode: 'bursting' | 'provisioned';
  provisionedThroughputInMibps?: number;
  encrypted: boolean;
  kmsKeyId?: string;
  lifecyclePolicy?: FileLifecyclePolicy;
  accessPoints: AccessPoint[];
}

/**
 * File Lifecycle Policy
 */
export interface FileLifecyclePolicy {
  transitionToIA:
    | 'AFTER_7_DAYS'
    | 'AFTER_14_DAYS'
    | 'AFTER_30_DAYS'
    | 'AFTER_60_DAYS'
    | 'AFTER_90_DAYS';
  transitionToPrimaryStorageClass: 'AFTER_1_ACCESS';
}

/**
 * Access Point
 */
export interface AccessPoint {
  name: string;
  path: string;
  creationInfo: CreationInfo;
  posixUser: PosixUser;
}

/**
 * Creation Info
 */
export interface CreationInfo {
  ownerUid: number;
  ownerGid: number;
  permissions: string;
}

/**
 * POSIX User
 */
export interface PosixUser {
  uid: number;
  gid: number;
  secondaryGids?: number[];
}

/**
 * Networking Configuration
 */
export interface NetworkingConfig {
  vpc: VpcConfig;
  subnets: SubnetConfig[];
  internetGateway?: InternetGatewayConfig;
  natGateways?: NatGatewayConfig[];
  routeTables: RouteTableConfig[];
  securityGroups: SecurityGroupConfig[];
  networkAcls?: NetworkAclConfig[];
}

/**
 * VPC Configuration
 */
export interface VpcConfig {
  name: string;
  cidrBlock: string;
  enableDnsHostnames: boolean;
  enableDnsSupport: boolean;
  instanceTenancy: 'default' | 'dedicated';
  tags: Record<string, string>;
}

/**
 * Subnet Configuration
 */
export interface SubnetConfig {
  name: string;
  cidrBlock: string;
  availabilityZone: string;
  mapPublicIpOnLaunch: boolean;
  type: 'public' | 'private';
  tags: Record<string, string>;
}

/**
 * Internet Gateway Configuration
 */
export interface InternetGatewayConfig {
  name: string;
  tags: Record<string, string>;
}

/**
 * NAT Gateway Configuration
 */
export interface NatGatewayConfig {
  name: string;
  subnetId: string;
  allocationId: string;
  tags: Record<string, string>;
}

/**
 * Route Table Configuration
 */
export interface RouteTableConfig {
  name: string;
  routes: RouteConfig[];
  subnetAssociations: string[];
  tags: Record<string, string>;
}

/**
 * Route Configuration
 */
export interface RouteConfig {
  destinationCidrBlock: string;
  gatewayId?: string;
  natGatewayId?: string;
  instanceId?: string;
  networkInterfaceId?: string;
}

/**
 * Security Group Configuration
 */
export interface SecurityGroupConfig {
  name: string;
  description: string;
  vpcId: string;
  ingressRules: SecurityGroupRule[];
  egressRules: SecurityGroupRule[];
  tags: Record<string, string>;
}

/**
 * Security Group Rule
 */
export interface SecurityGroupRule {
  protocol: 'tcp' | 'udp' | 'icmp' | 'all';
  fromPort: number;
  toPort: number;
  cidrBlocks?: string[];
  sourceSecurityGroupId?: string;
  description?: string;
}

/**
 * Network ACL Configuration
 */
export interface NetworkAclConfig {
  name: string;
  vpcId: string;
  ingressRules: NetworkAclRule[];
  egressRules: NetworkAclRule[];
  subnetAssociations: string[];
  tags: Record<string, string>;
}

/**
 * Network ACL Rule
 */
export interface NetworkAclRule {
  ruleNumber: number;
  protocol: 'tcp' | 'udp' | 'icmp' | 'all';
  ruleAction: 'allow' | 'deny';
  cidrBlock: string;
  fromPort?: number;
  toPort?: number;
  icmpCode?: number;
  icmpType?: number;
}

/**
 * Monitoring Configuration
 */
export interface MonitoringConfig {
  metrics: MetricConfig[];
  alarms: AlarmConfig[];
  dashboards: DashboardConfig[];
  logGroups: LogGroupConfig[];
  notifications: NotificationConfig[];
}

/**
 * Metric Configuration
 */
export interface MetricConfig {
  name: string;
  namespace: string;
  dimensions: Record<string, string>;
  statistic: 'Average' | 'Sum' | 'Maximum' | 'Minimum' | 'SampleCount';
  period: number; // seconds
  evaluationPeriods: number;
  threshold: number;
  comparisonOperator:
    | 'GreaterThanThreshold'
    | 'LessThanThreshold'
    | 'GreaterThanOrEqualToThreshold'
    | 'LessThanOrEqualToThreshold';
}

/**
 * Alarm Configuration
 */
export interface AlarmConfig {
  name: string;
  description: string;
  metricName: string;
  namespace: string;
  statistic: string;
  period: number;
  evaluationPeriods: number;
  threshold: number;
  comparisonOperator: string;
  dimensions: Record<string, string>;
  alarmActions: string[];
  okActions: string[];
  treatMissingData: 'breaching' | 'notBreaching' | 'ignore' | 'missing';
}

/**
 * Dashboard Configuration
 */
export interface DashboardConfig {
  name: string;
  widgets: DashboardWidget[];
}

/**
 * Dashboard Widget
 */
export interface DashboardWidget {
  type: 'metric' | 'log' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  properties: Record<string, any>;
}

/**
 * Log Group Configuration
 */
export interface LogGroupConfig {
  name: string;
  retentionInDays: number;
  kmsKeyId?: string;
  tags: Record<string, string>;
}

/**
 * Notification Configuration
 */
export interface NotificationConfig {
  topicName: string;
  protocol: 'email' | 'sms' | 'http' | 'https' | 'sqs' | 'lambda';
  endpoint: string;
  subscriptionAttributes?: Record<string, string>;
}

/**
 * Security Configuration
 */
export interface SecurityConfig {
  encryption: EncryptionConfig;
  accessControl: AccessControlConfig;
  compliance: ComplianceConfig;
  backup: SecurityBackupConfig;
}

/**
 * Encryption Configuration
 */
export interface EncryptionConfig {
  enabled: boolean;
  kmsKeyId?: string;
  algorithm?: string;
  keyRotation?: boolean;
}

/**
 * Access Control Configuration
 */
export interface AccessControlConfig {
  iamRoles: IamRoleConfig[];
  iamPolicies: IamPolicyConfig[];
  iamUsers?: IamUserConfig[];
  mfa: boolean;
  passwordPolicy?: PasswordPolicyConfig;
}

/**
 * IAM Role Configuration
 */
export interface IamRoleConfig {
  name: string;
  assumeRolePolicyDocument: string;
  description?: string;
  maxSessionDuration?: number;
  path?: string;
  permissionsBoundary?: string;
  tags: Record<string, string>;
}

/**
 * IAM Policy Configuration
 */
export interface IamPolicyConfig {
  name: string;
  description?: string;
  path?: string;
  policyDocument: string;
}

/**
 * IAM User Configuration
 */
export interface IamUserConfig {
  name: string;
  path?: string;
  permissionsBoundary?: string;
  tags: Record<string, string>;
}

/**
 * Password Policy Configuration
 */
export interface PasswordPolicyConfig {
  minimumPasswordLength: number;
  requireSymbols: boolean;
  requireNumbers: boolean;
  requireUppercaseCharacters: boolean;
  requireLowercaseCharacters: boolean;
  allowUsersToChangePassword: boolean;
  maxPasswordAge?: number;
  passwordReusePrevention?: number;
  hardExpiry?: boolean;
}

/**
 * Compliance Configuration
 */
export interface ComplianceConfig {
  standards: string[]; // GDPR, HIPAA, SOC2, etc.
  dataClassification: DataClassificationConfig;
  auditLogging: AuditLoggingConfig;
  dataRetention: DataRetentionConfig;
}

/**
 * Data Classification Configuration
 */
export interface DataClassificationConfig {
  levels: string[]; // public, internal, confidential, restricted
  defaultLevel: string;
  labelingRequired: boolean;
}

/**
 * Audit Logging Configuration
 */
export interface AuditLoggingConfig {
  enabled: boolean;
  logAllApiCalls: boolean;
  logDataAccess: boolean;
  logConfigChanges: boolean;
  retentionPeriod: number; // days
}

/**
 * Data Retention Configuration
 */
export interface DataRetentionConfig {
  defaultRetentionPeriod: number; // days
  categorySpecificRetention: Record<string, number>;
  automaticDeletion: boolean;
}

/**
 * Security Backup Configuration
 */
export interface SecurityBackupConfig {
  encryptionInTransit: boolean;
  encryptionAtRest: boolean;
  crossRegionReplication: boolean;
  accessLogging: boolean;
  versioningEnabled: boolean;
}

/**
 * Storage Specification
 */
export interface StorageSpec {
  size: number; // GB
  type: 'ssd' | 'hdd' | 'nvme';
  iops?: number;
  throughput?: number; // MB/s
}

/**
 * Cloud Region Configuration
 */
export interface CloudRegion {
  name: string;
  displayName: string;
  country: string;
  continent: string;
  available: boolean;
  services: string[];
}

/**
 * Infrastructure Template
 */
export interface InfrastructureTemplate {
  templateType: 'terraform' | 'cloudformation' | 'pulumi' | 'ansible';
  version: string;
  provider: string;
  region: string;
  template: string;
  variables: Record<string, any>;
  outputs: Record<string, any>;
  dependencies: string[];
  estimatedCost: number;
  estimatedDeploymentTime: number; // minutes
}

/**
 * Cost Estimate
 */
export interface CostEstimate {
  provider: string;
  region: string;
  currency: 'USD' | 'EUR' | 'GBP';
  period: 'hourly' | 'daily' | 'monthly' | 'yearly';
  breakdown: CostBreakdown;
  total: number;
  confidence: number; // 0-1
  lastUpdated: Date;
  assumptions: string[];
}

/**
 * Cost Breakdown
 */
export interface CostBreakdown {
  compute: number;
  storage: number;
  database: number;
  networking: number;
  monitoring: number;
  security: number;
  other: number;
  details: CostDetail[];
}

/**
 * Cost Detail
 */
export interface CostDetail {
  service: string;
  resource: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  description: string;
}

/**
 * Service Recommendation
 */
export interface ServiceRecommendation {
  service: string;
  provider: string;
  region: string;
  instanceType: string;
  configuration: Record<string, any>;
  estimatedCost: number;
  performance: PerformanceMetrics;
  pros: string[];
  cons: string[];
  confidence: number; // 0-1
  alternatives: AlternativeRecommendation[];
}

/**
 * Performance Metrics
 */
export interface PerformanceMetrics {
  cpu: number; // cores
  memory: number; // GB
  storage: number; // GB
  network: number; // Gbps
  iops: number;
  throughput: number; // MB/s
}

/**
 * Alternative Recommendation
 */
export interface AlternativeRecommendation {
  service: string;
  instanceType: string;
  estimatedCost: number;
  performance: PerformanceMetrics;
  reason: string;
}

/**
 * Validation Result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
  score: number; // 0-100
}

/**
 * Validation Error
 */
export interface ValidationError {
  code: string;
  message: string;
  field: string;
  severity: 'error' | 'warning' | 'info';
  suggestion?: string;
}

/**
 * Validation Warning
 */
export interface ValidationWarning {
  code: string;
  message: string;
  field: string;
  impact: 'high' | 'medium' | 'low';
  suggestion?: string;
}

/**
 * Validation Suggestion
 */
export interface ValidationSuggestion {
  code: string;
  message: string;
  field: string;
  benefit: string;
  effort: 'low' | 'medium' | 'high';
}
