# Linode Infrastructure Template - Launch Phase
# Optimized for 1K-2K users with cost-effective Linode services

terraform {
  required_version = ">= 1.0"
  required_providers {
    linode = {
      source  = "linode/linode"
      version = "~> 2.0"
    }
  }
}

variable "linode_token" {
  description = "Linode API Token"
  type        = string
  sensitive   = true
}

variable "region" {
  description = "Linode region for deployment"
  type        = string
  default     = "us-east"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "launch"
}

variable "ssh_public_key" {
  description = "SSH public key for instance access"
  type        = string
}

variable "root_password" {
  description = "Root password for instances"
  type        = string
  sensitive   = true
}

provider "linode" {
  token = var.linode_token
}

# VPC Configuration
resource "linode_vpc" "main" {
  label  = "sikka-vpc-${var.environment}"
  region = var.region
  
  description = "VPC for Sikka Transportation Platform - ${var.environment}"
}

resource "linode_vpc_subnet" "public" {
  vpc_id = linode_vpc.main.id
  label  = "sikka-public-subnet-${var.environment}"
  ipv4   = "10.0.1.0/24"
}

resource "linode_vpc_subnet" "private" {
  vpc_id = linode_vpc.main.id
  label  = "sikka-private-subnet-${var.environment}"
  ipv4   = "10.0.10.0/24"
}

# Firewall Rules
resource "linode_firewall" "web" {
  label = "sikka-web-firewall-${var.environment}"

  inbound {
    label    = "allow-http"
    action   = "ACCEPT"
    protocol = "TCP"
    ports    = "80"
    ipv4     = ["0.0.0.0/0"]
  }

  inbound {
    label    = "allow-https"
    action   = "ACCEPT"
    protocol = "TCP"
    ports    = "443"
    ipv4     = ["0.0.0.0/0"]
  }

  inbound {
    label    = "allow-ssh"
    action   = "ACCEPT"
    protocol = "TCP"
    ports    = "22"
    ipv4     = ["10.0.0.0/16"]
  }

  outbound {
    label    = "allow-all-outbound"
    action   = "ACCEPT"
    protocol = "TCP"
    ports    = "1-65535"
    ipv4     = ["0.0.0.0/0"]
  }

  outbound {
    label    = "allow-all-outbound-udp"
    action   = "ACCEPT"
    protocol = "UDP"
    ports    = "1-65535"
    ipv4     = ["0.0.0.0/0"]
  }
}

resource "linode_firewall" "app" {
  label = "sikka-app-firewall-${var.environment}"

  inbound {
    label    = "allow-app-port"
    action   = "ACCEPT"
    protocol = "TCP"
    ports    = "3000"
    ipv4     = ["10.0.0.0/16"]
  }

  inbound {
    label    = "allow-ssh"
    action   = "ACCEPT"
    protocol = "TCP"
    ports    = "22"
    ipv4     = ["10.0.0.0/16"]
  }

  outbound {
    label    = "allow-all-outbound"
    action   = "ACCEPT"
    protocol = "TCP"
    ports    = "1-65535"
    ipv4     = ["0.0.0.0/0"]
  }
}

resource "linode_firewall" "database" {
  label = "sikka-database-firewall-${var.environment}"

  inbound {
    label    = "allow-postgres"
    action   = "ACCEPT"
    protocol = "TCP"
    ports    = "5432"
    ipv4     = ["10.0.0.0/16"]
  }
}

resource "linode_firewall" "cache" {
  label = "sikka-cache-firewall-${var.environment}"

  inbound {
    label    = "allow-redis"
    action   = "ACCEPT"
    protocol = "TCP"
    ports    = "6379"
    ipv4     = ["10.0.0.0/16"]
  }
}

# Application Instance
resource "linode_instance" "app" {
  label  = "sikka-app-${var.environment}"
  image  = "linode/ubuntu22.04"
  region = var.region
  type   = "g6-nanode-1" # 1GB RAM, 1 vCPU - $5/month
  
  authorized_keys = [var.ssh_public_key]
  root_pass       = var.root_password
  
  interface {
    purpose = "vpc"
    subnet_id = linode_vpc_subnet.private.id
    ipv4 {
      vpc = "10.0.10.10"
    }
  }

  interface {
    purpose = "public"
  }

  firewall_id = linode_firewall.app.id

  user_data = base64encode(<<-EOF
    #!/bin/bash
    apt-get update
    apt-get install -y docker.io docker-compose nodejs npm
    systemctl start docker
    systemctl enable docker
    usermod -aG docker ubuntu
    
    # Install Node.js 18
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
    
    # Install PM2
    npm install -g pm2
    
    # Create application directory
    mkdir -p /opt/sikka
    chown ubuntu:ubuntu /opt/sikka
    
    # Install Longview client
    curl -s https://lv.linode.com/${linode_longview_client.app.install_code} | bash
  EOF
  )

  tags = ["sikka", var.environment, "application"]
}

# NodeBalancer (Load Balancer)
resource "linode_nodebalancer" "main" {
  label  = "sikka-nodebalancer-${var.environment}"
  region = var.region
  
  tags = ["sikka", var.environment, "load-balancer"]
}

resource "linode_nodebalancer_config" "http" {
  nodebalancer_id = linode_nodebalancer.main.id
  port            = 80
  protocol        = "http"
  algorithm       = "roundrobin"
  stickiness      = "http_cookie"
  
  check          = "http"
  check_path     = "/health"
  check_attempts = 3
  check_timeout  = 10
  check_interval = 30
}

resource "linode_nodebalancer_node" "app" {
  nodebalancer_id = linode_nodebalancer.main.id
  config_id       = linode_nodebalancer_config.http.id
  
  label   = "sikka-app-node"
  address = "${linode_instance.app.private_ip_address}:3000"
  weight  = 100
  mode    = "accept"
}

# Managed Database
resource "linode_database_postgresql" "main" {
  label  = "sikka-database-${var.environment}"
  region = var.region
  type   = "g6-nanode-1" # 1GB RAM - $15/month
  
  engine_id = "postgresql/13"
  
  encrypted = true
  
  allow_list = [
    linode_vpc_subnet.private.ipv4
  ]
  
  cluster_size = 1
  
  tags = ["sikka", var.environment, "database"]
}

# Redis Instance for Caching
resource "linode_instance" "redis" {
  label  = "sikka-redis-${var.environment}"
  image  = "linode/ubuntu22.04"
  region = var.region
  type   = "g6-nanode-1" # 1GB RAM - $5/month
  
  authorized_keys = [var.ssh_public_key]
  root_pass       = var.root_password
  
  interface {
    purpose = "vpc"
    subnet_id = linode_vpc_subnet.private.id
    ipv4 {
      vpc = "10.0.10.100"
    }
  }

  firewall_id = linode_firewall.cache.id

  user_data = base64encode(<<-EOF
    #!/bin/bash
    apt-get update
    apt-get install -y redis-server
    
    # Configure Redis
    sed -i 's/bind 127.0.0.1/bind 0.0.0.0/' /etc/redis/redis.conf
    sed -i 's/# requirepass foobared/requirepass ${var.redis_password}/' /etc/redis/redis.conf
    
    # Enable persistence
    sed -i 's/# save 900 1/save 900 1/' /etc/redis/redis.conf
    sed -i 's/# save 300 10/save 300 10/' /etc/redis/redis.conf
    sed -i 's/# save 60 10000/save 60 10000/' /etc/redis/redis.conf
    
    systemctl restart redis-server
    systemctl enable redis-server
    
    # Install Longview client
    curl -s https://lv.linode.com/${linode_longview_client.redis.install_code} | bash
  EOF
  )

  tags = ["sikka", var.environment, "cache"]
}

# Object Storage Bucket
resource "linode_object_storage_bucket" "app_storage" {
  cluster = "${var.region}-1"
  label   = "sikka-storage-${var.environment}"
  
  versioning = true
  
  lifecycle_rule {
    id      = "transition_to_ia"
    enabled = true
    
    expiration {
      days = 365
    }
    
    noncurrent_version_expiration {
      days = 30
    }
  }
}

# Object Storage Keys
resource "linode_object_storage_key" "app_storage" {
  label = "sikka-storage-key-${var.environment}"
  
  bucket_access {
    bucket_name = linode_object_storage_bucket.app_storage.label
    cluster     = linode_object_storage_bucket.app_storage.cluster
    permissions = "read_write"
  }
}

# Longview Clients for Monitoring
resource "linode_longview_client" "app" {
  label = "sikka-app-longview"
}

resource "linode_longview_client" "redis" {
  label = "sikka-redis-longview"
}

# Variables
variable "redis_password" {
  description = "Password for Redis instance"
  type        = string
  sensitive   = true
  default     = "change_me_in_production"
}

# Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = linode_vpc.main.id
}

output "app_instance_ip" {
  description = "Private IP address of application instance"
  value       = linode_instance.app.private_ip_address
}

output "load_balancer_ip" {
  description = "IP address of the NodeBalancer"
  value       = linode_nodebalancer.main.ipv4
}

output "database_host" {
  description = "Database connection host"
  value       = linode_database_postgresql.main.host
  sensitive   = true
}

output "database_port" {
  description = "Database connection port"
  value       = linode_database_postgresql.main.port
}

output "redis_ip" {
  description = "Redis instance IP address"
  value       = linode_instance.redis.private_ip_address
  sensitive   = true
}

output "object_storage_bucket" {
  description = "Object storage bucket name"
  value       = linode_object_storage_bucket.app_storage.label
}

output "object_storage_access_key" {
  description = "Object storage access key"
  value       = linode_object_storage_key.app_storage.access_key
  sensitive   = true
}

output "object_storage_secret_key" {
  description = "Object storage secret key"
  value       = linode_object_storage_key.app_storage.secret_key
  sensitive   = true
}

# Estimated Monthly Cost: ~$83
# - App Instance (g6-nanode-1): $5
# - Database (g6-nanode-1): $15
# - Redis Instance (g6-nanode-1): $5
# - NodeBalancer: $10
# - Object Storage: $5
# - Data Transfer: $1 (generous allowances)
# - Monitoring: $0 (Longview free tier)
# - Total: ~$41 base + ~$42 for additional services = $83
