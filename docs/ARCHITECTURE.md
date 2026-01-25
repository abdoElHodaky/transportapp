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
    "primaryTextColor": "#f7d794",
    "primaryBorderColor": "#d97706",
    "lineColor": "#d97706",
    "secondaryColor": "#f59e0b",
    "tertiaryColor": "#fbbf24",
    "background": "#0d1117",
    "mainBkg": "#0d1117",
    "secondBkg": "#21262d"
  },
  "flowchart": {
    "useMaxWidth": true,
    "htmlLabels": true
  },
  "sequence": {
    "useMaxWidth": true,
    "wrap": true
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

      Main Dashboard (Neon Cyan/Blue)

     Payment Components

    %% Financial Services

    %% Transaction Processing

    %% External Payment Gateways

    %% Success Transactions

    %% Decision Points

    %% Database Systems

    %% Node Classifications
    %% --- FINANCIAL GOLD THEME STYLING ---
    classDef payment fill:#0d1117,stroke:#d97706,stroke-width:4px,color:#f7d794,font-weight:bold;
    classDef financial fill:#0d1117,stroke:#f59e0b,stroke-width:3px,color:#f7d794,font-weight:normal;
    classDef transaction fill:#21262d,stroke:#d97706,stroke-width:2px,color:#f7d794,font-weight:normal;
    classDef gateway fill:#0d1117,stroke:#fbbf24,stroke-width:2px,color:#fbbf24,font-weight:normal,stroke-dasharray: 3 3;
    classDef success fill:#0d1117,stroke:#3fb950,stroke-width:3px,color:#3fb950,font-weight:bold;
    classDef decision fill:#0d1117,stroke:#d29922,stroke-width:3px,color:#d29922,font-weight:bold,stroke-dasharray: 8 4;
    classDef database fill:#0d1117,stroke:#fbbf24,stroke-width:4px,color:#fbbf24,font-weight:bold;
    %% Node Classifications
    class A,B,C primary;
    class D,E,M,R gateway;
    class F,P,T,U process;
    class G,H,J,K,L,S secondary;
    class I,Q payment;
    class N,O database;

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
  "theme": "dark",
  "themeVariables": {
    "primaryColor": "#0d1117",
    "primaryTextColor": "#f7d794",
    "primaryBorderColor": "#d97706",
    "lineColor": "#d97706",
    "secondaryColor": "#f59e0b",
    "tertiaryColor": "#fbbf24",
    "background": "#0d1117",
    "mainBkg": "#0d1117",
    "secondBkg": "#21262d"
  },
  "flowchart": {
    "useMaxWidth": true,
    "htmlLabels": true
  },
  "sequence": {
    "useMaxWidth": true,
    "wrap": true
  }
}}%%
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

      Main Dashboard (Neon Cyan/Blue)

     Payment Components

    %% Financial Services

    %% Transaction Processing

    %% External Payment Gateways

    %% Success Transactions

    %% Decision Points

    %% Database Systems
    %% --- FINANCIAL GOLD THEME STYLING ---
    classDef payment fill:#0d1117,stroke:#d97706,stroke-width:4px,color:#f7d794,font-weight:bold;
    classDef financial fill:#0d1117,stroke:#f59e0b,stroke-width:3px,color:#f7d794,font-weight:normal;
    classDef transaction fill:#21262d,stroke:#d97706,stroke-width:2px,color:#f7d794,font-weight:normal;
    classDef gateway fill:#0d1117,stroke:#fbbf24,stroke-width:2px,color:#fbbf24,font-weight:normal,stroke-dasharray: 3 3;
    classDef success fill:#0d1117,stroke:#3fb950,stroke-width:3px,color:#3fb950,font-weight:bold;
    classDef decision fill:#0d1117,stroke:#d29922,stroke-width:3px,color:#d29922,font-weight:bold,stroke-dasharray: 8 4;
    classDef database fill:#0d1117,stroke:#fbbf24,stroke-width:4px,color:#fbbf24,font-weight:bold;
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
%%{init: {
  "theme": "dark",
  "themeVariables": {
    "primaryColor": "#0d1117",
    "primaryTextColor": "#aff5b4",
    "primaryBorderColor": "#238636",
    "lineColor": "#238636",
    "secondaryColor": "#2ea043",
    "tertiaryColor": "#3fb950",
    "background": "#0d1117",
    "mainBkg": "#0d1117",
    "secondBkg": "#21262d"
  },
  "flowchart": {
    "useMaxWidth": true,
    "htmlLabels": true
  },
  "sequence": {
    "useMaxWidth": true,
    "wrap": true
  }
}}%%
sequenceDiagram
    autonumber
    
     Primary nodes (main components)

     Primary Business Components

    %% Secondary Business Components

    %% Process Steps

    %% Decision Points

    %% Success States

    %% External Systems

    %% Database Systems
    %% --- CORPORATE GREEN THEME STYLING ---
    classDef primary fill:#0d1117,stroke:#238636,stroke-width:4px,color:#aff5b4,font-weight:bold;
    classDef secondary fill:#0d1117,stroke:#2ea043,stroke-width:3px,color:#aff5b4,font-weight:normal;
    classDef process fill:#21262d,stroke:#238636,stroke-width:2px,color:#aff5b4,font-weight:normal;
    classDef decision fill:#0d1117,stroke:#d29922,stroke-width:3px,color:#d29922,font-weight:bold,stroke-dasharray: 8 4;
    classDef success fill:#0d1117,stroke:#238636,stroke-width:3px,color:#238636,font-weight:bold;
    classDef external fill:#0d1117,stroke:#2ea043,stroke-width:2px,color:#2ea043,font-weight:normal,stroke-dasharray: 3 3;
    classDef database fill:#0d1117,stroke:#3fb950,stroke-width:4px,color:#3fb950,font-weight:bold;
```

### **Event-Driven Communication**

```mermaid
%%{init: {
  "theme": "dark",
  "themeVariables": {
    "primaryColor": "#0d1117",
    "primaryTextColor": "#f7d794",
    "primaryBorderColor": "#d97706",
    "lineColor": "#d97706",
    "secondaryColor": "#f59e0b",
    "tertiaryColor": "#fbbf24",
    "background": "#0d1117",
    "mainBkg": "#0d1117",
    "secondBkg": "#21262d"
  },
  "flowchart": {
    "useMaxWidth": true,
    "htmlLabels": true
  },
  "sequence": {
    "useMaxWidth": true,
    "wrap": true
  }
}}%%
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

      Main Dashboard (Neon Cyan/Blue)

     Payment Components

    %% Financial Services

    %% Transaction Processing

    %% External Payment Gateways

    %% Success Transactions

    %% Decision Points

    %% Database Systems

    %% Node Classifications
    %% --- FINANCIAL GOLD THEME STYLING ---
    classDef payment fill:#0d1117,stroke:#d97706,stroke-width:4px,color:#f7d794,font-weight:bold;
    classDef financial fill:#0d1117,stroke:#f59e0b,stroke-width:3px,color:#f7d794,font-weight:normal;
    classDef transaction fill:#21262d,stroke:#d97706,stroke-width:2px,color:#f7d794,font-weight:normal;
    classDef gateway fill:#0d1117,stroke:#fbbf24,stroke-width:2px,color:#fbbf24,font-weight:normal,stroke-dasharray: 3 3;
    classDef success fill:#0d1117,stroke:#3fb950,stroke-width:3px,color:#3fb950,font-weight:bold;
    classDef decision fill:#0d1117,stroke:#d29922,stroke-width:3px,color:#d29922,font-weight:bold,stroke-dasharray: 8 4;
    classDef database fill:#0d1117,stroke:#fbbf24,stroke-width:4px,color:#fbbf24,font-weight:bold;
    %% Node Classifications
    class A,B,H,I,J,K,L,P process;
    class C database;
    class D,N gateway;
    class E,F,G secondary;
    class M,O primary;

```

### **WebSocket Communication Flow**

```mermaid
%%{init: {
  "theme": "dark",
  "themeVariables": {
    "primaryColor": "#0d1117",
    "primaryTextColor": "#aff5b4",
    "primaryBorderColor": "#238636",
    "lineColor": "#238636",
    "secondaryColor": "#2ea043",
    "tertiaryColor": "#3fb950",
    "background": "#0d1117",
    "mainBkg": "#0d1117",
    "secondBkg": "#21262d"
  },
  "flowchart": {
    "useMaxWidth": true,
    "htmlLabels": true
  },
  "sequence": {
    "useMaxWidth": true,
    "wrap": true
  }
}}%%
sequenceDiagram
    autonumber

    box rgba(63, 185, 80, 0.1) Passenger App
        participant PA as 📱 Passenger App
    end
    
    box rgba(188, 140, 255, 0.1) Driver App
        participant DA as 🏎️ Driver App
    end

    box rgba(218, 54, 51, 0.1) Infrastructure
        participant WS as 🔌 WebSocket GW
        participant TS as ⚙️ Trip Service
        participant NS as 🔔 Notification
    end

    Note over PA,DA: Trip Request Initiated
    
    PA->>WS: Connect & Join Trip Room
    DA->>WS: Connect & Join Driver Room
    
    TS->>WS: New Trip Available
    WS-->>DA: Broadcast Trip Request
    
    DA->>WS: Accept Trip
    WS->>TS: Process Trip Acceptance
    TS->>WS: Trip Assigned Event
    WS-->>PA: Trip Assigned Notification
    
    loop Real-time Tracking
        DA->>WS: Driver Location Update
        WS-->>PA: Real-time Location
    end
    
    DA->>WS: Trip Status Update
    WS->>TS: Update Trip Status
    TS->>NS: Trigger Notifications
    WS-->>PA: Status Change Notification

     Primary nodes (main components)

     Primary Business Components

    %% Secondary Business Components

    %% Process Steps

    %% Decision Points

    %% Success States

    %% External Systems

    %% Database Systems
    %% --- CORPORATE GREEN THEME STYLING ---
    classDef primary fill:#0d1117,stroke:#238636,stroke-width:4px,color:#aff5b4,font-weight:bold;
    classDef secondary fill:#0d1117,stroke:#2ea043,stroke-width:3px,color:#aff5b4,font-weight:normal;
    classDef process fill:#21262d,stroke:#238636,stroke-width:2px,color:#aff5b4,font-weight:normal;
    classDef decision fill:#0d1117,stroke:#d29922,stroke-width:3px,color:#d29922,font-weight:bold,stroke-dasharray: 8 4;
    classDef success fill:#0d1117,stroke:#238636,stroke-width:3px,color:#238636,font-weight:bold;
    classDef external fill:#0d1117,stroke:#2ea043,stroke-width:2px,color:#2ea043,font-weight:normal,stroke-dasharray: 3 3;
    classDef database fill:#0d1117,stroke:#3fb950,stroke-width:4px,color:#3fb950,font-weight:bold;
```

---

## 🗄️ Database Design

### **Entity Relationship Diagram**

```mermaid
%%{init: {
  "theme": "dark",
  "themeVariables": {
    "primaryColor": "#0d1117",
    "primaryTextColor": "#f7d794",
    "primaryBorderColor": "#d97706",
    "lineColor": "#d97706",
    "secondaryColor": "#f59e0b",
    "tertiaryColor": "#fbbf24",
    "background": "#0d1117",
    "mainBkg": "#0d1117",
    "secondBkg": "#21262d"
  },
  "flowchart": {
    "useMaxWidth": true,
    "htmlLabels": true
  },
  "sequence": {
    "useMaxWidth": true,
    "wrap": true
  }
}}%%
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

      Main Dashboard (Neon Cyan/Blue)

     Payment Components

    %% Financial Services

    %% Transaction Processing

    %% External Payment Gateways

    %% Success Transactions

    %% Decision Points

    %% Database Systems
    %% --- FINANCIAL GOLD THEME STYLING ---
    classDef payment fill:#0d1117,stroke:#d97706,stroke-width:4px,color:#f7d794,font-weight:bold;
    classDef financial fill:#0d1117,stroke:#f59e0b,stroke-width:3px,color:#f7d794,font-weight:normal;
    classDef transaction fill:#21262d,stroke:#d97706,stroke-width:2px,color:#f7d794,font-weight:normal;
    classDef gateway fill:#0d1117,stroke:#fbbf24,stroke-width:2px,color:#fbbf24,font-weight:normal,stroke-dasharray: 3 3;
    classDef success fill:#0d1117,stroke:#3fb950,stroke-width:3px,color:#3fb950,font-weight:bold;
    classDef decision fill:#0d1117,stroke:#d29922,stroke-width:3px,color:#d29922,font-weight:bold,stroke-dasharray: 8 4;
    classDef database fill:#0d1117,stroke:#fbbf24,stroke-width:4px,color:#fbbf24,font-weight:bold;
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
%%{init: {
  "theme": "dark",
  "themeVariables": {
    "primaryColor": "#0d1117",
    "primaryTextColor": "#f7d794",
    "primaryBorderColor": "#d97706",
    "lineColor": "#d97706",
    "secondaryColor": "#f59e0b",
    "tertiaryColor": "#fbbf24",
    "background": "#0d1117",
    "mainBkg": "#0d1117",
    "secondBkg": "#21262d"
  },
  "flowchart": {
    "useMaxWidth": true,
    "htmlLabels": true
  },
  "sequence": {
    "useMaxWidth": true,
    "wrap": true
  }
}}%%
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

      Main Dashboard (Neon Cyan/Blue)

     Payment Components

    %% Financial Services

    %% Transaction Processing

    %% External Payment Gateways

    %% Success Transactions

    %% Decision Points

    %% Database Systems

    %% Node Classifications
    %% --- FINANCIAL GOLD THEME STYLING ---
    classDef payment fill:#0d1117,stroke:#d97706,stroke-width:4px,color:#f7d794,font-weight:bold;
    classDef financial fill:#0d1117,stroke:#f59e0b,stroke-width:3px,color:#f7d794,font-weight:normal;
    classDef transaction fill:#21262d,stroke:#d97706,stroke-width:2px,color:#f7d794,font-weight:normal;
    classDef gateway fill:#0d1117,stroke:#fbbf24,stroke-width:2px,color:#fbbf24,font-weight:normal,stroke-dasharray: 3 3;
    classDef success fill:#0d1117,stroke:#3fb950,stroke-width:3px,color:#3fb950,font-weight:bold;
    classDef decision fill:#0d1117,stroke:#d29922,stroke-width:3px,color:#d29922,font-weight:bold,stroke-dasharray: 8 4;
    classDef database fill:#0d1117,stroke:#fbbf24,stroke-width:4px,color:#fbbf24,font-weight:bold;
    %% Node Classifications
    class A,B,C,D,G,H,I,J,K,L,O process;
    class E,F,M,N secondary;

```

---

## ⚡ Real-time Communication

### **WebSocket Architecture**

```mermaid
%%{init: {
  "theme": "dark",
  "themeVariables": {
    "primaryColor": "#0d1117",
    "primaryTextColor": "#f7d794",
    "primaryBorderColor": "#d97706",
    "lineColor": "#d97706",
    "secondaryColor": "#f59e0b",
    "tertiaryColor": "#fbbf24",
    "background": "#0d1117",
    "mainBkg": "#0d1117",
    "secondBkg": "#21262d"
  },
  "flowchart": {
    "useMaxWidth": true,
    "htmlLabels": true
  },
  "sequence": {
    "useMaxWidth": true,
    "wrap": true
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

      Main Dashboard (Neon Cyan/Blue)

     Payment Components

    %% Financial Services

    %% Transaction Processing

    %% External Payment Gateways

    %% Success Transactions

    %% Decision Points

    %% Database Systems

    %% Node Classifications
    %% --- FINANCIAL GOLD THEME STYLING ---
    classDef payment fill:#0d1117,stroke:#d97706,stroke-width:4px,color:#f7d794,font-weight:bold;
    classDef financial fill:#0d1117,stroke:#f59e0b,stroke-width:3px,color:#f7d794,font-weight:normal;
    classDef transaction fill:#21262d,stroke:#d97706,stroke-width:2px,color:#f7d794,font-weight:normal;
    classDef gateway fill:#0d1117,stroke:#fbbf24,stroke-width:2px,color:#fbbf24,font-weight:normal,stroke-dasharray: 3 3;
    classDef success fill:#0d1117,stroke:#3fb950,stroke-width:3px,color:#3fb950,font-weight:bold;
    classDef decision fill:#0d1117,stroke:#d29922,stroke-width:3px,color:#d29922,font-weight:bold,stroke-dasharray: 8 4;
    classDef database fill:#0d1117,stroke:#fbbf24,stroke-width:4px,color:#fbbf24,font-weight:bold;
    %% Node Classifications
    class A,B,C primary;
    class D,E,F,M process;
    class G,H,I,J secondary;
    class K payment;
    class L database;

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
%%{init: {
  "theme": "dark",
  "themeVariables": {
    "primaryColor": "#0d1117",
    "primaryTextColor": "#f7d794",
    "primaryBorderColor": "#d97706",
    "lineColor": "#d97706",
    "secondaryColor": "#f59e0b",
    "tertiaryColor": "#fbbf24",
    "background": "#0d1117",
    "mainBkg": "#0d1117",
    "secondBkg": "#21262d"
  },
  "flowchart": {
    "useMaxWidth": true,
    "htmlLabels": true
  },
  "sequence": {
    "useMaxWidth": true,
    "wrap": true
  }
}}%%
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

      Main Dashboard (Neon Cyan/Blue)

     Payment Components

    %% Financial Services

    %% Transaction Processing

    %% External Payment Gateways

    %% Success Transactions

    %% Decision Points

    %% Database Systems
    %% --- FINANCIAL GOLD THEME STYLING ---
    classDef payment fill:#0d1117,stroke:#d97706,stroke-width:4px,color:#f7d794,font-weight:bold;
    classDef financial fill:#0d1117,stroke:#f59e0b,stroke-width:3px,color:#f7d794,font-weight:normal;
    classDef transaction fill:#21262d,stroke:#d97706,stroke-width:2px,color:#f7d794,font-weight:normal;
    classDef gateway fill:#0d1117,stroke:#fbbf24,stroke-width:2px,color:#fbbf24,font-weight:normal,stroke-dasharray: 3 3;
    classDef success fill:#0d1117,stroke:#3fb950,stroke-width:3px,color:#3fb950,font-weight:bold;
    classDef decision fill:#0d1117,stroke:#d29922,stroke-width:3px,color:#d29922,font-weight:bold,stroke-dasharray: 8 4;
    classDef database fill:#0d1117,stroke:#fbbf24,stroke-width:4px,color:#fbbf24,font-weight:bold;
```

---

## 🔐 Security Architecture

### **Multi-Layer Security Model**

```mermaid
%%{init: {
  "theme": "dark",
  "themeVariables": {
    "primaryColor": "#0d1117",
    "primaryTextColor": "#f7d794",
    "primaryBorderColor": "#d97706",
    "lineColor": "#d97706",
    "secondaryColor": "#f59e0b",
    "tertiaryColor": "#fbbf24",
    "background": "#0d1117",
    "mainBkg": "#0d1117",
    "secondBkg": "#21262d"
  },
  "flowchart": {
    "useMaxWidth": true,
    "htmlLabels": true
  },
  "sequence": {
    "useMaxWidth": true,
    "wrap": true
  }
}}%%
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

      Main Dashboard (Neon Cyan/Blue)

     Payment Components

    %% Financial Services

    %% Transaction Processing

    %% External Payment Gateways

    %% Success Transactions

    %% Decision Points

    %% Database Systems

    %% Node Classifications
    %% --- FINANCIAL GOLD THEME STYLING ---
    classDef payment fill:#0d1117,stroke:#d97706,stroke-width:4px,color:#f7d794,font-weight:bold;
    classDef financial fill:#0d1117,stroke:#f59e0b,stroke-width:3px,color:#f7d794,font-weight:normal;
    classDef transaction fill:#21262d,stroke:#d97706,stroke-width:2px,color:#f7d794,font-weight:normal;
    classDef gateway fill:#0d1117,stroke:#fbbf24,stroke-width:2px,color:#fbbf24,font-weight:normal,stroke-dasharray: 3 3;
    classDef success fill:#0d1117,stroke:#3fb950,stroke-width:3px,color:#3fb950,font-weight:bold;
    classDef decision fill:#0d1117,stroke:#d29922,stroke-width:3px,color:#d29922,font-weight:bold,stroke-dasharray: 8 4;
    classDef database fill:#0d1117,stroke:#fbbf24,stroke-width:4px,color:#fbbf24,font-weight:bold;
    %% Node Classifications
    class A,D primary;
    class B,E,F process;
    class C gateway;

```

### **Authentication & Authorization Flow**

```mermaid
%%{init: {
  "theme": "dark",
  "themeVariables": {
    "primaryColor": "#0d1117",
    "primaryTextColor": "#aff5b4",
    "primaryBorderColor": "#238636",
    "lineColor": "#238636",
    "secondaryColor": "#2ea043",
    "tertiaryColor": "#3fb950",
    "background": "#0d1117",
    "mainBkg": "#0d1117",
    "secondBkg": "#21262d"
  },
  "flowchart": {
    "useMaxWidth": true,
    "htmlLabels": true
  },
  "sequence": {
    "useMaxWidth": true,
    "wrap": true
  }
}}%%
sequenceDiagram
    autonumber

     Primary Business Components

    %% Secondary Business Components

    %% Process Steps

    %% Decision Points

    %% Success States

    %% External Systems

    %% Database Systems
    %% --- CORPORATE GREEN THEME STYLING ---
    classDef primary fill:#0d1117,stroke:#238636,stroke-width:4px,color:#aff5b4,font-weight:bold;
    classDef secondary fill:#0d1117,stroke:#2ea043,stroke-width:3px,color:#aff5b4,font-weight:normal;
    classDef process fill:#21262d,stroke:#238636,stroke-width:2px,color:#aff5b4,font-weight:normal;
    classDef decision fill:#0d1117,stroke:#d29922,stroke-width:3px,color:#d29922,font-weight:bold,stroke-dasharray: 8 4;
    classDef success fill:#0d1117,stroke:#238636,stroke-width:3px,color:#238636,font-weight:bold;
    classDef external fill:#0d1117,stroke:#2ea043,stroke-width:2px,color:#2ea043,font-weight:normal,stroke-dasharray: 3 3;
    classDef database fill:#0d1117,stroke:#3fb950,stroke-width:4px,color:#3fb950,font-weight:bold;
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
    "primaryTextColor": "#f7d794",
    "primaryBorderColor": "#d97706",
    "lineColor": "#d97706",
    "secondaryColor": "#f59e0b",
    "tertiaryColor": "#fbbf24",
    "background": "#0d1117",
    "mainBkg": "#0d1117",
    "secondBkg": "#21262d"
  },
  "flowchart": {
    "useMaxWidth": true,
    "htmlLabels": true
  },
  "sequence": {
    "useMaxWidth": true,
    "wrap": true
  }
}}%%
graph TB
    subgraph LBL ["Load Balancer Layer"]
        A["Application LB"]
        B["WebSocket LB"]
    end
    
    subgraph APP ["Application Instances"]
        C["API Instance 1"]
        D["API Instance 2"]
        E["API Instance N"]
        F["WS Instance 1"]
        G["WS Instance 2"]
        H["WS Instance N"]
    end
    
    subgraph DATA ["Data Layer"]
        I[("PostgreSQL Primary")]
        J[("PG Read Replica 1")]
        K[("PG Read Replica 2")]
        L[("Redis Cluster")]
    end
    
    subgraph EXT ["External Services"]
        M["Payment Gateways"]
        N["SMS Services"]
        O["Push Notifications"]
    end
    
     Payment Components

    %% Financial Services

    %% Transaction Processing

    %% External Payment Gateways

    %% Success Transactions

    %% Decision Points

    %% Database Systems

    %% Node Classifications
    %% --- FINANCIAL GOLD THEME STYLING ---
    classDef payment fill:#0d1117,stroke:#d97706,stroke-width:4px,color:#f7d794,font-weight:bold;
    classDef financial fill:#0d1117,stroke:#f59e0b,stroke-width:3px,color:#f7d794,font-weight:normal;
    classDef transaction fill:#21262d,stroke:#d97706,stroke-width:2px,color:#f7d794,font-weight:normal;
    classDef gateway fill:#0d1117,stroke:#fbbf24,stroke-width:2px,color:#fbbf24,font-weight:normal,stroke-dasharray: 3 3;
    classDef success fill:#0d1117,stroke:#3fb950,stroke-width:3px,color:#3fb950,font-weight:bold;
    classDef decision fill:#0d1117,stroke:#d29922,stroke-width:3px,color:#d29922,font-weight:bold,stroke-dasharray: 8 4;
    classDef database fill:#0d1117,stroke:#fbbf24,stroke-width:4px,color:#fbbf24,font-weight:bold;
    %% Node Classifications
    class A primary;
    class B gateway;
    class C,D,E,F,G,H,J,K,O process;
    class I,L database;
    class M payment;
    class N secondary;

```

### **Caching Strategy**

```mermaid
%%{init: {
  "theme": "dark",
  "themeVariables": {
    "primaryColor": "#0d1117",
    "primaryTextColor": "#aff5b4",
    "primaryBorderColor": "#238636",
    "lineColor": "#238636",
    "secondaryColor": "#2ea043",
    "tertiaryColor": "#3fb950",
    "background": "#0d1117",
    "mainBkg": "#0d1117",
    "secondBkg": "#21262d"
  },
  "flowchart": {
    "useMaxWidth": true,
    "htmlLabels": true
  },
  "sequence": {
    "useMaxWidth": true,
    "wrap": true
  }
}}%%
graph LR
    A["Client Request"] --> B["API Gateway"]
    B --> C{"Cache Check"}
    
    C -->|Hit| D["Return Cached Data"]
    C -->|Miss| E["Business Logic"]
    
    E --> F[("Database Query")]
    F --> G["Update Cache"]
    G --> H["Return Data"]
    
    subgraph Cache_Layers["Cache Layers"]
        I["Redis - Session Cache"]
        J["Redis - Data Cache"]
        K["CDN - Static Assets"]
        L["Application Cache"]
    end
    
    C -.-> I
    C -.-> J
    C -.-> K
    C -.-> L
    
    G -.-> I
    G -.-> J

     Primary nodes (main components)

     Primary Business Components

    %% Secondary Business Components

    %% Process Steps

    %% Decision Points

    %% Success States

    %% External Systems

    %% Database Systems

    %% Node Classifications
    %% --- CORPORATE GREEN THEME STYLING ---
    classDef primary fill:#0d1117,stroke:#238636,stroke-width:4px,color:#aff5b4,font-weight:bold;
    classDef secondary fill:#0d1117,stroke:#2ea043,stroke-width:3px,color:#aff5b4,font-weight:normal;
    classDef process fill:#21262d,stroke:#238636,stroke-width:2px,color:#aff5b4,font-weight:normal;
    classDef decision fill:#0d1117,stroke:#d29922,stroke-width:3px,color:#d29922,font-weight:bold,stroke-dasharray: 8 4;
    classDef success fill:#0d1117,stroke:#238636,stroke-width:3px,color:#238636,font-weight:bold;
    classDef external fill:#0d1117,stroke:#2ea043,stroke-width:2px,color:#2ea043,font-weight:normal,stroke-dasharray: 3 3;
    classDef database fill:#0d1117,stroke:#3fb950,stroke-width:4px,color:#3fb950,font-weight:bold;
    %% Node Classifications
    class A,L primary;
    class B gateway;
    class D,E,G,H,K process;
    class F,I,J database;

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
    "primaryTextColor": "#aff5b4",
    "primaryBorderColor": "#238636",
    "lineColor": "#238636",
    "secondaryColor": "#2ea043",
    "tertiaryColor": "#3fb950",
    "background": "#0d1117",
    "mainBkg": "#0d1117",
    "secondBkg": "#21262d"
  },
  "flowchart": {
    "useMaxWidth": true,
    "htmlLabels": true
  },
  "sequence": {
    "useMaxWidth": true,
    "wrap": true
  }
}}%%
graph TB
    subgraph Production ["Production Environment"]
        subgraph K8s ["Kubernetes Cluster"]
            A["Ingress Controller"]
            B["API Deployment"]
            C["WebSocket Deployment"]
            D["Worker Deployment"]
            E[("Redis Cache")]
        end
        
        subgraph DB ["Database Layer"]
            F[("PostgreSQL Primary")]
            G[("PostgreSQL Standby")]
        end
        
        subgraph Monitoring ["Observability"]
            H["Prometheus"]
            I["Grafana"]
            J["ELK Stack"]
        end
    end
    
    subgraph CICD ["CI/CD Pipeline"]
        K["Git Repository"]
        L["GitHub Actions"]
        M["Docker Registry"]
        N["Helm/Kustomize"]
    end
    
     Primary nodes (main components)

     Primary Business Components

    %% Secondary Business Components

    %% Process Steps

    %% Decision Points

    %% Success States

    %% External Systems

    %% Database Systems

    %% Node Classifications
    %% --- CORPORATE GREEN THEME STYLING ---
    classDef primary fill:#0d1117,stroke:#238636,stroke-width:4px,color:#aff5b4,font-weight:bold;
    classDef secondary fill:#0d1117,stroke:#2ea043,stroke-width:3px,color:#aff5b4,font-weight:normal;
    classDef process fill:#21262d,stroke:#238636,stroke-width:2px,color:#aff5b4,font-weight:normal;
    classDef decision fill:#0d1117,stroke:#d29922,stroke-width:3px,color:#d29922,font-weight:bold,stroke-dasharray: 8 4;
    classDef success fill:#0d1117,stroke:#238636,stroke-width:3px,color:#238636,font-weight:bold;
    classDef external fill:#0d1117,stroke:#2ea043,stroke-width:2px,color:#2ea043,font-weight:normal,stroke-dasharray: 3 3;
    classDef database fill:#0d1117,stroke:#3fb950,stroke-width:4px,color:#3fb950,font-weight:bold;
    %% Node Classifications
    class A,B,D,H,I,J,K,L,M,N process;
    class C gateway;
    class E,F,G database;

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
%%{init: {
  "theme": "dark",
  "themeVariables": {
    "primaryColor": "#0d1117",
    "primaryTextColor": "#f7d794",
    "primaryBorderColor": "#d97706",
    "lineColor": "#d97706",
    "secondaryColor": "#f59e0b",
    "tertiaryColor": "#fbbf24",
    "background": "#0d1117",
    "mainBkg": "#0d1117",
    "secondBkg": "#21262d"
  },
  "flowchart": {
    "useMaxWidth": true,
    "htmlLabels": true
  },
  "sequence": {
    "useMaxWidth": true,
    "wrap": true
  }
}}%%
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

      Main Dashboard (Neon Cyan/Blue)

     Payment Components

    %% Financial Services

    %% Transaction Processing

    %% External Payment Gateways

    %% Success Transactions

    %% Decision Points

    %% Database Systems

    %% Node Classifications
    %% --- FINANCIAL GOLD THEME STYLING ---
    classDef payment fill:#0d1117,stroke:#d97706,stroke-width:4px,color:#f7d794,font-weight:bold;
    classDef financial fill:#0d1117,stroke:#f59e0b,stroke-width:3px,color:#f7d794,font-weight:normal;
    classDef transaction fill:#21262d,stroke:#d97706,stroke-width:2px,color:#f7d794,font-weight:normal;
    classDef gateway fill:#0d1117,stroke:#fbbf24,stroke-width:2px,color:#fbbf24,font-weight:normal,stroke-dasharray: 3 3;
    classDef success fill:#0d1117,stroke:#3fb950,stroke-width:3px,color:#3fb950,font-weight:bold;
    classDef decision fill:#0d1117,stroke:#d29922,stroke-width:3px,color:#d29922,font-weight:bold,stroke-dasharray: 8 4;
    classDef database fill:#0d1117,stroke:#fbbf24,stroke-width:4px,color:#fbbf24,font-weight:bold;
    %% Node Classifications
    class A,B,C,D,E,F,G,H,I,L,M,N,O,P process;
    class J payment;
    class K secondary;

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
