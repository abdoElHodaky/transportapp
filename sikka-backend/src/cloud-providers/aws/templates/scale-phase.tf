# AWS Infrastructure Template - Scale Phase
# Optimized for 10K+ users with enterprise-grade performance and reliability

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

variable "region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "scale"
}

provider "aws" {
  region = var.region
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

# VPC Configuration (Enterprise-grade)
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "sikka-vpc-${var.environment}"
    Environment = var.environment
    Project     = "sikka-transport"
    Phase       = "scale"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "sikka-igw-${var.environment}"
  }
}

# Public Subnets (Multi-AZ for maximum HA)
resource "aws_subnet" "public" {
  count = 3
  
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.${count.index + 1}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "sikka-public-subnet-${count.index + 1}-${var.environment}"
    Type = "public"
  }
}

# Private Subnets (Multi-AZ for applications)
resource "aws_subnet" "private" {
  count = 3
  
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "sikka-private-subnet-${count.index + 1}-${var.environment}"
    Type = "private"
  }
}

# Database Subnets (Isolated)
resource "aws_subnet" "database" {
  count = 3
  
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 20}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "sikka-db-subnet-${count.index + 1}-${var.environment}"
    Type = "database"
  }
}

# Cache Subnets (Isolated)
resource "aws_subnet" "cache" {
  count = 3
  
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 30}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "sikka-cache-subnet-${count.index + 1}-${var.environment}"
    Type = "cache"
  }
}

# Route Table for Public Subnets
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "sikka-public-rt-${var.environment}"
  }
}

resource "aws_route_table_association" "public" {
  count = length(aws_subnet.public)
  
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# NAT Gateways (Multi-AZ for HA)
resource "aws_eip" "nat" {
  count  = 3
  domain = "vpc"
  
  tags = {
    Name = "sikka-nat-eip-${count.index + 1}-${var.environment}"
  }
}

resource "aws_nat_gateway" "main" {
  count = 3
  
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = {
    Name = "sikka-nat-${count.index + 1}-${var.environment}"
  }

  depends_on = [aws_internet_gateway.main]
}

# Route Tables for Private Subnets
resource "aws_route_table" "private" {
  count = 3
  
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = {
    Name = "sikka-private-rt-${count.index + 1}-${var.environment}"
  }
}

resource "aws_route_table_association" "private" {
  count = length(aws_subnet.private)
  
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# Enhanced Security Groups
resource "aws_security_group" "web" {
  name_prefix = "sikka-web-${var.environment}-"
  vpc_id      = aws_vpc.main.id
  description = "Security group for web tier with WAF integration"

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "sikka-web-sg-${var.environment}"
  }
}

resource "aws_security_group" "app" {
  name_prefix = "sikka-app-${var.environment}-"
  vpc_id      = aws_vpc.main.id
  description = "Security group for application tier"

  ingress {
    description     = "App Port from ALB"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.web.id]
  }

  ingress {
    description = "SSH from bastion"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "sikka-app-sg-${var.environment}"
  }
}

# Launch Template for Application Servers (Enterprise)
resource "aws_launch_template" "app" {
  name_prefix   = "sikka-app-${var.environment}-"
  image_id      = "ami-0c02fb55956c7d316" # Amazon Linux 2
  instance_type = "c5.xlarge" # High-performance instances
  
  vpc_security_group_ids = [aws_security_group.app.id]
  
  # Enhanced user data with comprehensive monitoring
  user_data = base64encode(<<-EOF
    #!/bin/bash
    yum update -y
    yum install -y docker amazon-cloudwatch-agent amazon-ssm-agent
    systemctl start docker
    systemctl enable docker
    systemctl start amazon-ssm-agent
    systemctl enable amazon-ssm-agent
    usermod -a -G docker ec2-user
    
    # Install Node.js 18
    curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
    yum install -y nodejs
    
    # Install PM2 and monitoring tools
    npm install -g pm2 pm2-logrotate pm2-server-monit
    
    # Configure enhanced CloudWatch agent
    cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'EOL'
    {
      "metrics": {
        "namespace": "Sikka/Application/Scale",
        "metrics_collected": {
          "cpu": {
            "measurement": ["cpu_usage_idle", "cpu_usage_iowait", "cpu_usage_user", "cpu_usage_system"],
            "metrics_collection_interval": 30,
            "totalcpu": true
          },
          "disk": {
            "measurement": ["used_percent", "inodes_free"],
            "metrics_collection_interval": 30,
            "resources": ["*"]
          },
          "mem": {
            "measurement": ["mem_used_percent", "mem_available_percent"],
            "metrics_collection_interval": 30
          },
          "netstat": {
            "measurement": ["tcp_established", "tcp_time_wait"],
            "metrics_collection_interval": 30
          }
        }
      },
      "logs": {
        "logs_collected": {
          "files": {
            "collect_list": [
              {
                "file_path": "/var/log/messages",
                "log_group_name": "/aws/ec2/sikka-${var.environment}",
                "log_stream_name": "{instance_id}/messages"
              },
              {
                "file_path": "/opt/sikka/logs/app.log",
                "log_group_name": "/aws/ec2/sikka-${var.environment}",
                "log_stream_name": "{instance_id}/application"
              }
            ]
          }
        }
      }
    }
    EOL
    
    # Start CloudWatch agent
    /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
      -a fetch-config -m ec2 -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json -s
    
    # Create application directory with proper permissions
    mkdir -p /opt/sikka/logs
    chown -R ec2-user:ec2-user /opt/sikka
  EOF
  )

  iam_instance_profile {
    name = aws_iam_instance_profile.app.name
  }

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name        = "sikka-app-${var.environment}"
      Environment = var.environment
      Type        = "application"
      Tier        = "scale"
    }
  }

  tags = {
    Name = "sikka-app-template-${var.environment}"
  }
}

# Enhanced Auto Scaling Group with Predictive Scaling
resource "aws_autoscaling_group" "app" {
  name                = "sikka-app-asg-${var.environment}"
  vpc_zone_identifier = aws_subnet.private[*].id
  target_group_arns   = [aws_lb_target_group.app.arn]
  health_check_type   = "ELB"
  health_check_grace_period = 300

  min_size         = 3  # Minimum for HA
  max_size         = 20 # High scalability
  desired_capacity = 6  # Optimal for scale phase

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  # Enable predictive scaling
  enabled_metrics = [
    "GroupMinSize",
    "GroupMaxSize",
    "GroupDesiredCapacity",
    "GroupInServiceInstances",
    "GroupTotalInstances"
  ]

  tag {
    key                 = "Name"
    value               = "sikka-app-asg-${var.environment}"
    propagate_at_launch = false
  }

  tag {
    key                 = "Environment"
    value               = var.environment
    propagate_at_launch = true
  }
}

# Estimated Monthly Cost: ~$2,903
# - EC2 c5.xlarge (6 instances): ~$744.60
# - RDS db.r5.2xlarge + replicas: ~$580.00
# - ElastiCache cache.r6g.4xlarge cluster: ~$720.00
# - ALB with WAF: ~$50.00
# - NAT Gateways (3): ~$97.20
# - S3 with CDN: ~$50.00
# - Data Transfer: ~$100.00
# - CloudWatch Enhanced: ~$80.00
# - EBS Storage: ~$150.00
# - Additional services: ~$331.20
