# 🚗 Sikka Transportation Platform

<!-- 
Mermaid Configuration for GitHub Compatibility
This ensures diagrams render correctly with GitHub's Mermaid v11+ implementation
-->

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13%2B-blue.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-6%2B-red.svg)](https://redis.io/)

> **Modern, scalable transportation platform designed for the Sudanese market**

Sikka is a comprehensive ride-hailing solution built with **Node.js**, **TypeScript**, and **PostgreSQL**, featuring real-time tracking, multi-gateway payments, and advanced business intelligence.

---

## 📋 Table of Contents

- [🌟 Features](#-features)
- [🏗️ Architecture](#️-architecture)
- [🚀 Quick Start](#-quick-start)
- [💳 Payment Integration](#-payment-integration)
- [🔌 WebSocket Events](#-websocket-events)
- [📱 Mobile Apps](#-mobile-apps)
- [🛡️ Security](#️-security)
- [📊 Business Intelligence](#-business-intelligence)
- [🧪 Testing](#-testing)
- [🚀 Deployment](#-deployment)
- [📚 Documentation](#-documentation)
- [🤝 Contributing](#-contributing)

---

## 🌟 Features

### **🚗 Core Transportation**
- **Real-time Trip Matching** - Intelligent driver-passenger pairing
- **Live GPS Tracking** - Real-time location updates via WebSocket
- **Dynamic Pricing** - Surge pricing based on demand and supply
- **Multi-Vehicle Support** - Cars, motorcycles, and delivery vehicles
- **Trip Scheduling** - Advance booking with automated dispatch

### **💰 Financial Management**
- **Multi-Gateway Payments** - EBS, CyberPay, and digital wallets
- **Commission System** - Automated 15% platform fee collection
- **Driver Earnings** - Real-time payout processing (85% share)
- **Refund Management** - Automated and manual refund processing
- **Financial Reporting** - Comprehensive revenue analytics

### **👥 User Management**
- **Role-Based Access** - Passengers, drivers, and administrators
- **Document Verification** - Automated driver credential validation
- **Rating System** - Bi-directional feedback mechanism
- **Profile Management** - Comprehensive user profiles with preferences

### **🔧 Technical Excellence**
- **Microservices Architecture** - Scalable, maintainable service design
- **Real-time Communication** - WebSocket-based live updates
- **Advanced Caching** - Redis-powered performance optimization
- **Comprehensive Monitoring** - Health checks and performance metrics
- **Security First** - JWT authentication, rate limiting, and data encryption

---

## 🏗️ Architecture

### **System Components**

```mermaid
graph TB
    A["Mobile Apps"] --> B["API Gateway"]
    B --> C["Authentication Service"]
    B --> D["Trip Management Service"]
    B --> E["Payment Service"]
    B --> F["User Service"]
    B --> G["WebSocket Gateway"]
    
    C --> H[("PostgreSQL")]
    D --> H
    E --> H
    F --> H
    
    E --> I["EBS Gateway"]
    E --> J["CyberPay Gateway"]
    
    G --> K[("Redis")]
    B --> K
    
    L["Admin Dashboard"] --> B
    M["Driver App"] --> G
    N["Passenger App"] --> G

    %% --- DARK GRADIENT & GLOW STYLING ---
    
    %% Main Dashboard (Neon Cyan/Blue)
    classDef main fill:#0d1117,stroke:#58a6ff,stroke-width:4px,color:#58a6ff,font-weight:bold;
    
    %% Decision Diamond (Gold Glow)
    classDef decision fill:#161b22,stroke:#d29922,color:#d29922,stroke-dasharray: 5 5;
    
    %% Revenue (Emerald Gradient Style)
    classDef revNode fill:#04190b,stroke:#3fb950,color:#aff5b4,stroke-width:2px;
    
    %% Commission (Purple Gradient Style)
    classDef commNode fill:#12101e,stroke:#bc8cff,color:#e2c5ff,stroke-width:2px;
    
    %% Refund (Ruby Gradient Style)
    classDef refNode fill:#1a0b0b,stroke:#ff7b72,color:#ffa198,stroke-width:2px;
    
    %% Earnings (Sapphire Gradient Style)
    classDef earnNode fill:#051221,stroke:#388bfd,color:#a5d6ff,stroke-width:2px;

    class A main;
    class B decision;
    class C revNode;
    class D commNode;
    class E refNode;
    class F earnNode;
    class G main;
    class H decision;
    class I revNode;
    class J commNode;
    class K refNode;
    class L earnNode;
    class M main;
    class N decision;
```

### **Key Architectural Principles**
- **🔄 Event-Driven Design** - Asynchronous communication between services
- **📈 Horizontal Scalability** - Load balancer with multiple service instances
- **🛡️ Security Layers** - Multi-layer security with authentication and authorization
- **⚡ Performance Optimization** - Caching strategies and database optimization
- **🔍 Observability** - Comprehensive logging, monitoring, and alerting

---

## 🚀 Quick Start

### **Prerequisites**
- **Node.js** 18+ and npm/yarn
- **PostgreSQL** 13+
- **Redis** 6+
- **Git** for version control

### **Installation**

1. **Clone the repository**
   ```bash
   git clone https://github.com/abdoElHodaky/transportapp.git
   cd transportapp
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Database setup**
   ```bash
   # Create database
   createdb sikka_dev
   
   # Run migrations
   npm run migration:run
   
   # Seed initial data
   npm run seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

### **Environment Variables**
```env
# Database
DATABASE_URL=postgresql://[USERNAME]:[PASSWORD]@localhost:5432/sikka_dev

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Payment Gateways
EBS_API_KEY=your-ebs-api-key
EBS_SECRET_KEY=your-ebs-secret-key
CYBERPAY_API_KEY=your-cyberpay-api-key
CYBERPAY_SECRET_KEY=your-cyberpay-secret-key

# WebSocket
WEBSOCKET_PORT=3001

# File Storage
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10MB
```

---

## 💳 Payment Integration

### **Supported Payment Methods**

#### **🏦 EBS (Electronic Banking Services)**
- **Type**: Bank card payments
- **Currency**: SDG (Sudanese Pound)
- **Features**: Real-time processing, webhook callbacks
- **Simulation**: Available for development

#### **💰 CyberPay**
- **Type**: Digital wallet and card payments
- **Currency**: SDG
- **Features**: Instant transfers, refund support
- **Simulation**: Available for development

#### **📱 Digital Wallet**
- **Type**: Platform wallet system
- **Features**: Instant payments, spending limits, transaction history
- **Security**: PIN protection, daily/monthly limits

#### **💵 Cash Payments**
- **Type**: Pay-on-delivery
- **Features**: Driver collection, manual confirmation

### **Payment Flow**

```mermaid
sequenceDiagram
    autonumber

    %% Box allows background styling for groups of participants
    box rgb(13, 17, 23) "Trip Participants"
        participant P as Passenger
        participant D as Driver
    end
    
    box rgb(22, 27, 34) "Platform Infrastructure"
        participant S as Sikka API
        participant G as Payment Gateway
    end

    P->>S: Complete Trip
    S->>S: Calculate Fare
    S->>G: Process Payment
    G-->>S: Payment Confirmation

    %% Highlighting the logic section with a styled rectangle
    rect rgb(30, 30, 60)
        Note over S, D: Settlement Logic
        S->>S: Update Wallet Balances
        S->>D: Transfer Earnings (85%)
        S->>S: Collect Platform Commission (15%)
    end

    S->>P: Payment Receipt
```

---

## 🔌 WebSocket Events

### **Real-time Communication**

```javascript
// Connect to WebSocket
const socket = io('ws://localhost:3001', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Trip status updates
socket.on('trip_status_change', (tripData) => {
  console.log('Trip status:', tripData.status);
});

// Driver location updates
socket.on('driver_location_update', (locationData) => {
  console.log('Driver location:', locationData.coordinates);
});

// Payment completion
socket.on('payment_completed', (paymentData) => {
  console.log('Payment confirmed:', paymentData.amount);
});
```

### **Event Categories**
- **🚗 Trip Events** - Status changes, driver assignment, completion
- **📍 Location Events** - Real-time GPS tracking updates
- **💳 Payment Events** - Transaction confirmations and failures
- **📱 Notification Events** - Push notifications and alerts
- **👤 User Events** - Profile updates and authentication changes

---

## 📱 Mobile Apps

### **Passenger App Features**
- **🗺️ Interactive Map** - Real-time driver tracking
- **💰 Fare Estimation** - Upfront pricing with surge indicators
- **⭐ Rating System** - Rate drivers and view trip history
- **💳 Multiple Payment Options** - Cards, wallets, and cash
- **📱 Push Notifications** - Trip updates and promotional offers

### **Driver App Features**
- **📊 Earnings Dashboard** - Real-time income tracking
- **🚗 Trip Management** - Accept/decline trip requests
- **📍 Navigation Integration** - Built-in GPS navigation
- **📈 Performance Analytics** - Rating and efficiency metrics
- **💰 Instant Payouts** - Quick earnings withdrawal

---

## 🛡️ Security

### **Authentication & Authorization**
- **🔐 JWT Tokens** - Secure stateless authentication
- **🔑 Role-Based Access Control** - Granular permission system
- **🛡️ Rate Limiting** - API abuse prevention
- **🔒 Data Encryption** - End-to-end data protection

### **Payment Security**
- **🏦 PCI Compliance** - Secure payment processing
- **🔐 Tokenization** - Sensitive data protection
- **🛡️ Fraud Detection** - Real-time transaction monitoring
- **📱 Two-Factor Authentication** - Enhanced account security

---

## 📊 Business Intelligence

### **Analytics Dashboard**
- **📈 Revenue Tracking** - Real-time financial metrics
- **🚗 Trip Analytics** - Demand patterns and hotspots
- **👥 User Insights** - Registration and retention metrics
- **💰 Driver Performance** - Earnings and efficiency reports

### **Reporting Features**
- **📊 Custom Reports** - Flexible data visualization
- **📅 Scheduled Reports** - Automated report generation
- **📤 Data Export** - CSV, PDF, and Excel formats
- **🔍 Advanced Filtering** - Detailed data segmentation

---

## 🧪 Testing

### **Test Coverage**
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suite
npm run test:unit
npm run test:integration
npm run test:e2e
```

### **Testing Strategy**
- **🔬 Unit Tests** - Individual component testing
- **🔗 Integration Tests** - Service interaction testing
- **🌐 End-to-End Tests** - Complete user journey testing
- **⚡ Performance Tests** - Load and stress testing

---

## 🚀 Deployment

### **Production Deployment**
```bash
# Build for production
npm run build

# Start production server
npm start

# Using PM2
pm2 start ecosystem.config.js
```

### **Docker Deployment**
```bash
# Build Docker image
docker build -t sikka-app .

# Run with Docker Compose
docker-compose up -d
```

### **Environment Setup**
- **🌐 Load Balancer** - Nginx or AWS ALB
- **🗄️ Database** - PostgreSQL with read replicas
- **⚡ Cache** - Redis cluster for high availability
- **📊 Monitoring** - Prometheus, Grafana, and ELK stack

---

## 📚 Documentation

### **API Documentation**
- **📖 [API Reference](docs/API.md)** - Complete endpoint documentation
- **🏗️ [Architecture Guide](docs/ARCHITECTURE.md)** - System design and patterns
- **💼 [Business Processes](docs/BUSINESS_PROCESSES.md)** - Workflow documentation
- **🗄️ [Database Schema](docs/DATABASE_SCHEMA.md)** - Data model reference

### **Development Guides**
- **🔧 [Setup Guide](docs/SETUP.md)** - Development environment setup
- **🧪 [Testing Guide](docs/TESTING.md)** - Testing strategies and tools
- **🚀 [Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment
- **🔒 [Security Guide](docs/SECURITY.md)** - Security best practices

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### **Development Workflow**
1. **🍴 Fork** the repository
2. **🌿 Create** a feature branch
3. **💻 Make** your changes
4. **🧪 Test** your changes
5. **📝 Submit** a pull request

### **Code Standards**
- **📏 ESLint** - Code linting and formatting
- **🎨 Prettier** - Code formatting
- **📝 TypeScript** - Type safety and documentation
- **🧪 Jest** - Testing framework

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **🇸🇩 Sudanese Developer Community** - For inspiration and support
- **🌍 Open Source Contributors** - For the amazing tools and libraries
- **🚗 Transportation Industry** - For domain expertise and insights

---

**Built with ❤️ for Sudan's transportation future**

*For support, please contact: [support@sikka.sd](mailto:support@sikka.sd)*
