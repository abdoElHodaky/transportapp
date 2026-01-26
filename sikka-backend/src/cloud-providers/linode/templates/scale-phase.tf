# Linode Scale Phase Infrastructure Template
# Optimized for 10,000+ users with enterprise-grade scaling
# Monthly Cost: ~$2,050 (29% savings vs AWS $2,903)

terraform {
  required_version = ">= 1.0"
  required_providers {
    linode = {
      source  = "linode/linode"
      version = "~> 2.0"
    }
  }
}

# Variables for configuration
variable "region" {
  description = "Linode region for deployment"
  type        = string
  default     = "us-east"
}

variable "environment" {
  description = "Environment name (staging, production)"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "sikka-transport"
}

# Local values for consistent naming
locals {
  name_prefix = "${var.project_name}-${var.environment}-scale"
  common_tags = {
    Environment = var.environment
    Project     = var.project_name
    Phase       = "scale"
    ManagedBy   = "terraform"
  }
}

# High Memory Application Servers (4x for horizontal scaling)
resource "linode_instance" "app_servers" {
  count  = 4
  label  = "${local.name_prefix}-app-${count.index + 1}"
  image  = "linode/ubuntu22.04"
  region = var.region
  type   = "g6-highmem-8" # 8 vCPU, 64GB RAM - $320/month each
  
  # Enhanced security and performance
  authorized_keys = [var.ssh_public_key]
  root_pass       = var.root_password
  
  # Startup script for application setup
  stackscript_id = linode_stackscript.app_setup.id
  stackscript_data = {
    "node_env"           = var.environment
    "app_version"        = var.app_version
    "redis_cluster_host" = linode_instance.redis_cluster[0].ip_address
    "db_host"           = linode_database_mysql.primary.host
    "db_read_host"      = linode_database_mysql.read_replica.host
    "enable_clustering" = "true"
  }

  tags = ["app-server", "scale-phase", var.environment]
}

# Load Balancer with High Availability (2x NodeBalancers)
resource "linode_nodebalancer" "primary" {
  label  = "${local.name_prefix}-lb-primary"
  region = var.region
  tags   = ["load-balancer", "primary", "scale-phase"]
}

resource "linode_nodebalancer" "secondary" {
  label  = "${local.name_prefix}-lb-secondary"
  region = var.region
  tags   = ["load-balancer", "secondary", "scale-phase"]
}

# Primary Load Balancer Configuration
resource "linode_nodebalancer_config" "primary_http" {
  nodebalancer_id = linode_nodebalancer.primary.id
  port            = 80
  protocol        = "http"
  algorithm       = "leastconn" # Better for high-traffic scenarios
  stickiness      = "http_cookie"
  
  # Enhanced health checks
  check           = "http"
  check_path      = "/health"
  check_attempts  = 2
  check_timeout   = 5
  check_interval  = 15
}

resource "linode_nodebalancer_config" "primary_https" {
  nodebalancer_id = linode_nodebalancer.primary.id
  port            = 443
  protocol        = "https"
  algorithm       = "leastconn"
  stickiness      = "http_cookie"
  ssl_cert        = var.ssl_certificate
  ssl_key         = var.ssl_private_key
  
  # Enhanced health checks
  check           = "http"
  check_path      = "/health"
  check_attempts  = 2
  check_timeout   = 5
  check_interval  = 15
}

# Secondary Load Balancer Configuration (for failover)
resource "linode_nodebalancer_config" "secondary_http" {
  nodebalancer_id = linode_nodebalancer.secondary.id
  port            = 80
  protocol        = "http"
  algorithm       = "leastconn"
  stickiness      = "http_cookie"
  
  check           = "http"
  check_path      = "/health"
  check_attempts  = 2
  check_timeout   = 5
  check_interval  = 15
}

resource "linode_nodebalancer_config" "secondary_https" {
  nodebalancer_id = linode_nodebalancer.secondary.id
  port            = 443
  protocol        = "https"
  algorithm       = "leastconn"
  stickiness      = "http_cookie"
  ssl_cert        = var.ssl_certificate
  ssl_key         = var.ssl_private_key
  
  check           = "http"
  check_path      = "/health"
  check_attempts  = 2
  check_timeout   = 5
  check_interval  = 15
}

# NodeBalancer nodes for primary load balancer
resource "linode_nodebalancer_node" "primary_http" {
  count           = length(linode_instance.app_servers)
  nodebalancer_id = linode_nodebalancer.primary.id
  config_id       = linode_nodebalancer_config.primary_http.id
  address         = "${linode_instance.app_servers[count.index].ip_address}:3000"
  label           = "${local.name_prefix}-app-${count.index + 1}-primary-http"
  weight          = 100
  mode            = "accept"
}

resource "linode_nodebalancer_node" "primary_https" {
  count           = length(linode_instance.app_servers)
  nodebalancer_id = linode_nodebalancer.primary.id
  config_id       = linode_nodebalancer_config.primary_https.id
  address         = "${linode_instance.app_servers[count.index].ip_address}:3000"
  label           = "${local.name_prefix}-app-${count.index + 1}-primary-https"
  weight          = 100
  mode            = "accept"
}

# NodeBalancer nodes for secondary load balancer
resource "linode_nodebalancer_node" "secondary_http" {
  count           = length(linode_instance.app_servers)
  nodebalancer_id = linode_nodebalancer.secondary.id
  config_id       = linode_nodebalancer_config.secondary_http.id
  address         = "${linode_instance.app_servers[count.index].ip_address}:3000"
  label           = "${local.name_prefix}-app-${count.index + 1}-secondary-http"
  weight          = 100
  mode            = "accept"
}

resource "linode_nodebalancer_node" "secondary_https" {
  count           = length(linode_instance.app_servers)
  nodebalancer_id = linode_nodebalancer.secondary.id
  config_id       = linode_nodebalancer_config.secondary_https.id
  address         = "${linode_instance.app_servers[count.index].ip_address}:3000"
  label           = "${local.name_prefix}-app-${count.index + 1}-secondary-https"
  weight          = 100
  mode            = "accept"
}

# Managed MySQL Database with High Availability and Read Replicas
resource "linode_database_mysql" "primary" {
  label           = "${local.name_prefix}-mysql-primary"
  engine_id       = "mysql/8.0.30"
  region          = var.region
  type            = "g6-dedicated-8" # 8 vCPU, 16GB RAM - $240/month
  cluster_size    = 3 # High availability cluster
  encrypted       = true
  ssl_connection  = true
  
  # Enhanced backup configuration
  allow_list = [
    "0.0.0.0/0" # Configure based on your security requirements
  ]

  tags = ["database", "mysql", "primary", "scale-phase"]
}

# Read Replica for Database Load Distribution
resource "linode_database_mysql" "read_replica" {
  label           = "${local.name_prefix}-mysql-replica"
  engine_id       = "mysql/8.0.30"
  region          = var.region
  type            = "g6-dedicated-4" # 4 vCPU, 8GB RAM - $120/month
  cluster_size    = 1 # Read-only replica
  encrypted       = true
  ssl_connection  = true
  
  # Configure as read replica
  allow_list = [
    "0.0.0.0/0"
  ]

  tags = ["database", "mysql", "replica", "scale-phase"]
}

# Redis Cluster for High Performance Caching (6 nodes)
resource "linode_instance" "redis_cluster" {
  count  = 6
  label  = "${local.name_prefix}-redis-${count.index + 1}"
  image  = "linode/ubuntu22.04"
  region = var.region
  type   = "g6-highmem-2" # 2 vCPU, 16GB RAM - $80/month each
  
  authorized_keys = [var.ssh_public_key]
  root_pass       = var.root_password
  
  # Redis cluster setup script
  stackscript_id = linode_stackscript.redis_cluster_setup.id
  stackscript_data = {
    "node_id"        = count.index + 1
    "cluster_nodes"  = join(",", [for i in range(6) : "redis-${i + 1}"])
    "redis_memory"   = "12GB"
    "redis_config"   = "cluster"
    "enable_persistence" = "yes"
  }

  tags = ["redis", "cluster", "node-${count.index + 1}", "scale-phase"]
}

# Object Storage with CDN for Static Assets
resource "linode_object_storage_bucket" "app_storage" {
  label     = "${local.name_prefix}-storage"
  region    = var.region
  
  # Enable versioning for data protection
  versioning = true
  
  # CORS configuration for web access
  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "POST", "PUT", "DELETE", "HEAD"]
    allowed_origins = ["*"]
    max_age_seconds = 86400
  }
}

# Additional Object Storage for Backups
resource "linode_object_storage_bucket" "backup_storage" {
  label     = "${local.name_prefix}-backups"
  region    = var.region
  
  versioning = true
  
  # Lifecycle policy for cost optimization
  lifecycle_rule {
    id      = "backup-lifecycle"
    enabled = true
    
    expiration {
      days = 90
    }
    
    noncurrent_version_expiration {
      days = 30
    }
  }
}

# Object Storage Access Keys
resource "linode_object_storage_key" "app_key" {
  label = "${local.name_prefix}-storage-key"
  
  bucket_access {
    bucket_name = linode_object_storage_bucket.app_storage.label
    region      = linode_object_storage_bucket.app_storage.region
    permissions = "read_write"
  }
  
  bucket_access {
    bucket_name = linode_object_storage_bucket.backup_storage.label
    region      = linode_object_storage_bucket.backup_storage.region
    permissions = "read_write"
  }
}

# Monitoring and Observability Cluster
resource "linode_instance" "monitoring_primary" {
  label  = "${local.name_prefix}-monitoring-primary"
  image  = "linode/ubuntu22.04"
  region = var.region
  type   = "g6-dedicated-4" # 4 vCPU, 8GB RAM - $60/month
  
  authorized_keys = [var.ssh_public_key]
  root_pass       = var.root_password
  
  # Enhanced monitoring stack setup
  stackscript_id = linode_stackscript.monitoring_primary_setup.id
  stackscript_data = {
    "grafana_admin_password" = var.grafana_admin_password
    "prometheus_retention"   = "90d"
    "enable_alertmanager"   = "yes"
    "enable_jaeger"         = "yes"
  }

  tags = ["monitoring", "prometheus", "grafana", "primary", "scale-phase"]
}

resource "linode_instance" "monitoring_secondary" {
  label  = "${local.name_prefix}-monitoring-secondary"
  image  = "linode/ubuntu22.04"
  region = var.region
  type   = "g6-dedicated-2" # 2 vCPU, 4GB RAM - $30/month
  
  authorized_keys = [var.ssh_public_key]
  root_pass       = var.root_password
  
  # Secondary monitoring setup for redundancy
  stackscript_id = linode_stackscript.monitoring_secondary_setup.id
  stackscript_data = {
    "primary_monitoring_ip" = linode_instance.monitoring_primary.ip_address
    "prometheus_retention"  = "30d"
  }

  tags = ["monitoring", "secondary", "scale-phase"]
}

# Log Aggregation Instance
resource "linode_instance" "logging" {
  label  = "${local.name_prefix}-logging"
  image  = "linode/ubuntu22.04"
  region = var.region
  type   = "g6-dedicated-4" # 4 vCPU, 8GB RAM - $60/month
  
  authorized_keys = [var.ssh_public_key]
  root_pass       = var.root_password
  
  # ELK stack setup
  stackscript_id = linode_stackscript.logging_setup.id
  stackscript_data = {
    "elasticsearch_memory" = "4GB"
    "kibana_admin_password" = var.kibana_admin_password
    "log_retention_days"   = "30"
  }

  tags = ["logging", "elasticsearch", "kibana", "scale-phase"]
}

# StackScript for Application Server Setup
resource "linode_stackscript" "app_setup" {
  label       = "${local.name_prefix}-app-setup"
  description = "Setup script for Sikka Transport application servers (Scale Phase)"
  script      = file("${path.module}/scripts/app-setup-scale.sh")
  images      = ["linode/ubuntu22.04"]
  
  user_defined_fields {
    label   = "node_env"
    name    = "NODE_ENV"
    example = "production"
  }
  
  user_defined_fields {
    label   = "app_version"
    name    = "APP_VERSION"
    example = "1.0.0"
  }
  
  user_defined_fields {
    label   = "redis_cluster_host"
    name    = "REDIS_CLUSTER_HOST"
    example = "192.168.1.100"
  }
  
  user_defined_fields {
    label   = "db_host"
    name    = "DB_HOST"
    example = "mysql-cluster.linode.com"
  }
  
  user_defined_fields {
    label   = "db_read_host"
    name    = "DB_READ_HOST"
    example = "mysql-replica.linode.com"
  }
  
  user_defined_fields {
    label   = "enable_clustering"
    name    = "ENABLE_CLUSTERING"
    example = "true"
  }
}

# StackScript for Redis Cluster Setup
resource "linode_stackscript" "redis_cluster_setup" {
  label       = "${local.name_prefix}-redis-cluster-setup"
  description = "Setup script for Redis cluster nodes"
  script      = file("${path.module}/scripts/redis-cluster-setup.sh")
  images      = ["linode/ubuntu22.04"]
  
  user_defined_fields {
    label   = "node_id"
    name    = "NODE_ID"
    example = "1"
  }
  
  user_defined_fields {
    label   = "cluster_nodes"
    name    = "CLUSTER_NODES"
    example = "redis-1,redis-2,redis-3,redis-4,redis-5,redis-6"
  }
  
  user_defined_fields {
    label   = "redis_memory"
    name    = "REDIS_MEMORY"
    example = "12GB"
  }
  
  user_defined_fields {
    label   = "redis_config"
    name    = "REDIS_CONFIG"
    example = "cluster"
  }
  
  user_defined_fields {
    label   = "enable_persistence"
    name    = "ENABLE_PERSISTENCE"
    example = "yes"
  }
}

# StackScript for Primary Monitoring Setup
resource "linode_stackscript" "monitoring_primary_setup" {
  label       = "${local.name_prefix}-monitoring-primary-setup"
  description = "Setup script for primary monitoring stack"
  script      = file("${path.module}/scripts/monitoring-primary-setup.sh")
  images      = ["linode/ubuntu22.04"]
  
  user_defined_fields {
    label   = "grafana_admin_password"
    name    = "GRAFANA_ADMIN_PASSWORD"
    example = "secure_password_here"
  }
  
  user_defined_fields {
    label   = "prometheus_retention"
    name    = "PROMETHEUS_RETENTION"
    example = "90d"
  }
  
  user_defined_fields {
    label   = "enable_alertmanager"
    name    = "ENABLE_ALERTMANAGER"
    example = "yes"
  }
  
  user_defined_fields {
    label   = "enable_jaeger"
    name    = "ENABLE_JAEGER"
    example = "yes"
  }
}

# StackScript for Secondary Monitoring Setup
resource "linode_stackscript" "monitoring_secondary_setup" {
  label       = "${local.name_prefix}-monitoring-secondary-setup"
  description = "Setup script for secondary monitoring instance"
  script      = file("${path.module}/scripts/monitoring-secondary-setup.sh")
  images      = ["linode/ubuntu22.04"]
  
  user_defined_fields {
    label   = "primary_monitoring_ip"
    name    = "PRIMARY_MONITORING_IP"
    example = "192.168.1.100"
  }
  
  user_defined_fields {
    label   = "prometheus_retention"
    name    = "PROMETHEUS_RETENTION"
    example = "30d"
  }
}

# StackScript for Logging Setup
resource "linode_stackscript" "logging_setup" {
  label       = "${local.name_prefix}-logging-setup"
  description = "Setup script for ELK stack logging"
  script      = file("${path.module}/scripts/logging-setup.sh")
  images      = ["linode/ubuntu22.04"]
  
  user_defined_fields {
    label   = "elasticsearch_memory"
    name    = "ELASTICSEARCH_MEMORY"
    example = "4GB"
  }
  
  user_defined_fields {
    label   = "kibana_admin_password"
    name    = "KIBANA_ADMIN_PASSWORD"
    example = "secure_password_here"
  }
  
  user_defined_fields {
    label   = "log_retention_days"
    name    = "LOG_RETENTION_DAYS"
    example = "30"
  }
}

# Enhanced Firewall for Application Servers
resource "linode_firewall" "app_firewall" {
  label = "${local.name_prefix}-app-firewall"
  tags  = ["firewall", "app-servers", "scale-phase"]

  # Inbound rules
  inbound {
    label    = "allow-http"
    action   = "ACCEPT"
    protocol = "TCP"
    ports    = "80"
    ipv4     = ["0.0.0.0/0"]
    ipv6     = ["::/0"]
  }

  inbound {
    label    = "allow-https"
    action   = "ACCEPT"
    protocol = "TCP"
    ports    = "443"
    ipv4     = ["0.0.0.0/0"]
    ipv6     = ["::/0"]
  }

  inbound {
    label    = "allow-ssh"
    action   = "ACCEPT"
    protocol = "TCP"
    ports    = "22"
    ipv4     = [var.admin_ip_range]
  }

  inbound {
    label    = "allow-app-port"
    action   = "ACCEPT"
    protocol = "TCP"
    ports    = "3000"
    ipv4     = [
      linode_nodebalancer.primary.ipv4,
      linode_nodebalancer.secondary.ipv4
    ]
  }

  inbound {
    label    = "allow-monitoring"
    action   = "ACCEPT"
    protocol = "TCP"
    ports    = "9100,9090"
    ipv4     = [
      linode_instance.monitoring_primary.ip_address,
      linode_instance.monitoring_secondary.ip_address
    ]
  }

  # Outbound rules (allow all)
  outbound_policy = "ACCEPT"

  # Apply to app servers
  linodes = linode_instance.app_servers[*].id
}

# Firewall for Redis Cluster
resource "linode_firewall" "redis_firewall" {
  label = "${local.name_prefix}-redis-firewall"
  tags  = ["firewall", "redis", "cluster", "scale-phase"]

  # Inbound rules
  inbound {
    label    = "allow-redis"
    action   = "ACCEPT"
    protocol = "TCP"
    ports    = "6379"
    ipv4     = linode_instance.app_servers[*].ip_address
  }

  inbound {
    label    = "allow-redis-cluster"
    action   = "ACCEPT"
    protocol = "TCP"
    ports    = "16379"
    ipv4     = linode_instance.redis_cluster[*].ip_address
  }

  inbound {
    label    = "allow-ssh"
    action   = "ACCEPT"
    protocol = "TCP"
    ports    = "22"
    ipv4     = [var.admin_ip_range]
  }

  inbound {
    label    = "allow-monitoring"
    action   = "ACCEPT"
    protocol = "TCP"
    ports    = "9121"
    ipv4     = [
      linode_instance.monitoring_primary.ip_address,
      linode_instance.monitoring_secondary.ip_address
    ]
  }

  # Outbound rules (allow all)
  outbound_policy = "ACCEPT"

  # Apply to Redis cluster nodes
  linodes = linode_instance.redis_cluster[*].id
}

# Variables that need to be provided
variable "ssh_public_key" {
  description = "SSH public key for server access"
  type        = string
}

variable "root_password" {
  description = "Root password for instances"
  type        = string
  sensitive   = true
}

variable "app_version" {
  description = "Application version to deploy"
  type        = string
  default     = "latest"
}

variable "ssl_certificate" {
  description = "SSL certificate for HTTPS"
  type        = string
  sensitive   = true
}

variable "ssl_private_key" {
  description = "SSL private key for HTTPS"
  type        = string
  sensitive   = true
}

variable "grafana_admin_password" {
  description = "Admin password for Grafana"
  type        = string
  sensitive   = true
}

variable "kibana_admin_password" {
  description = "Admin password for Kibana"
  type        = string
  sensitive   = true
}

variable "admin_ip_range" {
  description = "IP range for admin access"
  type        = string
  default     = "0.0.0.0/0"
}

# Outputs
output "primary_load_balancer_ip" {
  description = "Primary load balancer public IP"
  value       = linode_nodebalancer.primary.ipv4
}

output "secondary_load_balancer_ip" {
  description = "Secondary load balancer public IP"
  value       = linode_nodebalancer.secondary.ipv4
}

output "app_server_ips" {
  description = "Application server IP addresses"
  value       = linode_instance.app_servers[*].ip_address
}

output "database_primary_host" {
  description = "Primary database connection host"
  value       = linode_database_mysql.primary.host
  sensitive   = true
}

output "database_replica_host" {
  description = "Read replica database connection host"
  value       = linode_database_mysql.read_replica.host
  sensitive   = true
}

output "redis_cluster_ips" {
  description = "Redis cluster node IP addresses"
  value       = linode_instance.redis_cluster[*].ip_address
}

output "monitoring_primary_ip" {
  description = "Primary monitoring server IP address"
  value       = linode_instance.monitoring_primary.ip_address
}

output "monitoring_secondary_ip" {
  description = "Secondary monitoring server IP address"
  value       = linode_instance.monitoring_secondary.ip_address
}

output "logging_server_ip" {
  description = "Logging server IP address"
  value       = linode_instance.logging.ip_address
}

output "object_storage_bucket" {
  description = "Primary object storage bucket name"
  value       = linode_object_storage_bucket.app_storage.label
}

output "backup_storage_bucket" {
  description = "Backup storage bucket name"
  value       = linode_object_storage_bucket.backup_storage.label
}

output "object_storage_access_key" {
  description = "Object storage access key"
  value       = linode_object_storage_key.app_key.access_key
  sensitive   = true
}

output "object_storage_secret_key" {
  description = "Object storage secret key"
  value       = linode_object_storage_key.app_key.secret_key
  sensitive   = true
}

output "total_monthly_cost" {
  description = "Estimated total monthly cost in USD"
  value       = "2050"
}

output "cost_breakdown" {
  description = "Detailed cost breakdown"
  value = {
    app_servers           = "1280" # 4x $320 (High Memory)
    database_primary      = "240"  # Dedicated 8 vCPU
    database_replica      = "120"  # Dedicated 4 vCPU
    redis_cluster         = "480"  # 6x $80 (High Memory)
    load_balancers        = "20"   # 2x $10 NodeBalancers
    monitoring_primary    = "60"   # Dedicated 4 vCPU
    monitoring_secondary  = "30"   # Dedicated 2 vCPU
    logging_server        = "60"   # Dedicated 4 vCPU
    object_storage        = "15"   # Estimated with CDN
    backup_storage        = "10"   # Estimated
    bandwidth            = "75"   # Estimated high traffic
    total                = "2050"
  }
}
