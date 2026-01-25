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
    "theme": "dark",
    "themeVariables": {
    "primaryColor": "#0d1117",
    "primaryTextColor": "#58a6ff",
    "primaryBorderColor": "#58a6ff",
    "lineColor": "#58a6ff"
    },
    "flowchart": {
    "useMaxWidth": true,
    "htmlLabels": true
    }
    }}%%
graph TB
    subgraph """"Client" Layer"
        A["Passenger Mobile App"]
        B["Driver Mobile App"]
        C["Admin Web Dashboard"]
    end
    
    subgraph """"API" Gateway Layer"
        D["Load Balancer"]
        E["API Gateway"]
        F["Rate Limiter"]
    end
    
    subgraph """"Application" Layer"
        G["Authentication Service"]
        H["Trip Management Service"]
        I["Payment Service"]
        J["User Service"]
        K["Notification Service"]
        L["Location Service"]
        M["WebSocket Gateway"]
    end
    
    subgraph """"Data" Layer"
        N["(PostgreSQL)"]
        O["(Redis Cache)"]
        P["File Storage"]
    end
    
    subgraph """"External" Services"
        Q["EBS Payment Gateway"]
        R["CyberPay Gateway"]
        S["SMS Service"]
        T["Maps API"]
        U["Push Notifications"]
    end
    
    A --> D
    B --> D
    C --> D
    D --> E
    E --> F
    F --> G
    F --> H
    F --> I
    F --> J
    F --> K
    F --> L
    F --> M
    
    G --> N
    H --> N
    I --> N
    J --> N
    K --> N
    L --> N
    
    G --> O
    H --> O
    I --> O
    J --> O
    
    I --> Q
    I --> R
    K --> S
    L --> T
    K --> U
    
    J --> P

    %%  --- DARK GRADIENT & GLOW STYLING ---
    
    %%  Main Dashboard (Neon Cyan/Blue)
    classDef main fill : #0d1117, stroke:#58a6ff, stroke-width: 4px,color:#58a6ff,font-weight: bold;
    
    
    %%  Decision Diamond (Gold Glow)
    classDef decision fill : #161b22, stroke:#d29922, color:#d29922,stroke-dasharray: 5 5;
    
    
    %%  Revenue (Emerald Gradient Style)
    classDef revNode fill : #04190b, stroke:#3fb950, color:#aff5b4,stroke-width: 2px;
    
    
    %%  Commission (Purple Gradient Style)
    classDef commNode fill : #12101e, stroke:#bc8cff, color:#e2c5ff,stroke-width: 2px;
    
    
    %%  Refund (Ruby Gradient Style)
    classDef refNode fill : #1a0b0b, stroke:#ff7b72, color:#ffa198,stroke-width: 2px;
    
    
    %%  Earnings (Sapphire Gradient Style)
    classDef earnNode fill : #051221, stroke:#388bfd, color:#a5d6ff,stroke-width: 2px;
    

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
    class O revNode;
    class P commNode;
    class Q refNode;
    class R earnNode;
    class S main;
    class T decision;
    class U revNode;

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
graph LR
    subgraph """"Authentication" Domain"
        A1["Auth Controller"]
        A2["Auth Service"]
        A3["JWT Strategy"]
        A4["OTP Service"]
    end
    
    subgraph """"User" Management Domain"
        U1["User Controller"]
        U2["User Service"]
        U3["Profile Service"]
        U4["Driver Verification"]
    end
    
    subgraph """"Trip" Management Domain"
        T1["Trip Controller"]
        T2["Trip Service"]
        T3["Matching Service"]
        T4["Fare Calculator"]
        T5["Route Optimizer"]
    end
    
    subgraph """"Payment" Domain"
        P1["Payment Controller"]
        P2["Payment Service"]
        P3["Wallet Service"]
        P4["Gateway Manager"]
        P5["Transaction Service"]
    end
    
    subgraph """"Location" Domain"
        L1["Location Controller"]
        L2["Location Service"]
        L3["Geospatial Service"]
        L4["Route Service"]
    end
    
    subgraph """"Notification" Domain"
        N1["Notification Controller"]
        N2["Notification Service"]
        N3["Push Service"]
        N4["SMS Service"]
        N5["Email Service"]
    end
    
    A1 --> A2
    A2 --> A3
    A2 --> A4
    
    U1 --> U2
    U2 --> U3
    U2 --> U4
    
    T1 --> T2
    T2 --> T3
    T2 --> T4
    T2 --> T5
    
    P1 --> P2
    P2 --> P3
    P2 --> P4
    P2 --> P5
    
    L1 --> L2
    L2 --> L3
    L2 --> L4
    
    N1 --> N2
    N2 --> N3
    N2 --> N4
    N2 --> N5

    %%  --- DARK GRADIENT & GLOW STYLING ---
    
    %%  Main Dashboard (Neon Cyan/Blue)
    classDef main fill : #0d1117, stroke:#58a6ff, stroke-width: 4px,color:#58a6ff,font-weight: bold;
    
    
    %%  Decision Diamond (Gold Glow)
    classDef decision fill : #161b22, stroke:#d29922, color:#d29922,stroke-dasharray: 5 5;
    
    
    %%  Revenue (Emerald Gradient Style)
    classDef revNode fill : #04190b, stroke:#3fb950, color:#aff5b4,stroke-width: 2px;
    
    
    %%  Commission (Purple Gradient Style)
    classDef commNode fill : #12101e, stroke:#bc8cff, color:#e2c5ff,stroke-width: 2px;
    
    
    %%  Refund (Ruby Gradient Style)
    classDef refNode fill : #1a0b0b, stroke:#ff7b72, color:#ffa198,stroke-width: 2px;
    
    
    %%  Earnings (Sapphire Gradient Style)
    classDef earnNode fill : #051221, stroke:#388bfd, color:#a5d6ff,stroke-width: 2px;
    

    class A1 main;
    class A2 decision;
    class A3 revNode;
    class A4 commNode;
    class L1 refNode;
    class L2 earnNode;
    class L3 main;
    class L4 decision;
    class N1 revNode;
    class N2 commNode;
    class N3 refNode;
    class N4 earnNode;
    class N5 main;
    class P1 decision;
    class P2 revNode;
    class P3 commNode;
    class P4 refNode;
    class P5 earnNode;
    class T1 main;
    class T2 decision;
    class T3 revNode;
    class T4 commNode;
    class T5 refNode;
    class U1 earnNode;
    class U2 main;
    class U3 decision;
    class U4 revNode;

```

### **Service Responsibilities**

#### **Authentication Service**
- **User Registration**: Phone-based registration with OTP
- **Authentication**: JWT token generation and validation
- **Authorization**: Role-based access control (RBAC)
- **Session Management**: Refresh token rotation
- **Security**: Rate limiting, brute force protection

#### **Trip Management Service**
- **Trip Lifecycle**: Request, matching, execution, completion
- **Driver Matching**: Intelligent algorithm based on location, rating, availability
- **Fare Calculation**: Dynamic pricing based on distance, time, demand
- **Route Optimization**: Efficient pickup and dropoff routing
- **Status Management**: Real-time trip status updates

#### **Payment Service**
- **Multi-Gateway Support**: EBS, CyberPay, Wallet, Cash
- **Transaction Processing**: Secure payment handling
- **Wallet Management**: Digital wallet with limits and controls
- **Commission Handling**: Automated platform fee collection
- **Refund Processing**: Automated and manual refund capabilities

#### **Location Service**
- **Real-time Tracking**: GPS-based location updates
- **Geospatial Queries**: Find nearby drivers, calculate distances
- **Route Planning**: Optimal route calculation
- **Location History**: Trip route tracking and storage
- **Geofencing**: Area-based notifications and restrictions

---

## 🔄 Data Flow Architecture

### **Request Processing Flow**

```mermaid
sequenceDiagram
    participant C as "Client"
    participant LB as "Load Balancer"
    participant AG as "API Gateway"
    participant RL as "Rate Limiter"
    participant AS as "Auth Service"
    participant BS as "Business Service"
    participant DB as "Database"
    participant Cache as "Redis"
    participant EXT as "External Service"
    
    C->>LB: HTTP Request
    LB->>AG: Route Request
    AG->>RL: Check Rate Limits
    RL->>AS: Validate JWT Token
    AS->>Cache: Check Token Cache
    Cache->>AS: Token Valid
    AS->>AG: Authentication Success
    AG->>BS: Business Logic Request
    
    BS->>Cache: Check Cache
    Cache->>BS: Cache Miss
    BS->>DB: Database Query
    DB->>BS: Query Result
    BS->>Cache: Update Cache
    
    alt External Service Required
        BS->>EXT: External API Call
        EXT->>BS: External Response
    end
    
    BS->>AG: Business Response
    AG->>LB: API Response
    LB->>C: HTTP Response

    %%  --- DARK GRADIENT & GLOW STYLING ---
    
    %%  Main Dashboard (Neon Cyan/Blue)
    classDef main fill : #0d1117, stroke:#58a6ff, stroke-width: 4px,color:#58a6ff,font-weight: bold;
    
    
    %%  Decision Diamond (Gold Glow)
    classDef decision fill : #161b22, stroke:#d29922, color:#d29922,stroke-dasharray: 5 5;
    
    
    %%  Revenue (Emerald Gradient Style)
    classDef revNode fill : #04190b, stroke:#3fb950, color:#aff5b4,stroke-width: 2px;
    
    
    %%  Commission (Purple Gradient Style)
    classDef commNode fill : #12101e, stroke:#bc8cff, color:#e2c5ff,stroke-width: 2px;
    
    
    %%  Refund (Ruby Gradient Style)
    classDef refNode fill : #1a0b0b, stroke:#ff7b72, color:#ffa198,stroke-width: 2px;
    
    
    %%  Earnings (Sapphire Gradient Style)
    classDef earnNode fill : #051221, stroke:#388bfd, color:#a5d6ff,stroke-width: 2px;
    

    class AG main;
    class AS decision;
    class BS revNode;
    class C commNode;
    class DB refNode;
    class EXT earnNode;
    class LB main;

```

### **Event-Driven Communication**

```mermaid
graph TD
    A["Trip Status Change"] --> B["Event Publisher"]
    B --> C["Redis Pub/Sub"]
    
    C --> D["WebSocket Gateway"]
    C --> E["Notification Service"]
    C --> F["Analytics Service"]
    C --> G["Audit Service"]
    
    D --> H["Real-time Updates"]
    E --> I["Push Notifications"]
    E --> J["SMS Notifications"]
    F --> K["Metrics Collection"]
    G --> L["Audit Logs"]
    
    H --> M["Mobile Apps"]
    I --> M
    J --> N["SMS Gateway"]
    K --> O["Analytics Dashboard"]
    L --> P["Compliance Reports"]

    %%  --- DARK GRADIENT & GLOW STYLING ---
    
    %%  Main Dashboard (Neon Cyan/Blue)
    classDef main fill : #0d1117, stroke:#58a6ff, stroke-width: 4px,color:#58a6ff,font-weight: bold;
    
    
    %%  Decision Diamond (Gold Glow)
    classDef decision fill : #161b22, stroke:#d29922, color:#d29922,stroke-dasharray: 5 5;
    
    
    %%  Revenue (Emerald Gradient Style)
    classDef revNode fill : #04190b, stroke:#3fb950, color:#aff5b4,stroke-width: 2px;
    
    
    %%  Commission (Purple Gradient Style)
    classDef commNode fill : #12101e, stroke:#bc8cff, color:#e2c5ff,stroke-width: 2px;
    
    
    %%  Refund (Ruby Gradient Style)
    classDef refNode fill : #1a0b0b, stroke:#ff7b72, color:#ffa198,stroke-width: 2px;
    
    
    %%  Earnings (Sapphire Gradient Style)
    classDef earnNode fill : #051221, stroke:#388bfd, color:#a5d6ff,stroke-width: 2px;
    

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
    class O revNode;
    class P commNode;

```

### **WebSocket Communication Flow**

```mermaid
sequenceDiagram
    participant PA as "Passenger App"
    participant DA as "Driver App"
    participant WS as "WebSocket Gateway"
    participant TS as "Trip Service"
    participant NS as "Notification Service"
    
    Note over PA,DA: Trip Request Initiated
    
    PA->>WS: Connect & Join Trip Room
    DA->>WS: Connect & Join Driver Room
    
    TS->>WS: New Trip Available
    WS->>DA: Broadcast Trip Request
    
    DA->>WS: Accept Trip
    WS->>TS: Process Trip Acceptance
    TS->>WS: Trip Assigned Event
    WS->>PA: Trip Assigned Notification
    
    loop Location Updates
        DA->>WS: Driver Location Update
        WS->>PA: Real-time Location
    end
    
    DA->>WS: Trip Status Update
    WS->>TS: Update Trip Status
    TS->>NS: Trigger Notifications
    WS->>PA: Status Change Notification

    %%  --- DARK GRADIENT & GLOW STYLING ---
    
    %%  Main Dashboard (Neon Cyan/Blue)
    classDef main fill : #0d1117, stroke:#58a6ff, stroke-width: 4px,color:#58a6ff,font-weight: bold;
    
    
    %%  Decision Diamond (Gold Glow)
    classDef decision fill : #161b22, stroke:#d29922, color:#d29922,stroke-dasharray: 5 5;
    
    
    %%  Revenue (Emerald Gradient Style)
    classDef revNode fill : #04190b, stroke:#3fb950, color:#aff5b4,stroke-width: 2px;
    
    
    %%  Commission (Purple Gradient Style)
    classDef commNode fill : #12101e, stroke:#bc8cff, color:#e2c5ff,stroke-width: 2px;
    
    
    %%  Refund (Ruby Gradient Style)
    classDef refNode fill : #1a0b0b, stroke:#ff7b72, color:#ffa198,stroke-width: 2px;
    
    
    %%  Earnings (Sapphire Gradient Style)
    classDef earnNode fill : #051221, stroke:#388bfd, color:#a5d6ff,stroke-width: 2px;
    

    class DA main;
    class NS decision;
    class PA revNode;
    class TS commNode;
    class WS refNode;

```

---

## 🗄️ Database Design

### **Entity Relationship Diagram**

```mermaid
erDiagram
    USER {
        uuid id PK
        string phone UK
        string name
        string email UK
        enum role
        enum status
        boolean phoneVerified
        decimal rating
        integer totalTrips
        boolean isOnline
        boolean isAvailable
        timestamp createdAt
        timestamp updatedAt
    }
    
    WALLET {
        uuid id PK
        uuid userId FK
        decimal balance
        decimal totalEarnings
        decimal totalSpent
        enum status
        decimal dailySpendLimit
        decimal monthlySpendLimit
        timestamp createdAt
        timestamp updatedAt
    }
    
    TRIP {
        uuid id PK
        uuid passengerId FK
        uuid driverId FK
        enum status
        enum type
        decimal pickupLatitude
        decimal pickupLongitude
        string pickupAddress
        decimal dropoffLatitude
        decimal dropoffLongitude
        string dropoffAddress
        decimal estimatedFare
        decimal actualFare
        decimal estimatedDistance
        decimal actualDistance
        timestamp createdAt
        timestamp completedAt
    }
    
    PAYMENT {
        uuid id PK
        uuid tripId FK
        uuid userId FK
        enum method
        enum status
        decimal amount
        decimal platformCommission
        decimal driverEarnings
        string gatewayTransactionId
        timestamp createdAt
        timestamp completedAt
    }
    
    TRANSACTION {
        uuid id PK
        uuid walletId FK
        uuid userId FK
        uuid tripId FK
        enum type
        enum status
        decimal amount
        decimal balanceBefore
        decimal balanceAfter
        string description
        timestamp createdAt
    }
    
    RATING {
        uuid id PK
        uuid tripId FK
        uuid ratedById FK
        uuid ratedUserId FK
        enum type
        decimal rating
        string comment
        timestamp createdAt
    }
    
    LOCATION {
        uuid id PK
        uuid userId FK
        uuid tripId FK
        enum type
        decimal latitude
        decimal longitude
        string address
        decimal heading
        decimal speed
        timestamp createdAt
    }
    
    USER ||--o { TRIP : "passenger"
    USER ||--o { TRIP : "driver"
    USER ||--|| WALLET : "owns"
    USER ||--o { RATING : "rates"
    USER ||--o { RATING : "rated"
    USER ||--o { LOCATION : "tracks"
    
    TRIP ||--|| PAYMENT : "has"
    TRIP ||--o { RATING : "receives"
    TRIP ||--o { LOCATION : "tracks"
    
    WALLET ||--o { TRANSACTION : "contains"
    
    PAYMENT ||--o { TRANSACTION : "generates"

    %%  --- DARK GRADIENT & GLOW STYLING ---
    
    %%  Main Dashboard (Neon Cyan/Blue)
    classDef main fill : #0d1117, stroke:#58a6ff, stroke-width: 4px,color:#58a6ff,font-weight: bold;
    
    
    %%  Decision Diamond (Gold Glow)
    classDef decision fill : #161b22, stroke:#d29922, color:#d29922,stroke-dasharray: 5 5;
    
    
    %%  Revenue (Emerald Gradient Style)
    classDef revNode fill : #04190b, stroke:#3fb950, color:#aff5b4,stroke-width: 2px;
    
    
    %%  Commission (Purple Gradient Style)
    classDef commNode fill : #12101e, stroke:#bc8cff, color:#e2c5ff,stroke-width: 2px;
    
    
    %%  Refund (Ruby Gradient Style)
    classDef refNode fill : #1a0b0b, stroke:#ff7b72, color:#ffa198,stroke-width: 2px;
    
    
    %%  Earnings (Sapphire Gradient Style)
    classDef earnNode fill : #051221, stroke:#388bfd, color:#a5d6ff,stroke-width: 2px;
    

```

### **Database Optimization Strategy**

#### **Indexing Strategy**
```sql
-- User indexes
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role_status ON users(role, status);
CREATE INDEX idx_users_location ON users(currentLatitude, currentLongitude);

-- Trip indexes
CREATE INDEX idx_trips_passenger ON trips(passengerId);
CREATE INDEX idx_trips_driver ON trips(driverId);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_created_at ON trips(createdAt);
CREATE INDEX idx_trips_pickup_location ON trips(pickupLatitude, pickupLongitude);

-- Payment indexes
CREATE INDEX idx_payments_user ON payments(userId);
CREATE INDEX idx_payments_trip ON payments(tripId);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(createdAt);

-- Location indexes (for geospatial queries)
CREATE INDEX idx_locations_coordinates ON locations(latitude, longitude);
CREATE INDEX idx_locations_user_type ON locations(userId, type);
CREATE INDEX idx_locations_trip_type ON locations(tripId, type);
```

#### **Partitioning Strategy**
```sql
-- Partition trips by month for better performance
CREATE TABLE trips_2024_01 PARTITION OF trips
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Partition transactions by month
CREATE TABLE transactions_2024_01 PARTITION OF transactions
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Partition locations by date for historical data
CREATE TABLE locations_2024_01 PARTITION OF locations
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

---

## 🌐 API Architecture

### **RESTful API Design**

#### **API Versioning Strategy**
```
/api/v1/auth/register
/api/v1/trips/request
/api/v1/payments/process
/api/v2/trips/request  # Future version with breaking changes
```

#### **Resource-Based URLs**
```
GET    /api/v1/users              # List users
POST   /api/v1/users              # Create user
GET    /api/v1/users/{id}         # Get user
PUT    /api/v1/users/{id}         # Update user
DELETE /api/v1/users/{id}         # Delete user

GET    /api/v1/trips              # List trips
POST   /api/v1/trips              # Create trip
GET    /api/v1/trips/{id}         # Get trip
PUT    /api/v1/trips/{id}/status  # Update trip status
POST   /api/v1/trips/{id}/rate    # Rate trip
```

### **API Response Standards**

#### **Success Response Format**
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    "id": "uuid",
    "attributes": "values"
  },
  "meta": {
    "timestamp": "2024-01-24T12:00:00Z",
    "version": "1.0.0"
  }
}
```

#### **Error Response Format**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "phone",
        "message": "Phone number is required"
      }
    ]
  },
  "meta": {
    "timestamp": "2024-01-24T12:00:00Z",
    "requestId": "req-uuid"
  }
}
```

#### **Pagination Response Format**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### **API Security Layers**

```mermaid
graph TD
    A["API Request"] --> B["Rate Limiting"]
    B --> C["CORS Validation"]
    C --> D["Input Validation"]
    D --> E["JWT Authentication"]
    E --> F["Role Authorization"]
    F --> G["Business Logic"]
    G --> H["Response Sanitization"]
    H --> I["API Response"]
    
    B --> J["Rate Limit Exceeded"]
    C --> K["CORS Violation"]
    D --> L["Invalid Input"]
    E --> M["Authentication Failed"]
    F --> N["Authorization Failed"]
    
    J --> O["Error Response"]
    K --> O
    L --> O
    M --> O
    N --> O

    %%  --- DARK GRADIENT & GLOW STYLING ---
    
    %%  Main Dashboard (Neon Cyan/Blue)
    classDef main fill : #0d1117, stroke:#58a6ff, stroke-width: 4px,color:#58a6ff,font-weight: bold;
    
    
    %%  Decision Diamond (Gold Glow)
    classDef decision fill : #161b22, stroke:#d29922, color:#d29922,stroke-dasharray: 5 5;
    
    
    %%  Revenue (Emerald Gradient Style)
    classDef revNode fill : #04190b, stroke:#3fb950, color:#aff5b4,stroke-width: 2px;
    
    
    %%  Commission (Purple Gradient Style)
    classDef commNode fill : #12101e, stroke:#bc8cff, color:#e2c5ff,stroke-width: 2px;
    
    
    %%  Refund (Ruby Gradient Style)
    classDef refNode fill : #1a0b0b, stroke:#ff7b72, color:#ffa198,stroke-width: 2px;
    
    
    %%  Earnings (Sapphire Gradient Style)
    classDef earnNode fill : #051221, stroke:#388bfd, color:#a5d6ff,stroke-width: 2px;
    

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
    class O revNode;

```

---

## ⚡ Real-time Communication

### **WebSocket Architecture**

```mermaid
%%{init: {
    "theme": "dark",
    "themeVariables": {
    "primaryColor": "#0d1117",
    "primaryTextColor": "#58a6ff",
    "primaryBorderColor": "#58a6ff",
    "lineColor": "#58a6ff"
    },
    "flowchart": {
    "useMaxWidth": true,
    "htmlLabels": true
    }
    }}%%
graph TB
    subgraph """"Client" Layer"
        A["Passenger App"]
        B["Driver App"]
        C["Admin Dashboard"]
    end
    
    subgraph """"WebSocket" Gateway"
        D["Connection Manager"]
        E["Room Manager"]
        F["Event Router"]
        G["Authentication Handler"]
    end
    
    subgraph """"Business" Services"
        H["Trip Service"]
        I["Location Service"]
        J["Notification Service"]
        K["Payment Service"]
    end
    
    subgraph """"Message" Broker"
        L["Redis Pub/Sub"]
        M["Event Queue"]
    end
    
    A --> D
    B --> D
    C --> D
    
    D --> G
    G --> E
    E --> F
    
    F --> H
    F --> I
    F --> J
    F --> K
    
    H --> L
    I --> L
    J --> L
    K --> L
    
    L --> M
    M --> F

    %%  --- DARK GRADIENT & GLOW STYLING ---
    
    %%  Main Dashboard (Neon Cyan/Blue)
    classDef main fill : #0d1117, stroke:#58a6ff, stroke-width: 4px,color:#58a6ff,font-weight: bold;
    
    
    %%  Decision Diamond (Gold Glow)
    classDef decision fill : #161b22, stroke:#d29922, color:#d29922,stroke-dasharray: 5 5;
    
    
    %%  Revenue (Emerald Gradient Style)
    classDef revNode fill : #04190b, stroke:#3fb950, color:#aff5b4,stroke-width: 2px;
    
    
    %%  Commission (Purple Gradient Style)
    classDef commNode fill : #12101e, stroke:#bc8cff, color:#e2c5ff,stroke-width: 2px;
    
    
    %%  Refund (Ruby Gradient Style)
    classDef refNode fill : #1a0b0b, stroke:#ff7b72, color:#ffa198,stroke-width: 2px;
    
    
    %%  Earnings (Sapphire Gradient Style)
    classDef earnNode fill : #051221, stroke:#388bfd, color:#a5d6ff,stroke-width: 2px;
    

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

```

### **Real-time Event Types**

#### **Trip Events**
```typescript
interface TripEvent {
  type: 'trip_status_update' | 'trip_assigned' | 'driver_location_update';
  tripId: string;
  data: {
    status?: TripStatus;
    driverId?: string;
    location?: {
      latitude: number;
      longitude: number;
      heading?: number;
      speed?: number;
    };
    estimatedArrival?: Date;
    message?: string;
  };
  timestamp: Date;
}
```

#### **Payment Events**
```typescript
interface PaymentEvent {
  type: 'payment_processing' | 'payment_completed' | 'payment_failed';
  paymentId: string;
  userId: string;
  data: {
    amount: number;
    method: PaymentMethod;
    status: PaymentStatus;
    failureReason?: string;
  };
  timestamp: Date;
}
```

### **Connection Management**

```mermaid
stateDiagram-v2
    [*] --> Connecting
    Connecting --> Connected : Auth Success
    Connecting --> Disconnected : Auth Failed
    
    Connected --> Authenticated : JWT Valid
    Connected --> Disconnected : JWT Invalid
    
    Authenticated --> InRoom : Join Room
    InRoom --> InRoom : Send/Receive Events
    InRoom --> Authenticated : Leave Room
    
    Authenticated --> Disconnected : Client Disconnect
    InRoom --> Disconnected : Connection Lost
    
    Disconnected --> Connecting : Reconnect
    Disconnected --> [*]: Session End

    %%  --- DARK GRADIENT & GLOW STYLING ---
    
    %%  Main Dashboard (Neon Cyan/Blue)
    classDef main fill : #0d1117, stroke:#58a6ff, stroke-width: 4px,color:#58a6ff,font-weight: bold;
    
    
    %%  Decision Diamond (Gold Glow)
    classDef decision fill : #161b22, stroke:#d29922, color:#d29922,stroke-dasharray: 5 5;
    
    
    %%  Revenue (Emerald Gradient Style)
    classDef revNode fill : #04190b, stroke:#3fb950, color:#aff5b4,stroke-width: 2px;
    
    
    %%  Commission (Purple Gradient Style)
    classDef commNode fill : #12101e, stroke:#bc8cff, color:#e2c5ff,stroke-width: 2px;
    
    
    %%  Refund (Ruby Gradient Style)
    classDef refNode fill : #1a0b0b, stroke:#ff7b72, color:#ffa198,stroke-width: 2px;
    
    
    %%  Earnings (Sapphire Gradient Style)
    classDef earnNode fill : #051221, stroke:#388bfd, color:#a5d6ff,stroke-width: 2px;
    

    class A main;
    class C decision;
    class D revNode;
    class I commNode;

```

---

## 🔐 Security Architecture

### **Multi-Layer Security Model**

```mermaid
graph TD
    A["Client Request"] --> B["Network Security"]
    B --> C["API Gateway Security"]
    C --> D["Application Security"]
    D --> E["Data Security"]
    E --> F["Infrastructure Security"]
    
    subgraph """"Network" Layer"
        B1["HTTPS/TLS 1.3"]
        B2["DDoS Protection"]
        B3["Firewall Rules"]
    end
    
    subgraph """"API" Gateway Layer"
        C1["Rate Limiting"]
        C2["CORS Policy"]
        C3["Input Validation"]
        C4["Request Sanitization"]
    end
    
    subgraph """"Application" Layer"
        D1["JWT Authentication"]
        D2["Role-Based Authorization"]
        D3["Session Management"]
        D4["Audit Logging"]
    end
    
    subgraph """"Data" Layer"
        E1["Encryption at Rest"]
        E2["Encryption in Transit"]
        E3["Database Security"]
        E4["Backup Encryption"]
    end
    
    subgraph """"Infrastructure" Layer"
        F1["Container Security"]
        F2["Network Segmentation"]
        F3["Access Controls"]
        F4["Monitoring & Alerting"]
    end
    
    B --> B1
    B --> B2
    B --> B3
    
    C --> C1
    C --> C2
    C --> C3
    C --> C4
    
    D --> D1
    D --> D2
    D --> D3
    D --> D4
    
    E --> E1
    E --> E2
    E --> E3
    E --> E4
    
    F --> F1
    F --> F2
    F --> F3
    F --> F4

    %%  --- DARK GRADIENT & GLOW STYLING ---
    
    %%  Main Dashboard (Neon Cyan/Blue)
    classDef main fill : #0d1117, stroke:#58a6ff, stroke-width: 4px,color:#58a6ff,font-weight: bold;
    
    
    %%  Decision Diamond (Gold Glow)
    classDef decision fill : #161b22, stroke:#d29922, color:#d29922,stroke-dasharray: 5 5;
    
    
    %%  Revenue (Emerald Gradient Style)
    classDef revNode fill : #04190b, stroke:#3fb950, color:#aff5b4,stroke-width: 2px;
    
    
    %%  Commission (Purple Gradient Style)
    classDef commNode fill : #12101e, stroke:#bc8cff, color:#e2c5ff,stroke-width: 2px;
    
    
    %%  Refund (Ruby Gradient Style)
    classDef refNode fill : #1a0b0b, stroke:#ff7b72, color:#ffa198,stroke-width: 2px;
    
    
    %%  Earnings (Sapphire Gradient Style)
    classDef earnNode fill : #051221, stroke:#388bfd, color:#a5d6ff,stroke-width: 2px;
    

    class A main;
    class B decision;
    class B1 revNode;
    class B2 commNode;
    class B3 refNode;
    class C earnNode;
    class C1 main;
    class C2 decision;
    class C3 revNode;
    class C4 commNode;
    class D refNode;
    class D1 earnNode;
    class D2 main;
    class D3 decision;
    class D4 revNode;
    class E commNode;
    class E1 refNode;
    class E2 earnNode;
    class E3 main;
    class E4 decision;
    class F revNode;
    class F1 commNode;
    class F2 refNode;
    class F3 earnNode;
    class F4 main;

```

### **Authentication & Authorization Flow**

```mermaid
sequenceDiagram
    participant C as "Client"
    participant AG as "API Gateway"
    participant AS as "Auth Service"
    participant RS as "Redis"
    participant DB as "Database"
    participant BS as "Business Service"
    
    C->>AG: Login Request
    AG->>AS: Validate Credentials
    AS->>DB: Check User Credentials
    DB->>AS: User Data
    AS->>AS: Generate JWT & Refresh Token
    AS->>RS: Store Refresh Token
    AS->>AG: Return Tokens
    AG->>C: Authentication Success
    
    Note over C,BS: Subsequent API Calls
    
    C->>AG: API Request + JWT
    AG->>AS: Validate JWT
    AS->>AS: Verify Token Signature
    AS->>RS: Check Token Blacklist
    RS->>AS: Token Valid
    AS->>AG: Authentication Success
    AG->>BS: Authorized Request
    BS->>AG: Business Response
    AG->>C: API Response

    %%  --- DARK GRADIENT & GLOW STYLING ---
    
    %%  Main Dashboard (Neon Cyan/Blue)
    classDef main fill : #0d1117, stroke:#58a6ff, stroke-width: 4px,color:#58a6ff,font-weight: bold;
    
    
    %%  Decision Diamond (Gold Glow)
    classDef decision fill : #161b22, stroke:#d29922, color:#d29922,stroke-dasharray: 5 5;
    
    
    %%  Revenue (Emerald Gradient Style)
    classDef revNode fill : #04190b, stroke:#3fb950, color:#aff5b4,stroke-width: 2px;
    
    
    %%  Commission (Purple Gradient Style)
    classDef commNode fill : #12101e, stroke:#bc8cff, color:#e2c5ff,stroke-width: 2px;
    
    
    %%  Refund (Ruby Gradient Style)
    classDef refNode fill : #1a0b0b, stroke:#ff7b72, color:#ffa198,stroke-width: 2px;
    
    
    %%  Earnings (Sapphire Gradient Style)
    classDef earnNode fill : #051221, stroke:#388bfd, color:#a5d6ff,stroke-width: 2px;
    

    class AG main;
    class AS decision;
    class BS revNode;
    class C commNode;
    class DB refNode;
    class RS earnNode;

```

### **Data Protection Strategy**

#### **Encryption Standards**
- **At Rest**: AES-256 encryption for database and file storage
- **In Transit**: TLS 1.3 for all API communications
- **Application Level**: bcrypt for password hashing, JWT for tokens
- **PII Protection**: Field-level encryption for sensitive data

#### **Access Control Matrix**
```
Resource          | Passenger | Driver | Admin
------------------|-----------|--------|-------
Own Profile       | RW        | RW     | RW
Other Profiles    | R         | R      | RW
Own Trips         | RW        | RW     | RW
All Trips         | -         | -      | RW
Payments          | R         | R      | RW
Analytics         | -         | R      | RW
System Config     | -         | -      | RW
```

---

## 📈 Scalability & Performance

### **Horizontal Scaling Architecture**

```mermaid
%%{init: {
    "theme": "dark",
    "themeVariables": {
    "primaryColor": "#0d1117",
    "primaryTextColor": "#58a6ff",
    "primaryBorderColor": "#58a6ff",
    "lineColor": "#58a6ff"
    },
    "flowchart": {
    "useMaxWidth": true,
    "htmlLabels": true
    }
    }}%%
graph TB
    subgraph """"Load" Balancer Layer"
        A["Application Load Balancer"]
        B["WebSocket Load Balancer"]
    end
    
    subgraph """"Application" Instances"
        C["API Instance 1"]
        D["API Instance 2"]
        E["API Instance N"]
        F["WebSocket Instance 1"]
        G["WebSocket Instance 2"]
        H["WebSocket Instance N"]
    end
    
    subgraph """"Data" Layer"
        I["PostgreSQL Primary"]
        J["PostgreSQL Read Replica 1"]
        K["PostgreSQL Read Replica 2"]
        L["Redis Cluster"]
    end
    
    subgraph """"External" Services"
        M["Payment Gateways"]
        N["SMS Services"]
        O["Push Notifications"]
    end
    
    A --> C
    A --> D
    A --> E
    B --> F
    B --> G
    B --> H
    
    C --> I
    C --> J
    C --> K
    C --> L
    
    D --> I
    D --> J
    D --> K
    D --> L
    
    E --> I
    E --> J
    E --> K
    E --> L
    
    F --> L
    G --> L
    H --> L
    
    C --> M
    C --> N
    C --> O

    %%  --- DARK GRADIENT & GLOW STYLING ---
    
    %%  Main Dashboard (Neon Cyan/Blue)
    classDef main fill : #0d1117, stroke:#58a6ff, stroke-width: 4px,color:#58a6ff,font-weight: bold;
    
    
    %%  Decision Diamond (Gold Glow)
    classDef decision fill : #161b22, stroke:#d29922, color:#d29922,stroke-dasharray: 5 5;
    
    
    %%  Revenue (Emerald Gradient Style)
    classDef revNode fill : #04190b, stroke:#3fb950, color:#aff5b4,stroke-width: 2px;
    
    
    %%  Commission (Purple Gradient Style)
    classDef commNode fill : #12101e, stroke:#bc8cff, color:#e2c5ff,stroke-width: 2px;
    
    
    %%  Refund (Ruby Gradient Style)
    classDef refNode fill : #1a0b0b, stroke:#ff7b72, color:#ffa198,stroke-width: 2px;
    
    
    %%  Earnings (Sapphire Gradient Style)
    classDef earnNode fill : #051221, stroke:#388bfd, color:#a5d6ff,stroke-width: 2px;
    

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
    class O revNode;

```

### **Caching Strategy**

```mermaid
graph LR
    A["Client Request"] --> B["API Gateway"]
    B --> C {"Cache Check"}
    
    C --> |Hit| D["Return Cached Data"]
    C --> |Miss| E["Business Logic"]
    
    E --> F["Database Query"]
    F --> G["Update Cache"]
    G --> H["Return Data"]
    
    subgraph """"Cache" Layers"
        I["Redis - Session Cache"]
        J["Redis - Data Cache"]
        K["CDN - Static Assets"]
        L["Application Cache"]
    end
    
    C --> I
    C --> J
    C --> K
    C --> L
    
    G --> I
    G --> J

    %%  --- DARK GRADIENT & GLOW STYLING ---
    
    %%  Main Dashboard (Neon Cyan/Blue)
    classDef main fill : #0d1117, stroke:#58a6ff, stroke-width: 4px,color:#58a6ff,font-weight: bold;
    
    
    %%  Decision Diamond (Gold Glow)
    classDef decision fill : #161b22, stroke:#d29922, color:#d29922,stroke-dasharray: 5 5;
    
    
    %%  Revenue (Emerald Gradient Style)
    classDef revNode fill : #04190b, stroke:#3fb950, color:#aff5b4,stroke-width: 2px;
    
    
    %%  Commission (Purple Gradient Style)
    classDef commNode fill : #12101e, stroke:#bc8cff, color:#e2c5ff,stroke-width: 2px;
    
    
    %%  Refund (Ruby Gradient Style)
    classDef refNode fill : #1a0b0b, stroke:#ff7b72, color:#ffa198,stroke-width: 2px;
    
    
    %%  Earnings (Sapphire Gradient Style)
    classDef earnNode fill : #051221, stroke:#388bfd, color:#a5d6ff,stroke-width: 2px;
    

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

```

### **Performance Optimization Techniques**

#### **Database Optimization**
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Indexed queries and query plan analysis
- **Read Replicas**: Separate read and write operations
- **Partitioning**: Table partitioning for large datasets
- **Materialized Views**: Pre-computed aggregations

#### **Application Optimization**
- **Lazy Loading**: Load data only when needed
- **Batch Processing**: Group operations for efficiency
- **Async Processing**: Non-blocking operations
- **Memory Management**: Efficient object lifecycle management
- **Code Splitting**: Modular application architecture

#### **Network Optimization**
- **CDN Integration**: Global content delivery
- **Compression**: Gzip/Brotli response compression
- **HTTP/2**: Multiplexed connections
- **Keep-Alive**: Persistent connections
- **Caching Headers**: Browser and proxy caching

---

## 🚀 Deployment Architecture

### **Container-Based Deployment**

```mermaid
%%{init: {
    "theme": "dark",
    "themeVariables": {
    "primaryColor": "#0d1117",
    "primaryTextColor": "#58a6ff",
    "primaryBorderColor": "#58a6ff",
    "lineColor": "#58a6ff"
    },
    "flowchart": {
    "useMaxWidth": true,
    "htmlLabels": true
    }
    }}%%
graph TB
    subgraph """"Production" Environment"
        subgraph """"Kubernetes" Cluster"
            A["Ingress Controller"]
            B["API Deployment"]
            C["WebSocket Deployment"]
            D["Worker Deployment"]
            E["Redis Deployment"]
        end
        
        subgraph """"Database" Layer"
            F["PostgreSQL Primary"]
            G["PostgreSQL Standby"]
        end
        
        subgraph """"Monitoring""
            H["Prometheus"]
            I["Grafana"]
            J["ELK Stack"]
        end
    end
    
    subgraph """"CI/CD" Pipeline"
        K["Git Repository"]
        L["GitHub Actions"]
        M["Docker Registry"]
        N["Deployment Scripts"]
    end
    
    K --> L
    L --> M
    M --> N
    N --> A
    
    A --> B
    A --> C
    B --> E
    C --> E
    D --> E
    
    B --> F
    C --> F
    D --> F
    F --> G
    
    B --> H
    C --> H
    D --> H
    H --> I
    B --> J
    C --> J
    D --> J

    %%  --- DARK GRADIENT & GLOW STYLING ---
    
    %%  Main Dashboard (Neon Cyan/Blue)
    classDef main fill : #0d1117, stroke:#58a6ff, stroke-width: 4px,color:#58a6ff,font-weight: bold;
    
    
    %%  Decision Diamond (Gold Glow)
    classDef decision fill : #161b22, stroke:#d29922, color:#d29922,stroke-dasharray: 5 5;
    
    
    %%  Revenue (Emerald Gradient Style)
    classDef revNode fill : #04190b, stroke:#3fb950, color:#aff5b4,stroke-width: 2px;
    
    
    %%  Commission (Purple Gradient Style)
    classDef commNode fill : #12101e, stroke:#bc8cff, color:#e2c5ff,stroke-width: 2px;
    
    
    %%  Refund (Ruby Gradient Style)
    classDef refNode fill : #1a0b0b, stroke:#ff7b72, color:#ffa198,stroke-width: 2px;
    
    
    %%  Earnings (Sapphire Gradient Style)
    classDef earnNode fill : #051221, stroke:#388bfd, color:#a5d6ff,stroke-width: 2px;
    

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

### **Environment Configuration**

#### **Development Environment**
```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  api:
    build: .
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://[USERNAME]:[PASSWORD]@postgres:5432/sikka_dev
      - REDIS_URL=redis://redis:6379
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=sikka_dev
      - POSTGRES_USER=dev_user
      - POSTGRES_PASSWORD=dev_pass
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

#### **Production Environment**
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  api:
    image: sikka-backend:latest
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: '0.25'
```

### **Monitoring & Observability**

```mermaid
graph LR
    subgraph """"Application" Metrics"
        A["API Response Times"]
        B["Error Rates"]
        C["Throughput"]
        D["Active Connections"]
    end
    
    subgraph """"Infrastructure" Metrics"
        E["CPU Usage"]
        F["Memory Usage"]
        G["Disk I/O"]
        H["Network I/O"]
    end
    
    subgraph """"Business" Metrics"
        I["Active Trips"]
        J["Payment Success Rate"]
        K["User Registrations"]
        L["Driver Utilization"]
    end
    
    subgraph """"Monitoring" Stack"
        M["Prometheus"]
        N["Grafana"]
        O["AlertManager"]
        P["ELK Stack"]
    end
    
    A --> M
    B --> M
    C --> M
    D --> M
    E --> M
    F --> M
    G --> M
    H --> M
    I --> M
    J --> M
    K --> M
    L --> M
    
    M --> N
    M --> O
    M --> P

    %%  --- DARK GRADIENT & GLOW STYLING ---
    
    %%  Main Dashboard (Neon Cyan/Blue)
    classDef main fill : #0d1117, stroke:#58a6ff, stroke-width: 4px,color:#58a6ff,font-weight: bold;
    
    
    %%  Decision Diamond (Gold Glow)
    classDef decision fill : #161b22, stroke:#d29922, color:#d29922,stroke-dasharray: 5 5;
    
    
    %%  Revenue (Emerald Gradient Style)
    classDef revNode fill : #04190b, stroke:#3fb950, color:#aff5b4,stroke-width: 2px;
    
    
    %%  Commission (Purple Gradient Style)
    classDef commNode fill : #12101e, stroke:#bc8cff, color:#e2c5ff,stroke-width: 2px;
    
    
    %%  Refund (Ruby Gradient Style)
    classDef refNode fill : #1a0b0b, stroke:#ff7b72, color:#ffa198,stroke-width: 2px;
    
    
    %%  Earnings (Sapphire Gradient Style)
    classDef earnNode fill : #051221, stroke:#388bfd, color:#a5d6ff,stroke-width: 2px;
    

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
    class O revNode;
    class P commNode;

```

### **Health Check Strategy**

```typescript
// Health check endpoints
@Controller('health')
export class HealthController {
  @Get()
  async healthCheck(): Promise<HealthStatus> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.APP_VERSION,
    };
  }

  @Get('ready')
  async readinessCheck(): Promise<ReadinessStatus> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkExternalServices(),
    ]);

    return {
      status: checks.every(check => check.status === 'fulfilled') ? 'ready' : 'not_ready',
      checks: {
        database: checks[0].status === 'fulfilled',
        redis: checks[1].status === 'fulfilled',
        external: checks[2].status === 'fulfilled',
      },
    };
  }
}
```

---

This comprehensive architecture documentation provides the technical foundation for understanding, maintaining, and scaling the Sikka Transportation Platform.
