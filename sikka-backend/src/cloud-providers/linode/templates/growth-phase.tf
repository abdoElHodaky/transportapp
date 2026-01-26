# Linode Growth Phase Infrastructure Template
# Optimized for 3,000-5,000 users with cost-effective scaling
# Monthly Cost: ~$344 (25% savings vs AWS $461)

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
  name_prefix = "${var.project_name}-${var.environment}-growth"
  common_tags = {
    Environment = var.environment
    Project     = var.project_name
    Phase       = "growth"
    ManagedBy   = "terraform"
  }
}

# Dedicated CPU Instances for Application Servers (2x for HA)
resource "linode_instance" "app_servers" {
  count  = 2
  label  = "${local.name_prefix}-app-${count.index + 1}"
  image  = "linode/ubuntu22.04"
  region = var.region
  type   = "g6-dedicated-4" # 4 vCPU, 8GB RAM - $60/month each
  
  # Enhanced security and performance
  authorized_keys = [var.ssh_public_key]
  root_pass       = var.root_password
  
  # Startup script for application setup
  stackscript_id = linode_stackscript.app_setup.id
  stackscript_data = {
    "node_env"     = var.environment
    "app_version"  = var.app_version
    "redis_host"   = linode_instance.redis_primary.ip_address
    "db_host"      = linode_database_mysql.primary.host
  }

  tags = ["app-server", "growth-phase", var.environment]
}

# Load Balancer (NodeBalancer)
resource "linode_nodebalancer" "main" {
  label  = "${local.name_prefix}-lb"
  region = var.region
  tags   = ["load-balancer", "growth-phase"]
}

resource "linode_nodebalancer_config" "http" {
  nodebalancer_id = linode_nodebalancer.main.id
  port            = 80
  protocol        = "http"
  algorithm       = "roundrobin"
  stickiness      = "http_cookie"
  
  # Health check configuration
  check           = "http"
  check_path      = "/health"
  check_attempts  = 3
  check_timeout   = 10
  check_interval  = 30
}

resource "linode_nodebalancer_config" "https" {
  nodebalancer_id = linode_nodebalancer.main.id
  port            = 443
  protocol        = "https"
  algorithm       = "roundrobin"
  stickiness      = "http_cookie"
  ssl_cert        = var.ssl_certificate
  ssl_key         = var.ssl_private_key
  
  # Health check configuration
  check           = "http"
  check_path      = "/health"
  check_attempts  = 3
  check_timeout   = 10
  check_interval  = 30
}

# NodeBalancer nodes for app servers
resource "linode_nodebalancer_node" "app_http" {
  count           = length(linode_instance.app_servers)
  nodebalancer_id = linode_nodebalancer.main.id
  config_id       = linode_nodebalancer_config.http.id
  address         = "${linode_instance.app_servers[count.index].ip_address}:3000"
  label           = "${local.name_prefix}-app-${count.index + 1}-http"
  weight          = 100
  mode            = "accept"
}

resource "linode_nodebalancer_node" "app_https" {
  count           = length(linode_instance.app_servers)
  nodebalancer_id = linode_nodebalancer.main.id
  config_id       = linode_nodebalancer_config.https.id
  address         = "${linode_instance.app_servers[count.index].ip_address}:3000"
  label           = "${local.name_prefix}-app-${count.index + 1}-https"
  weight          = 100
  mode            = "accept"
}

# Managed MySQL Database with High Availability
resource "linode_database_mysql" "primary" {
  label           = "${local.name_prefix}-mysql"
  engine_id       = "mysql/8.0.30"
  region          = var.region
  type            = "g6-dedicated-2" # 2 vCPU, 4GB RAM - $60/month
  cluster_size    = 3 # High availability cluster
  encrypted       = true
  ssl_connection  = true
  
  # Backup configuration
  allow_list = [
    "0.0.0.0/0" # Configure based on your security requirements
  ]

  tags = ["database", "mysql", "growth-phase"]
}

# Redis Primary Instance (Self-managed for cost optimization)
resource "linode_instance" "redis_primary" {
  label  = "${local.name_prefix}-redis-primary"
  image  = "linode/ubuntu22.04"
  region = var.region
  type   = "g6-dedicated-2" # 2 vCPU, 4GB RAM - $60/month
  
  authorized_keys = [var.ssh_public_key]
  root_pass       = var.root_password
  
  # Redis setup script
  stackscript_id = linode_stackscript.redis_setup.id
  stackscript_data = {
    "redis_memory" = "3GB"
    "redis_config" = "production"
    "enable_persistence" = "yes"
  }

  tags = ["redis", "primary", "growth-phase"]
}

# Redis Replica for High Availability
resource "linode_instance" "redis_replica" {
  label  = "${local.name_prefix}-redis-replica"
  image  = "linode/ubuntu22.04"
  region = var.region
  type   = "g6-dedicated-2" # 2 vCPU, 4GB RAM - $60/month
  
  authorized_keys = [var.ssh_public_key]
  root_pass       = var.root_password
  
  # Redis replica setup script
  stackscript_id = linode_stackscript.redis_replica_setup.id
  stackscript_data = {
    "master_ip"    = linode_instance.redis_primary.ip_address
    "redis_memory" = "3GB"
    "redis_config" = "production"
  }

  tags = ["redis", "replica", "growth-phase"]
}

# Object Storage for file uploads and static assets
resource "linode_object_storage_bucket" "app_storage" {
  label     = "${local.name_prefix}-storage"
  region    = var.region
  
  # Enable versioning for data protection
  versioning = true
  
  # CORS configuration for web access
  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "POST", "PUT", "DELETE"]
    allowed_origins = ["*"]
    max_age_seconds = 3600
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
}

# Monitoring and Alerting Instance
resource "linode_instance" "monitoring" {
  label  = "${local.name_prefix}-monitoring"
  image  = "linode/ubuntu22.04"
  region = var.region
  type   = "g6-nanode-1" # 1 vCPU, 1GB RAM - $5/month
  
  authorized_keys = [var.ssh_public_key]
  root_pass       = var.root_password
  
  # Monitoring stack setup (Prometheus + Grafana)
  stackscript_id = linode_stackscript.monitoring_setup.id
  stackscript_data = {
    "grafana_admin_password" = var.grafana_admin_password
    "prometheus_retention"   = "30d"
  }

  tags = ["monitoring", "prometheus", "grafana", "growth-phase"]
}

# StackScript for Application Server Setup
resource "linode_stackscript" "app_setup" {
  label       = "${local.name_prefix}-app-setup"
  description = "Setup script for Sikka Transport application servers"
  script      = file("${path.module}/scripts/app-setup.sh")
  images      = ["linode/ubuntu22.04"]
  
  # Define user-defined fields
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
    label   = "redis_host"
    name    = "REDIS_HOST"
    example = "192.168.1.100"
  }
  
  user_defined_fields {
    label   = "db_host"
    name    = "DB_HOST"
    example = "mysql-cluster.linode.com"
  }
}

# StackScript for Redis Primary Setup
resource "linode_stackscript" "redis_setup" {
  label       = "${local.name_prefix}-redis-setup"
  description = "Setup script for Redis primary instance"
  script      = file("${path.module}/scripts/redis-setup.sh")
  images      = ["linode/ubuntu22.04"]
  
  user_defined_fields {
    label   = "redis_memory"
    name    = "REDIS_MEMORY"
    example = "3GB"
  }
  
  user_defined_fields {
    label   = "redis_config"
    name    = "REDIS_CONFIG"
    example = "production"
  }
  
  user_defined_fields {
    label   = "enable_persistence"
    name    = "ENABLE_PERSISTENCE"
    example = "yes"
  }
}

# StackScript for Redis Replica Setup
resource "linode_stackscript" "redis_replica_setup" {
  label       = "${local.name_prefix}-redis-replica-setup"
  description = "Setup script for Redis replica instance"
  script      = file("${path.module}/scripts/redis-replica-setup.sh")
  images      = ["linode/ubuntu22.04"]
  
  user_defined_fields {
    label   = "master_ip"
    name    = "MASTER_IP"
    example = "192.168.1.100"
  }
  
  user_defined_fields {
    label   = "redis_memory"
    name    = "REDIS_MEMORY"
    example = "3GB"
  }
  
  user_defined_fields {
    label   = "redis_config"
    name    = "REDIS_CONFIG"
    example = "production"
  }
}

# StackScript for Monitoring Setup
resource "linode_stackscript" "monitoring_setup" {
  label       = "${local.name_prefix}-monitoring-setup"
  description = "Setup script for monitoring stack (Prometheus + Grafana)"
  script      = file("${path.module}/scripts/monitoring-setup.sh")
  images      = ["linode/ubuntu22.04"]
  
  user_defined_fields {
    label   = "grafana_admin_password"
    name    = "GRAFANA_ADMIN_PASSWORD"
    example = "secure_password_here"
  }
  
  user_defined_fields {
    label   = "prometheus_retention"
    name    = "PROMETHEUS_RETENTION"
    example = "30d"
  }
}

# Firewall for Application Servers
resource "linode_firewall" "app_firewall" {
  label = "${local.name_prefix}-app-firewall"
  tags  = ["firewall", "app-servers", "growth-phase"]

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
    ipv4     = [linode_nodebalancer.main.ipv4]
  }

  # Outbound rules (allow all)
  outbound_policy = "ACCEPT"

  # Apply to app servers
  linodes = linode_instance.app_servers[*].id
}

# Firewall for Redis Instances
resource "linode_firewall" "redis_firewall" {
  label = "${local.name_prefix}-redis-firewall"
  tags  = ["firewall", "redis", "growth-phase"]

  # Inbound rules
  inbound {
    label    = "allow-redis"
    action   = "ACCEPT"
    protocol = "TCP"
    ports    = "6379"
    ipv4     = linode_instance.app_servers[*].ip_address
  }

  inbound {
    label    = "allow-ssh"
    action   = "ACCEPT"
    protocol = "TCP"
    ports    = "22"
    ipv4     = [var.admin_ip_range]
  }

  inbound {
    label    = "allow-redis-replication"
    action   = "ACCEPT"
    protocol = "TCP"
    ports    = "6379"
    ipv4     = [
      linode_instance.redis_primary.ip_address,
      linode_instance.redis_replica.ip_address
    ]
  }

  # Outbound rules (allow all)
  outbound_policy = "ACCEPT"

  # Apply to Redis instances
  linodes = [
    linode_instance.redis_primary.id,
    linode_instance.redis_replica.id
  ]
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

variable "admin_ip_range" {
  description = "IP range for admin access"
  type        = string
  default     = "0.0.0.0/0"
}

# Outputs
output "load_balancer_ip" {
  description = "Load balancer public IP"
  value       = linode_nodebalancer.main.ipv4
}

output "app_server_ips" {
  description = "Application server IP addresses"
  value       = linode_instance.app_servers[*].ip_address
}

output "database_host" {
  description = "Database connection host"
  value       = linode_database_mysql.primary.host
  sensitive   = true
}

output "database_port" {
  description = "Database connection port"
  value       = linode_database_mysql.primary.port
}

output "redis_primary_ip" {
  description = "Redis primary instance IP"
  value       = linode_instance.redis_primary.ip_address
}

output "redis_replica_ip" {
  description = "Redis replica instance IP"
  value       = linode_instance.redis_replica.ip_address
}

output "object_storage_bucket" {
  description = "Object storage bucket name"
  value       = linode_object_storage_bucket.app_storage.label
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

output "monitoring_ip" {
  description = "Monitoring server IP address"
  value       = linode_instance.monitoring.ip_address
}

output "total_monthly_cost" {
  description = "Estimated total monthly cost in USD"
  value       = "344"
}

output "cost_breakdown" {
  description = "Detailed cost breakdown"
  value = {
    app_servers     = "120" # 2x $60
    database        = "60"  # Managed MySQL cluster
    redis_primary   = "60"  # Dedicated CPU
    redis_replica   = "60"  # Dedicated CPU
    load_balancer   = "10"  # NodeBalancer
    object_storage  = "5"   # Estimated
    monitoring      = "5"   # Nanode
    bandwidth       = "24"  # Estimated
    total          = "344"
  }
}
