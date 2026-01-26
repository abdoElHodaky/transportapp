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
    'primaryColor': '#0066cc',
    'primaryTextColor': '#ffffff',
    'primaryBorderColor': '#004499',
    'lineColor': '#0066cc',
    'secondaryColor': '#00ccaa',
    'tertiaryColor': '#e6f3ff',
    'background': '#ffffff',
    'mainBkg': '#0066cc',
    'secondBkg': '#00ccaa',
    'tertiaryBkg': '#e6f3ff'
  }
}}%%

graph TB
    %% Client Applications
    subgraph "📱 Client Applications"
        MOBILE[📱 Mobile Apps<br/>🚗 Passenger & Driver<br/>📱 React Native]
        WEB[🌐 Web Dashboard<br/>👨‍💼 Admin Panel<br/>⚛️ React/Next.js]
        API_CLIENTS[🔌 API Clients<br/>🔗 Third-party Integrations<br/>🌐 REST/GraphQL]
    end
    
    %% Gateway Layer
    subgraph "🚪 Gateway & Load Balancing"
        LB[⚖️ Load Balancer<br/>🌐 Nginx/HAProxy<br/>🔒 SSL Termination]
        GATEWAY[🚪 API Gateway<br/>🛡️ Rate Limiting & Auth<br/>📊 Request Routing]
        CDN[📡 CDN<br/>⚡ Static Assets<br/>🌍 Global Distribution]
    end
    
    %% Core Services
    subgraph "🏗️ Core Backend Services"
        AUTH[🔐 Authentication<br/>🔑 JWT + OTP<br/>📱 Phone Verification]
        USER[👤 User Management<br/>📋 Profiles & Verification<br/>📄 Document Processing]
        TRIP[🚗 Trip Service<br/>📍 Booking & Tracking<br/>🎯 Driver Matching]
        PAYMENT[💰 Payment Service<br/>🏦 Multi-gateway Support<br/>💳 Wallet Management]
        LOCATION[📍 Location Service<br/>🛰️ GPS & Routing<br/>🗺️ Geospatial Queries]
        NOTIFY[🔔 Notification Service<br/>📨 Multi-channel Delivery<br/>📬 Queue Processing]
        WEBSOCKET[⚡ WebSocket Gateway<br/>🔄 Real-time Updates<br/>💬 Live Communication]
    end
    
    %% Data Layer
    subgraph "🗄️ Data & Storage Layer"
        POSTGRES[🐘 PostgreSQL<br/>📊 Primary Database<br/>🌍 PostGIS Extension]
        REDIS[⚡ Redis<br/>💾 Cache & Sessions<br/>📡 Pub/Sub Messaging]
        QUEUE[📬 Message Queue<br/>⚙️ Background Jobs<br/>🔄 Async Processing]
        FILES[📁 File Storage<br/>☁️ AWS S3/Local<br/>📎 Documents & Media]
    end
    
    %% External Services
    subgraph "🌐 External Integrations"
        SMS_GATEWAY[📱 SMS Providers<br/>📞 Twilio/AWS SNS<br/>🇸🇩 Local Providers]
        PAYMENT_GW[💳 Payment Gateways<br/>🏦 EBS Bank<br/>💰 CyberPay Sudan]
        MAPS[🗺️ Mapping Services<br/>🌍 Google Maps<br/>🗺️ OpenStreetMap]
        PUSH[🔔 Push Services<br/>🔥 Firebase FCM<br/>🍎 Apple APNs]
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
    AUTH -.->|🔍 Validates| USER
    AUTH -.->|🔍 Validates| TRIP
    AUTH -.->|🔍 Validates| PAYMENT
    
    TRIP -.->|📍 Updates| LOCATION
    TRIP -.->|🔔 Triggers| NOTIFY
    TRIP -.->|💰 Processes| PAYMENT
    
    USER -.->|📁 Manages| FILES
    NOTIFY -.->|📬 Queues| QUEUE
    LOCATION -.->|📡 Broadcasts| WEBSOCKET

    %% Database Connections
    AUTH --> POSTGRES
    USER --> POSTGRES
    TRIP --> POSTGRES
    PAYMENT --> POSTGRES
    LOCATION --> POSTGRES
    
    AUTH -.->|💾 Cache| REDIS
    USER -.->|💾 Cache| REDIS
    WEBSOCKET -.->|📡 Pub/Sub| REDIS

    %% External Connections
    NOTIFY -.->|📱 SMS| SMS_GATEWAY
    PAYMENT -.->|💳 Process| PAYMENT_GW
    LOCATION -.->|🗺️ Geocoding| MAPS
    NOTIFY -.->|🔔 Push| PUSH

    %% Eye-catching Architecture Styling
    classDef clientLayer fill:#0066cc,stroke:#004499,stroke-width:4px,color:#ffffff,font-weight:bold
    classDef gatewayLayer fill:#00ccaa,stroke:#008899,stroke-width:4px,color:#ffffff,font-weight:bold
    classDef serviceLayer fill:#0088ff,stroke:#0066cc,stroke-width:4px,color:#ffffff,font-weight:bold
    classDef dataLayer fill:#4d79a4,stroke:#2e5984,stroke-width:4px,color:#ffffff,font-weight:bold
    classDef externalLayer fill:#7fb3d3,stroke:#5f9fc3,stroke-width:3px,color:#ffffff,font-weight:bold

    class MOBILE,WEB,API_CLIENTS clientLayer
    class LB,GATEWAY,CDN gatewayLayer
    class AUTH,USER,TRIP,PAYMENT,LOCATION,NOTIFY,WEBSOCKET serviceLayer
    class POSTGRES,REDIS,QUEUE,FILES dataLayer
    class SMS_GATEWAY,PAYMENT_GW,MAPS,PUSH externalLayer
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
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#0066cc',
    'primaryTextColor': '#ffffff',
    'primaryBorderColor': '#004499',
    'lineColor': '#0066cc',
    'secondaryColor': '#00ccaa',
    'tertiaryColor': '#e6f3ff',
    'background': '#ffffff',
    'mainBkg': '#0066cc',
    'secondBkg': '#00ccaa',
    'tertiaryBkg': '#e6f3ff'
  }
}}%%

graph LR
    subgraph "🔐 Authentication Domain"
        A1[🎮 Auth Controller<br/>🔑 Login/Register/OTP<br/>📱 Phone Verification]
        A2[⚙️ Auth Service<br/>🧠 Business Logic<br/>🔒 Security Rules]
        A3[🔑 JWT Strategy<br/>🛡️ Token Validation<br/>⏰ Expiry Management]
        A4[📱 OTP Service<br/>📞 SMS Verification<br/>🔢 Code Generation]
    end
    
    subgraph "👤 User Management Domain"
        U1[🎮 User Controller<br/>👤 Profile Management<br/>📋 CRUD Operations]
        U2[⚙️ User Service<br/>👥 User Operations<br/>🔍 Search & Filter]
        U3[📋 Profile Service<br/>🚗 Driver Verification<br/>📄 Document Processing]
        U4[💼 Wallet Service<br/>💰 Balance Management<br/>💳 Transaction History]
    end
    
    subgraph "🚗 Trip Management Domain"
        T1[🎮 Trip Controller<br/>📍 Booking API<br/>🔄 Status Updates]
        T2[⚙️ Trip Service<br/>🧠 Trip Logic<br/>📊 State Management]
        T3[🔍 Matching Service<br/>🎯 Driver Assignment<br/>📡 Proximity Search]
        T4[📊 Tracking Service<br/>📍 Real-time Updates<br/>🗺️ Route Monitoring]
    end
    
    subgraph "💰 Payment Domain"
        P1[🎮 Payment Controller<br/>💳 Transaction API<br/>📊 Payment Status]
        P2[⚙️ Payment Service<br/>💰 Payment Logic<br/>🔄 Processing Rules]
        P3[🏦 Gateway Service<br/>🇸🇩 EBS/CyberPay<br/>🔗 API Integration]
        P4[💳 Wallet Service<br/>💰 Balance Operations<br/>📈 Transaction Logs]
    end
    
    subgraph "📍 Location Domain"
        L1[🎮 Location Controller<br/>🛰️ GPS API<br/>📍 Coordinate Management]
        L2[⚙️ Location Service<br/>🌍 Geospatial Logic<br/>📏 Distance Calculations]
        L3[🗺️ Maps Service<br/>🛣️ Routing & Geocoding<br/>🌍 Address Resolution]
        L4[📡 Tracking Service<br/>📍 Real-time Location<br/>🔄 Position Updates]
    end

    %% Inter-domain connections
    A2 -.->|🔍 Validates| U2
    A2 -.->|🔍 Validates| T2
    A2 -.->|🔍 Validates| P2
    
    T2 -.->|📍 Updates| L2
    T2 -.->|💰 Processes| P2
    P2 -.->|💳 Updates| U4
    L2 -.->|📡 Broadcasts| T4

    %% Eye-catching Architecture Domain Styling
    classDef authDomain fill:#0066cc,stroke:#004499,stroke-width:4px,color:#ffffff,font-weight:bold
    classDef userDomain fill:#00ccaa,stroke:#008899,stroke-width:4px,color:#ffffff,font-weight:bold
    classDef tripDomain fill:#0088ff,stroke:#0066cc,stroke-width:4px,color:#ffffff,font-weight:bold
    classDef paymentDomain fill:#4d79a4,stroke:#2e5984,stroke-width:4px,color:#ffffff,font-weight:bold
    classDef locationDomain fill:#7fb3d3,stroke:#5f9fc3,stroke-width:4px,color:#ffffff,font-weight:bold

    class A1,A2,A3,A4 authDomain
    class U1,U2,U3,U4 userDomain
    class T1,T2,T3,T4 tripDomain
    class P1,P2,P3,P4 paymentDomain
    class L1,L2,L3,L4 locationDomain
```

---

## 🔄 Data Flow Architecture

### **Request Processing Flow**

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#6A4C93',
    'primaryTextColor': '#ffffff',
    'primaryBorderColor': '#4a3269',
    'lineColor': '#9D7FFF',
    'secondaryColor': '#E6CCFF',
    'tertiaryColor': '#C8A2C8',
    'background': '#ffffff',
    'mainBkg': '#6A4C93',
    'secondBkg': '#9D7FFF',
    'tertiaryBkg': '#E6CCFF'
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

    Client->>Gateway: 📤 HTTP Request
    Gateway->>Auth: 🔍 Validate JWT Token
    Auth-->>Gateway: ✅ Token Valid
    
    Gateway->>Service: ⚙️ Process Request
    Service->>Cache: 🔍 Check Cache
    
    alt 💾 Cache Hit
        Cache-->>Service: 📊 Return Cached Data
    else ❌ Cache Miss
        Service->>DB: 🔍 Query Database
        DB-->>Service: 📊 Return Data
        Service->>Cache: 💾 Update Cache
    end
    
    Service->>Queue: 📬 Queue Background Job
    Service->>External: 🌐 Call External API
    External-->>Service: 📡 API Response
    
    Service-->>Gateway: 📊 Response Data
    Gateway-->>Client: 📱 HTTP Response
    
    Note over Queue: 🔄 Background Processing
    Queue->>Service: ⚙️ Process Job
    Service->>DB: 💾 Update Database
```

---

## 🗄️ Database Design

### **Entity Relationship Overview**

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#455A64',
    'primaryTextColor': '#ffffff',
    'primaryBorderColor': '#263238',
    'lineColor': '#607D8B',
    'secondaryColor': '#90A4AE',
    'tertiaryColor': '#ECEFF1',
    'background': '#ffffff',
    'mainBkg': '#455A64',
    'secondBkg': '#90A4AE',
    'tertiaryBkg': '#ECEFF1'
  }
}}%%

erDiagram
    USERS {
        uuid id PK "🔑 Primary Key"
        string email UK "📧 Unique Email"
        string phone UK "📱 Unique Phone"
        string password_hash "🔒 Encrypted Password"
        enum role "👤 User Role (passenger/driver/admin)"
        enum status "📊 Account Status"
        timestamp created_at "📅 Registration Date"
        timestamp updated_at "🔄 Last Modified"
    }
    
    WALLETS {
        uuid id PK "🔑 Primary Key"
        uuid user_id FK "👤 User Reference"
        decimal balance "💰 Current Balance (SDG)"
        enum status "📊 Wallet Status"
        timestamp created_at "📅 Creation Date"
        timestamp updated_at "🔄 Last Transaction"
    }
    
    TRIPS {
        uuid id PK "🔑 Primary Key"
        uuid passenger_id FK "👤 Passenger Reference"
        uuid driver_id FK "🚗 Driver Reference"
        enum status "📊 Trip Status"
        decimal fare "💰 Trip Cost (SDG)"
        point pickup_location "📍 Pickup Coordinates"
        point destination_location "🎯 Destination Coordinates"
        timestamp created_at "📅 Booking Time"
        timestamp started_at "🚀 Trip Start Time"
        timestamp completed_at "🏁 Trip End Time"
    }
    
    PAYMENTS {
        uuid id PK "🔑 Primary Key"
        uuid trip_id FK "🚗 Trip Reference"
        decimal amount "💰 Payment Amount"
        enum status "📊 Payment Status"
        enum method "💳 Payment Method"
        string gateway_reference "🏦 Gateway Transaction ID"
        timestamp created_at "📅 Payment Time"
        timestamp processed_at "✅ Processing Time"
    }
    
    RATINGS {
        uuid id PK "🔑 Primary Key"
        uuid trip_id FK "🚗 Trip Reference"
        uuid rater_id FK "👤 Rating User"
        uuid rated_id FK "👤 Rated User"
        integer rating "⭐ Rating (1-5)"
        text comment "💬 Review Comment"
        timestamp created_at "📅 Rating Date"
    }

    USERS ||--|| WALLETS : "💰 owns"
    USERS ||--o{ TRIPS : "👤 passenger"
    USERS ||--o{ TRIPS : "🚗 driver"
    TRIPS ||--|| PAYMENTS : "💳 payment"
    TRIPS ||--o{ RATINGS : "⭐ ratings"
    USERS ||--o{ RATINGS : "👤 gives_rating"
    USERS ||--o{ RATINGS : "👤 receives_rating"
```

---

## 🌐 API Architecture

### **RESTful API Design**

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#0066cc',
    'primaryTextColor': '#ffffff',
    'primaryBorderColor': '#004499',
    'lineColor': '#0066cc',
    'secondaryColor': '#00ccaa',
    'tertiaryColor': '#e6f3ff',
    'background': '#ffffff',
    'mainBkg': '#0066cc',
    'secondBkg': '#00ccaa',
    'tertiaryBkg': '#e6f3ff'
  }
}}%%

graph TD
    subgraph "🔐 Authentication APIs"
        AUTH_LOGIN[POST /auth/login<br/>🔑 User Login<br/>📱 Phone + Password]
        AUTH_REGISTER[POST /auth/register<br/>👤 User Registration<br/>📞 Phone Verification]
        AUTH_OTP[POST /auth/verify-otp<br/>🔢 OTP Verification<br/>✅ Account Activation]
        AUTH_REFRESH[POST /auth/refresh<br/>🔄 Token Refresh<br/>🔑 JWT Renewal]
    end
    
    subgraph "👤 User Management APIs"
        USER_PROFILE[GET /users/profile<br/>👤 Get Profile<br/>📋 User Details]
        USER_UPDATE[PUT /users/profile<br/>✏️ Update Profile<br/>📄 Document Upload]
        USER_WALLET[GET /users/wallet<br/>💰 Wallet Balance<br/>📊 Transaction History]
        USER_HISTORY[GET /users/trips<br/>🚗 Trip History<br/>📈 Usage Statistics]
    end
    
    subgraph "🚗 Trip Management APIs"
        TRIP_REQUEST[POST /trips/request<br/>📍 Request Trip<br/>🎯 Destination Selection]
        TRIP_ACCEPT[POST /trips/:id/accept<br/>✅ Accept Trip<br/>🚗 Driver Assignment]
        TRIP_START[POST /trips/:id/start<br/>🚀 Start Trip<br/>📊 Real-time Tracking]
        TRIP_COMPLETE[POST /trips/:id/complete<br/>🏁 Complete Trip<br/>💳 Payment Processing]
        TRIP_CANCEL[POST /trips/:id/cancel<br/>❌ Cancel Trip<br/>💰 Refund Processing]
    end
    
    subgraph "💰 Payment APIs"
        PAY_PROCESS[POST /payments/process<br/>💳 Process Payment<br/>🏦 Gateway Integration]
        PAY_TOPUP[POST /payments/topup<br/>💰 Wallet Top-up<br/>🔄 Balance Update]
        PAY_HISTORY[GET /payments/history<br/>📊 Payment History<br/>📈 Financial Reports]
        PAY_REFUND[POST /payments/refund<br/>🔄 Process Refund<br/>💰 Balance Restoration]
    end

    %% Eye-catching Architecture API Styling
    classDef authAPI fill:#0066cc,stroke:#004499,stroke-width:4px,color:#ffffff,font-weight:bold
    classDef userAPI fill:#00ccaa,stroke:#008899,stroke-width:4px,color:#ffffff,font-weight:bold
    classDef tripAPI fill:#0088ff,stroke:#0066cc,stroke-width:4px,color:#ffffff,font-weight:bold
    classDef paymentAPI fill:#4d79a4,stroke:#2e5984,stroke-width:4px,color:#ffffff,font-weight:bold

    class AUTH_LOGIN,AUTH_REGISTER,AUTH_OTP,AUTH_REFRESH authAPI
    class USER_PROFILE,USER_UPDATE,USER_WALLET,USER_HISTORY userAPI
    class TRIP_REQUEST,TRIP_ACCEPT,TRIP_START,TRIP_COMPLETE,TRIP_CANCEL tripAPI
    class PAY_PROCESS,PAY_TOPUP,PAY_HISTORY,PAY_REFUND paymentAPI
```

---

## ⚡ Real-time Communication

### **WebSocket Architecture**

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#0066cc',
    'primaryTextColor': '#ffffff',
    'primaryBorderColor': '#004499',
    'lineColor': '#0066cc',
    'secondaryColor': '#00ccaa',
    'tertiaryColor': '#e6f3ff',
    'background': '#ffffff',
    'mainBkg': '#0066cc',
    'secondBkg': '#00ccaa',
    'tertiaryBkg': '#e6f3ff'
  }
}}%%

graph TB
    subgraph "📱 Client Connections"
        PASSENGER[📱 Passenger App<br/>⚡ WebSocket Client<br/>🔄 Real-time Updates]
        DRIVER[🚗 Driver App<br/>⚡ WebSocket Client<br/>📍 Location Broadcasting]
        ADMIN[👨‍💼 Admin Dashboard<br/>⚡ WebSocket Client<br/>📊 System Monitoring]
    end
    
    subgraph "⚡ WebSocket Gateway"
        WS_GATEWAY[🌐 Socket.IO Gateway<br/>🔗 Connection Manager<br/>⚖️ Load Balancing]
        WS_AUTH[🔐 WebSocket Auth<br/>🔑 JWT Validation<br/>👤 User Authorization]
        WS_ROOMS[🏠 Room Manager<br/>🚗 Trip-based Channels<br/>📡 Event Routing]
    end
    
    subgraph "📡 Event Broadcasting"
        TRIP_EVENTS[🚗 Trip Events<br/>📊 Status Updates<br/>🔄 State Changes]
        LOCATION_EVENTS[📍 Location Events<br/>🛰️ GPS Updates<br/>🗺️ Route Tracking]
        PAYMENT_EVENTS[💰 Payment Events<br/>💳 Transaction Updates<br/>💰 Balance Changes]
        NOTIFICATION_EVENTS[🔔 Notification Events<br/>📱 Push Messages<br/>📧 System Alerts]
    end
    
    subgraph "🗄️ Event Storage & Distribution"
        REDIS_PUB[📮 Redis Pub/Sub<br/>⚡ Event Distribution<br/>🔄 Message Queuing]
        EVENT_LOG[📝 Event Log<br/>📊 Audit Trail<br/>🔍 System Analytics]
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

    %% Eye-catching Architecture WebSocket Styling
    classDef clientConnections fill:#0066cc,stroke:#004499,stroke-width:4px,color:#ffffff,font-weight:bold
    classDef websocketGateway fill:#00ccaa,stroke:#008899,stroke-width:4px,color:#ffffff,font-weight:bold
    classDef eventBroadcasting fill:#0088ff,stroke:#0066cc,stroke-width:4px,color:#ffffff,font-weight:bold
    classDef eventStorage fill:#4d79a4,stroke:#2e5984,stroke-width:4px,color:#ffffff,font-weight:bold

    class PASSENGER,DRIVER,ADMIN clientConnections
    class WS_GATEWAY,WS_AUTH,WS_ROOMS websocketGateway
    class TRIP_EVENTS,LOCATION_EVENTS,PAYMENT_EVENTS,NOTIFICATION_EVENTS eventBroadcasting
    class REDIS_PUB,EVENT_LOG eventStorage
```

---

## 🚀 Deployment Architecture

### **Production Deployment**

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#1a237e',
    'primaryTextColor': '#ffffff',
    'primaryBorderColor': '#0d47a1',
    'lineColor': '#5c6bc0',
    'secondaryColor': '#00bfa5',
    'tertiaryColor': '#f5f7fa',
    'mainBkg': '#1a237e',
    'nodeBorder': '#303f9f',
    'clusterBkg': '#f8f9fa',
    'clusterBorder': '#dee2e6'
  }
}}%%

graph TB
    %% Global Edge Section
    subgraph EDGE ["🌐 EDGE DELIVERY"]
        CDN(["📡 <b>CloudFlare Edge</b><br/><i>Anycast Network • WAF • Cache</i>"])
    end

    %% Security & Routing Section
    subgraph GATEWAY ["⚖️ TRAFFIC MANAGEMENT"]
        LB{{"🔄 <b>High Availability LB</b><br/>Nginx Plus"}}
        SSL["🔒 <b>SSL/TLS Termination</b><br/>Cert-Manager / Let's Encrypt"]
    end
    
    %% Application Cluster
    subgraph APP_TIER ["🏗️ APPLICATION CLUSTER (K8s/Docker)"]
        direction LR
        APP1["🚀 <b>Node Instance A</b><br/>NestJS v10"]
        APP2["🚀 <b>Node Instance B</b><br/>NestJS v10"]
        APP3["🚀 <b>Node Instance C</b><br/>NestJS v10"]
    end
    
    %% Storage Tier
    subgraph DATA_TIER ["🗄️ PERSISTENCE & CACHE"]
        direction TB
        subgraph DB_POOL ["🐘 Database Cluster"]
            PG_PRIMARY[("写入 <b>PostgreSQL Primary</b><br/>Master Node")]
            PG_REPLICA[("读取 <b>PostgreSQL Replica</b><br/>Read-Only Slave")]
        end
        REDIS_CLUSTER[["⚡ <b>Redis Cluster</b><br/>Shared Sessions / Distributed Cache"]]
    end
    
    %% Observability
    subgraph OBS_TIER ["📊 OBSERVABILITY STACK"]
        PROMETHEUS["📈 <b>Prometheus</b><br/>TSDB Metrics"]
        GRAFANA["🖼️ <b>Grafana</b><br/>Visual Dashboards"]
        LOGS["🔍 <b>ELK / Loki</b><br/>Centralized Logging"]
    end

    %% Traffic Connections
    CDN ==>|HTTPS/2| LB
    LB --> SSL
    SSL ==> APP1 & APP2 & APP3
    
    %% Data Flow
    APP1 & APP2 & APP3 --- REDIS_CLUSTER
    APP1 & APP2 & APP3 --> PG_PRIMARY
    APP1 & APP2 & APP3 -.-> PG_REPLICA
    
    %% Replication Link
    PG_PRIMARY -.->|Binary Replication| PG_REPLICA
    
    %% Telemetry Flow
    APP1 & APP2 & APP3 -.->|Scrape| PROMETHEUS
    APP1 & APP2 & APP3 -.->|Stream| LOGS
    PROMETHEUS --> GRAFANA

    %% Advanced Styling Classes
    classDef edgeClass fill:#1a237e,stroke:#0d47a1,stroke-width:2px,color:#fff
    classDef gatewayClass fill:#00bfa5,stroke:#00897b,stroke-width:2px,color:#fff
    classDef appClass fill:#2979ff,stroke:#1565c0,stroke-width:2px,color:#fff
    classDef dbClass fill:#37474f,stroke:#263238,stroke-width:2px,color:#fff
    classDef obsClass fill:#eceff1,stroke:#b0bec5,stroke-width:2px,color:#37474f

    class CDN edgeClass
    class LB,SSL gatewayClass
    class APP1,APP2,APP3 appClass
    class PG_PRIMARY,PG_REPLICA,REDIS_CLUSTER dbClass
    class PROMETHEUS,GRAFANA,LOGS obsClass
```

---

This comprehensive architecture documentation provides the technical foundation for understanding, maintaining, and scaling the Sikka Transportation Platform with eye-catching, modern Mermaid diagrams that render perfectly with the latest version.
