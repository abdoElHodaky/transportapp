# 🏗️ System Architecture & Technical Design

This document provides a comprehensive overview of the Sikka Transportation Platform's technical architecture, system design patterns, and implementation details.

## 📑 Table of Contents

- [🎯 Architecture Overview](#-architecture-overview)
- [🏢 System Components](#-system-components)
- [🔄 Data Flow Architecture](#-data-flow-architecture)
- [🗄️ Database Design](#️-database-design)
- [🌐 API Architecture](#-api-architecture)
- [⚡ Real-time Communication](#-real-time-communication)
- [🔐 Security Architecture](#-security-architecture)
- [📈 Scalability & Performance](#-scalability--performance)
- [🚀 Deployment Architecture](#-deployment-architecture)

---

## 🎯 Architecture Overview

### **High-Level System Architecture**

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#ff6b6b',
    'primaryTextColor': '#ffffff',
    'primaryBorderColor': '#ff4757',
    'lineColor': '#3742fa',
    'secondaryColor': '#2ed573',
    'tertiaryColor': '#ffa502',
    'background': '#1e1e1e',
    'mainBkg': '#2f3542',
    'secondBkg': '#57606f',
    'tertiaryBkg': '#747d8c'
  }
}}%%

graph TB
    %% Client Applications
    subgraph "📱 Client Applications"
        MOBILE[📱 Mobile Apps<br/>Passenger & Driver]
        WEB[🌐 Web Dashboard<br/>Admin Panel]
        API_CLIENTS[🔌 API Clients<br/>Third-party Integrations]
    end
    
    %% Gateway Layer
    subgraph "🚪 Gateway & Load Balancing"
        LB[⚖️ Load Balancer<br/>Nginx/HAProxy]
        GATEWAY[🚪 API Gateway<br/>Rate Limiting & Auth]
        CDN[📡 CDN<br/>Static Assets]
    end
    
    %% Core Services
    subgraph "🏗️ Core Backend Services"
        AUTH[🔐 Authentication<br/>JWT + OTP]
        USER[👤 User Management<br/>Profiles & Verification]
        TRIP[🚗 Trip Service<br/>Booking & Tracking]
        PAYMENT[💰 Payment Service<br/>Multi-gateway Support]
        LOCATION[📍 Location Service<br/>GPS & Routing]
        NOTIFY[🔔 Notification Service<br/>Multi-channel Delivery]
        WEBSOCKET[⚡ WebSocket Gateway<br/>Real-time Updates]
    end
    
    %% Data Layer
    subgraph "🗄️ Data & Storage Layer"
        POSTGRES[🐘 PostgreSQL<br/>Primary Database]
        REDIS[⚡ Redis<br/>Cache & Sessions]
        QUEUE[📬 Message Queue<br/>Background Jobs]
        FILES[📁 File Storage<br/>Documents & Media]
    end
    
    %% External Services
    subgraph "🌐 External Services"
        SMS_GATEWAY[📱 SMS Gateway<br/>Twilio/AWS SNS]
        PAYMENT_GW[💳 Payment Gateways<br/>EBS/CyberPay]
        MAPS[🗺️ Maps API<br/>Google/OpenStreet]
        PUSH[🔔 Push Services<br/>FCM/APNs]
    end

    %% Connections
    MOBILE --> LB
    WEB --> LB
    API_CLIENTS --> LB
    
    LB --> GATEWAY
    LB --> CDN
    GATEWAY --> AUTH
    GATEWAY --> USER
    GATEWAY --> TRIP
    GATEWAY --> PAYMENT
    GATEWAY --> LOCATION
    GATEWAY --> NOTIFY
    GATEWAY --> WEBSOCKET

    %% Service Interconnections
    AUTH -.->|Validates| USER
    AUTH -.->|Validates| TRIP
    AUTH -.->|Validates| PAYMENT
    
    TRIP -.->|Updates| LOCATION
    TRIP -.->|Triggers| NOTIFY
    TRIP -.->|Processes| PAYMENT
    
    USER -.->|Manages| FILES
    NOTIFY -.->|Queues| QUEUE
    LOCATION -.->|Broadcasts| WEBSOCKET

    %% Database Connections
    AUTH --> POSTGRES
    USER --> POSTGRES
    TRIP --> POSTGRES
    PAYMENT --> POSTGRES
    LOCATION --> POSTGRES
    
    AUTH -.->|Cache| REDIS
    USER -.->|Cache| REDIS
    WEBSOCKET -.->|Pub/Sub| REDIS

    %% External Connections
    NOTIFY -.->|SMS| SMS_GATEWAY
    PAYMENT -.->|Process| PAYMENT_GW
    LOCATION -.->|Geocoding| MAPS
    NOTIFY -.->|Push| PUSH

    %% Styling
    classDef clientStyle fill:#ff6b6b,stroke:#ff4757,stroke-width:3px,color:#fff
    classDef gatewayStyle fill:#3742fa,stroke:#2f3542,stroke-width:2px,color:#fff
    classDef serviceStyle fill:#2ed573,stroke:#20bf6b,stroke-width:2px,color:#fff
    classDef dataStyle fill:#ffa502,stroke:#ff6348,stroke-width:2px,color:#fff
    classDef externalStyle fill:#a55eea,stroke:#8854d0,stroke-width:2px,color:#fff

    class MOBILE,WEB,API_CLIENTS clientStyle
    class LB,GATEWAY,CDN gatewayStyle
    class AUTH,USER,TRIP,PAYMENT,LOCATION,NOTIFY,WEBSOCKET serviceStyle
    class POSTGRES,REDIS,QUEUE,FILES dataStyle
    class SMS_GATEWAY,PAYMENT_GW,MAPS,PUSH externalStyle
```

### **Architectural Principles**

#### **1. Microservices Architecture**
- **Modular Design**: Each service handles specific business domain
- **Loose Coupling**: Services communicate via well-defined APIs
- **Independent Deployment**: Services can be deployed independently
- **Technology Diversity**: Each service can use optimal technology stack

#### **2. Event-Driven Architecture**
- **Asynchronous Processing**: Non-blocking operations for better performance
- **Event Sourcing**: Complete audit trail of system changes
- **Real-time Updates**: WebSocket-based live communication
- **Scalable Messaging**: Redis pub/sub for inter-service communication

#### **3. Domain-Driven Design (DDD)**
- **Business-Centric**: Code structure reflects business domains
- **Bounded Contexts**: Clear service boundaries
- **Ubiquitous Language**: Consistent terminology across system
- **Aggregate Patterns**: Data consistency within business boundaries

---

## 🏢 System Components

### **Core Services Architecture**

```mermaid
%%{init: {
  'theme': 'dark',
  'themeVariables': {
    'primaryColor': '#4834d4',
    'primaryTextColor': '#ffffff',
    'primaryBorderColor': '#3742fa',
    'lineColor': '#ff6b6b',
    'secondaryColor': '#00d2d3',
    'tertiaryColor': '#ffa502',
    'background': '#1e1e1e',
    'mainBkg': '#2f3542',
    'secondBkg': '#57606f',
    'tertiaryBkg': '#747d8c'
  }
}}%%

graph LR
    subgraph "🔐 Authentication Domain"
        A1[🎮 Auth Controller<br/>Login/Register/OTP]
        A2[⚙️ Auth Service<br/>Business Logic]
        A3[🔑 JWT Strategy<br/>Token Validation]
        A4[📱 OTP Service<br/>SMS Verification]
    end
    
    subgraph "👤 User Management Domain"
        U1[🎮 User Controller<br/>Profile Management]
        U2[⚙️ User Service<br/>User Operations]
        U3[📋 Profile Service<br/>Driver Verification]
        U4[💼 Wallet Service<br/>Balance Management]
    end
    
    subgraph "🚗 Trip Management Domain"
        T1[🎮 Trip Controller<br/>Booking API]
        T2[⚙️ Trip Service<br/>Trip Logic]
        T3[🔍 Matching Service<br/>Driver Assignment]
        T4[📊 Tracking Service<br/>Real-time Updates]
    end
    
    subgraph "💰 Payment Domain"
        P1[🎮 Payment Controller<br/>Transaction API]
        P2[⚙️ Payment Service<br/>Payment Logic]
        P3[🏦 Gateway Service<br/>EBS/CyberPay]
        P4[💳 Wallet Service<br/>Balance Operations]
    end
    
    subgraph "📍 Location Domain"
        L1[🎮 Location Controller<br/>GPS API]
        L2[⚙️ Location Service<br/>Geospatial Logic]
        L3[🗺️ Maps Service<br/>Routing & Geocoding]
        L4[📡 Tracking Service<br/>Real-time Location]
    end

    %% Inter-domain connections
    A2 -.->|Validates| U2
    A2 -.->|Validates| T2
    A2 -.->|Validates| P2
    
    T2 -.->|Updates| L2
    T2 -.->|Processes| P2
    P2 -.->|Updates| U4
    L2 -.->|Broadcasts| T4

    %% Styling
    classDef authStyle fill:#4834d4,stroke:#3742fa,stroke-width:3px,color:#fff
    classDef userStyle fill:#2ed573,stroke:#20bf6b,stroke-width:2px,color:#fff
    classDef tripStyle fill:#ff6b6b,stroke:#ff4757,stroke-width:2px,color:#fff
    classDef paymentStyle fill:#ffa502,stroke:#ff6348,stroke-width:2px,color:#fff
    classDef locationStyle fill:#a55eea,stroke:#8854d0,stroke-width:2px,color:#fff

    class A1,A2,A3,A4 authStyle
    class U1,U2,U3,U4 userStyle
    class T1,T2,T3,T4 tripStyle
    class P1,P2,P3,P4 paymentStyle
    class L1,L2,L3,L4 locationStyle
```

---

## 🔄 Data Flow Architecture

### **Request Processing Flow**

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#26de81',
    'primaryTextColor': '#ffffff',
    'primaryBorderColor': '#20bf6b',
    'lineColor': '#3742fa',
    'secondaryColor': '#ff6b6b',
    'tertiaryColor': '#ffa502',
    'background': '#1e1e1e',
    'mainBkg': '#2f3542',
    'secondBkg': '#57606f',
    'tertiaryBkg': '#747d8c'
  }
}}%%

sequenceDiagram
    participant Client as 📱 Mobile App
    participant Gateway as 🚪 API Gateway
    participant Auth as 🔐 Auth Service
    participant Service as ⚙️ Business Service
    participant Cache as ⚡ Redis Cache
    participant DB as 🗄️ PostgreSQL
    participant Queue as 📬 Message Queue
    participant External as 🌐 External API

    Client->>Gateway: HTTP Request
    Gateway->>Auth: Validate JWT Token
    Auth-->>Gateway: Token Valid ✅
    
    Gateway->>Service: Process Request
    Service->>Cache: Check Cache
    
    alt Cache Hit
        Cache-->>Service: Return Cached Data
    else Cache Miss
        Service->>DB: Query Database
        DB-->>Service: Return Data
        Service->>Cache: Update Cache
    end
    
    Service->>Queue: Queue Background Job
    Service->>External: Call External API
    External-->>Service: API Response
    
    Service-->>Gateway: Response Data
    Gateway-->>Client: HTTP Response
    
    Note over Queue: Background Processing
    Queue->>Service: Process Job
    Service->>DB: Update Database
```

---

## 🗄️ Database Design

### **Entity Relationship Overview**

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#fd79a8',
    'primaryTextColor': '#ffffff',
    'primaryBorderColor': '#e84393',
    'lineColor': '#3742fa',
    'secondaryColor': '#00d2d3',
    'tertiaryColor': '#ffa502',
    'background': '#1e1e1e',
    'mainBkg': '#2f3542',
    'secondBkg': '#57606f',
    'tertiaryBkg': '#747d8c'
  }
}}%%

erDiagram
    USERS {
        uuid id PK
        string email UK
        string phone UK
        string password_hash
        enum role
        enum status
        timestamp created_at
    }
    
    WALLETS {
        uuid id PK
        uuid user_id FK
        decimal balance
        enum status
        timestamp created_at
    }
    
    TRIPS {
        uuid id PK
        uuid passenger_id FK
        uuid driver_id FK
        enum status
        decimal fare
        timestamp created_at
    }
    
    PAYMENTS {
        uuid id PK
        uuid trip_id FK
        decimal amount
        enum status
        timestamp created_at
    }
    
    RATINGS {
        uuid id PK
        uuid trip_id FK
        integer rating
        text comment
        timestamp created_at
    }

    USERS ||--|| WALLETS : "owns"
    USERS ||--o{ TRIPS : "passenger"
    USERS ||--o{ TRIPS : "driver"
    TRIPS ||--|| PAYMENTS : "payment"
    TRIPS ||--o{ RATINGS : "ratings"
```

---

## 🌐 API Architecture

### **RESTful API Design**

```mermaid
%%{init: {
  'theme': 'dark',
  'themeVariables': {
    'primaryColor': '#00d2d3',
    'primaryTextColor': '#ffffff',
    'primaryBorderColor': '#0097e6',
    'lineColor': '#ff6b6b',
    'secondaryColor': '#2ed573',
    'tertiaryColor': '#ffa502',
    'background': '#1e1e1e',
    'mainBkg': '#2f3542',
    'secondBkg': '#57606f',
    'tertiaryBkg': '#747d8c'
  }
}}%%

graph TD
    subgraph "🔐 Authentication APIs"
        AUTH_LOGIN[POST /auth/login<br/>User Login]
        AUTH_REGISTER[POST /auth/register<br/>User Registration]
        AUTH_OTP[POST /auth/verify-otp<br/>OTP Verification]
        AUTH_REFRESH[POST /auth/refresh<br/>Token Refresh]
    end
    
    subgraph "👤 User Management APIs"
        USER_PROFILE[GET /users/profile<br/>Get Profile]
        USER_UPDATE[PUT /users/profile<br/>Update Profile]
        USER_WALLET[GET /users/wallet<br/>Wallet Balance]
        USER_HISTORY[GET /users/trips<br/>Trip History]
    end
    
    subgraph "🚗 Trip Management APIs"
        TRIP_REQUEST[POST /trips/request<br/>Request Trip]
        TRIP_ACCEPT[POST /trips/:id/accept<br/>Accept Trip]
        TRIP_START[POST /trips/:id/start<br/>Start Trip]
        TRIP_COMPLETE[POST /trips/:id/complete<br/>Complete Trip]
        TRIP_CANCEL[POST /trips/:id/cancel<br/>Cancel Trip]
    end
    
    subgraph "💰 Payment APIs"
        PAY_PROCESS[POST /payments/process<br/>Process Payment]
        PAY_TOPUP[POST /payments/topup<br/>Wallet Top-up]
        PAY_HISTORY[GET /payments/history<br/>Payment History]
        PAY_REFUND[POST /payments/refund<br/>Process Refund]
    end

    %% Styling
    classDef authStyle fill:#00d2d3,stroke:#0097e6,stroke-width:2px,color:#fff
    classDef userStyle fill:#2ed573,stroke:#20bf6b,stroke-width:2px,color:#fff
    classDef tripStyle fill:#ff6b6b,stroke:#ff4757,stroke-width:2px,color:#fff
    classDef paymentStyle fill:#ffa502,stroke:#ff6348,stroke-width:2px,color:#fff

    class AUTH_LOGIN,AUTH_REGISTER,AUTH_OTP,AUTH_REFRESH authStyle
    class USER_PROFILE,USER_UPDATE,USER_WALLET,USER_HISTORY userStyle
    class TRIP_REQUEST,TRIP_ACCEPT,TRIP_START,TRIP_COMPLETE,TRIP_CANCEL tripStyle
    class PAY_PROCESS,PAY_TOPUP,PAY_HISTORY,PAY_REFUND paymentStyle
```

---

## ⚡ Real-time Communication

### **WebSocket Architecture**

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#a55eea',
    'primaryTextColor': '#ffffff',
    'primaryBorderColor': '#8854d0',
    'lineColor': '#ff6b6b',
    'secondaryColor': '#26de81',
    'tertiaryColor': '#ffa502',
    'background': '#1e1e1e',
    'mainBkg': '#2f3542',
    'secondBkg': '#57606f',
    'tertiaryBkg': '#747d8c'
  }
}}%%

graph TB
    subgraph "📱 Client Connections"
        PASSENGER[📱 Passenger App<br/>WebSocket Client]
        DRIVER[🚗 Driver App<br/>WebSocket Client]
        ADMIN[👨‍💼 Admin Dashboard<br/>WebSocket Client]
    end
    
    subgraph "⚡ WebSocket Gateway"
        WS_GATEWAY[🌐 Socket.IO Gateway<br/>Connection Manager]
        WS_AUTH[🔐 WebSocket Auth<br/>JWT Validation]
        WS_ROOMS[🏠 Room Manager<br/>Trip-based Channels]
    end
    
    subgraph "📡 Event Broadcasting"
        TRIP_EVENTS[🚗 Trip Events<br/>Status Updates]
        LOCATION_EVENTS[📍 Location Events<br/>GPS Updates]
        PAYMENT_EVENTS[💰 Payment Events<br/>Transaction Updates]
        NOTIFICATION_EVENTS[🔔 Notification Events<br/>Push Messages]
    end
    
    subgraph "🗄️ Event Storage"
        REDIS_PUB[📮 Redis Pub/Sub<br/>Event Distribution]
        EVENT_LOG[📝 Event Log<br/>Audit Trail]
    end

    %% Connections
    PASSENGER --> WS_GATEWAY
    DRIVER --> WS_GATEWAY
    ADMIN --> WS_GATEWAY
    
    WS_GATEWAY --> WS_AUTH
    WS_GATEWAY --> WS_ROOMS
    
    WS_ROOMS --> TRIP_EVENTS
    WS_ROOMS --> LOCATION_EVENTS
    WS_ROOMS --> PAYMENT_EVENTS
    WS_ROOMS --> NOTIFICATION_EVENTS
    
    TRIP_EVENTS --> REDIS_PUB
    LOCATION_EVENTS --> REDIS_PUB
    PAYMENT_EVENTS --> REDIS_PUB
    NOTIFICATION_EVENTS --> REDIS_PUB
    
    REDIS_PUB --> EVENT_LOG

    %% Styling
    classDef clientStyle fill:#a55eea,stroke:#8854d0,stroke-width:3px,color:#fff
    classDef gatewayStyle fill:#26de81,stroke:#20bf6b,stroke-width:2px,color:#fff
    classDef eventStyle fill:#ff6b6b,stroke:#ff4757,stroke-width:2px,color:#fff
    classDef storageStyle fill:#ffa502,stroke:#ff6348,stroke-width:2px,color:#fff

    class PASSENGER,DRIVER,ADMIN clientStyle
    class WS_GATEWAY,WS_AUTH,WS_ROOMS gatewayStyle
    class TRIP_EVENTS,LOCATION_EVENTS,PAYMENT_EVENTS,NOTIFICATION_EVENTS eventStyle
    class REDIS_PUB,EVENT_LOG storageStyle
```

---

## 🚀 Deployment Architecture

### **Production Deployment**

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#3742fa',
    'primaryTextColor': '#ffffff',
    'primaryBorderColor': '#2f3542',
    'lineColor': '#ff6b6b',
    'secondaryColor': '#2ed573',
    'tertiaryColor': '#ffa502',
    'background': '#1e1e1e',
    'mainBkg': '#2f3542',
    'secondBkg': '#57606f',
    'tertiaryBkg': '#747d8c'
  }
}}%%

graph TB
    subgraph "🌐 Global CDN"
        CDN[📡 CloudFlare CDN<br/>Static Assets & Caching]
    end
    
    subgraph "⚖️ Load Balancing"
        LB[🔄 Load Balancer<br/>Nginx/HAProxy]
        SSL[🔒 SSL Termination<br/>HTTPS/TLS]
    end
    
    subgraph "🏗️ Application Tier"
        APP1[🚀 App Instance 1<br/>NestJS Container]
        APP2[🚀 App Instance 2<br/>NestJS Container]
        APP3[🚀 App Instance 3<br/>NestJS Container]
    end
    
    subgraph "🗄️ Data Tier"
        PG_PRIMARY[🐘 PostgreSQL Primary<br/>Write Operations]
        PG_REPLICA[🐘 PostgreSQL Replica<br/>Read Operations]
        REDIS_CLUSTER[⚡ Redis Cluster<br/>Cache & Sessions]
    end
    
    subgraph "📊 Monitoring"
        PROMETHEUS[📈 Prometheus<br/>Metrics Collection]
        GRAFANA[📊 Grafana<br/>Dashboards]
        LOGS[📝 ELK Stack<br/>Log Aggregation]
    end

    %% Traffic Flow
    CDN --> LB
    LB --> SSL
    SSL --> APP1
    SSL --> APP2
    SSL --> APP3
    
    %% Database Connections
    APP1 --> PG_PRIMARY
    APP1 --> PG_REPLICA
    APP2 --> PG_PRIMARY
    APP2 --> PG_REPLICA
    APP3 --> PG_PRIMARY
    APP3 --> PG_REPLICA
    
    %% Cache Connections
    APP1 --> REDIS_CLUSTER
    APP2 --> REDIS_CLUSTER
    APP3 --> REDIS_CLUSTER
    
    %% Database Replication
    PG_PRIMARY -.->|Replication| PG_REPLICA
    
    %% Monitoring
    APP1 -.->|Metrics| PROMETHEUS
    APP2 -.->|Metrics| PROMETHEUS
    APP3 -.->|Metrics| PROMETHEUS
    
    PROMETHEUS --> GRAFANA
    
    APP1 -.->|Logs| LOGS
    APP2 -.->|Logs| LOGS
    APP3 -.->|Logs| LOGS

    %% Styling
    classDef cdnStyle fill:#3742fa,stroke:#2f3542,stroke-width:3px,color:#fff
    classDef lbStyle fill:#26de81,stroke:#20bf6b,stroke-width:2px,color:#fff
    classDef appStyle fill:#ff6b6b,stroke:#ff4757,stroke-width:2px,color:#fff
    classDef dataStyle fill:#ffa502,stroke:#ff6348,stroke-width:2px,color:#fff
    classDef monitorStyle fill:#a55eea,stroke:#8854d0,stroke-width:2px,color:#fff

    class CDN cdnStyle
    class LB,SSL lbStyle
    class APP1,APP2,APP3 appStyle
    class PG_PRIMARY,PG_REPLICA,REDIS_CLUSTER dataStyle
    class PROMETHEUS,GRAFANA,LOGS monitorStyle
```

---

This comprehensive architecture documentation provides the technical foundation for understanding, maintaining, and scaling the Sikka Transportation Platform with eye-catching, modern Mermaid diagrams that render perfectly with the latest version.

