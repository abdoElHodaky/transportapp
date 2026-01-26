# 🚗 Trip Purpose Diagrams

This document contains comprehensive trip-related diagrams with eye-catching distinguished styling according to the Mermaid styling guide.

## 🎯 Trip Lifecycle Overview

### **Complete Trip Journey Flow**

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#FF6F00',
    'primaryTextColor': '#ffffff',
    'primaryBorderColor': '#E65100',
    'lineColor': '#FF8F00',
    'secondaryColor': '#FFA726',
    'tertiaryColor': '#FFE0B2',
    'background': '#ffffff',
    'mainBkg': '#FF6F00',
    'secondBkg': '#FFA726',
    'tertiaryBkg': '#FFE0B2'
  }
}}%%

flowchart TD
    %% Phase 1: Trip Initiation
    subgraph "📱 Trip Initiation"
        A[📱 Passenger Opens App<br/>🔐 Authentication Check<br/>📍 Location Permission]
        B[🗺️ Enter Destination<br/>📍 Address/Map Selection<br/>🔍 Location Validation]
        C[🚗 Select Trip Type<br/>⭐ Standard/Premium/Shared<br/>💰 View Pricing Options]
    end

    %% Phase 2: Booking & Matching
    subgraph "🎯 Booking & Driver Matching"
        D[💰 Fare Calculation<br/>📏 Distance + Time Estimate<br/>🚦 Traffic Consideration]
        E[✅ Confirm Booking<br/>💳 Payment Method Selection<br/>📝 Trip Details Review]
        F[🔍 Driver Search<br/>📡 Radius-based Matching<br/>⏱️ Real-time Availability]
        G{🚗 Driver Found?<br/>📍 Within Service Area<br/>⏰ Response Timeout}
    end

    %% Phase 3: Trip Execution
    subgraph "🚀 Trip Execution"
        H[✅ Driver Accepts<br/>🚗 Driver Assignment<br/>📱 Passenger Notification]
        I[🛣️ Driver En Route<br/>📍 Real-time Tracking<br/>⏱️ ETA Updates]
        J[📍 Driver Arrives<br/>🔔 Arrival Notification<br/>📱 Contact Options]
        K[🚀 Trip Starts<br/>📊 Live Tracking<br/>🗺️ Route Navigation]
    end

    %% Phase 4: Completion & Payment
    subgraph "🏁 Trip Completion"
        L[🏁 Destination Reached<br/>⏹️ Trip End Confirmation<br/>📊 Journey Summary]
        M[💳 Payment Processing<br/>🏦 Gateway Integration<br/>💰 Fare Calculation]
        N[⭐ Rating & Review<br/>📝 Feedback Collection<br/>🎯 Service Improvement]
        O[📧 Trip Receipt<br/>📊 Journey Details<br/>💾 History Update]
    end

    %% Error Handling
    subgraph "❌ Exception Handling"
        P[❌ No Driver Available<br/>🔄 Retry Options<br/>📞 Support Contact]
        Q[🚫 Trip Cancellation<br/>💰 Refund Processing<br/>📝 Cancellation Reason]
        R[🚨 Emergency Support<br/>📞 Emergency Contacts<br/>🛡️ Safety Protocols]
    end

    %% Flow Connections
    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
    
    G -->|✅ Driver Found| H
    G -->|❌ No Driver| P
    
    H --> I
    I --> J
    J --> K
    K --> L
    L --> M
    M --> N
    N --> O
    
    %% Cancellation flows
    H -.->|🚫 Cancel| Q
    I -.->|🚫 Cancel| Q
    J -.->|🚫 Cancel| Q
    K -.->|🚫 Cancel| Q
    
    %% Emergency flows
    K -.->|🚨 Emergency| R
    
    %% Retry flows
    P -.->|🔄 Retry| F

    %% Eye-catching Business Process Styling
    classDef tripInitiation fill:#FF6F00,stroke:#E65100,stroke-width:4px,color:#ffffff,font-weight:bold
    classDef bookingMatching fill:#FFA726,stroke:#FF8F00,stroke-width:4px,color:#ffffff,font-weight:bold
    classDef tripExecution fill:#FFB74D,stroke:#FF9800,stroke-width:4px,color:#ffffff,font-weight:bold
    classDef tripCompletion fill:#4CAF50,stroke:#388E3C,stroke-width:4px,color:#ffffff,font-weight:bold
    classDef exceptionHandling fill:#F44336,stroke:#D32F2F,stroke-width:3px,color:#ffffff,font-weight:bold
    classDef decisionNode fill:#2196F3,stroke:#1976D2,stroke-width:5px,color:#ffffff,font-weight:bold,stroke-dasharray: 8 4

    class A,B,C tripInitiation
    class D,E,F tripExecution
    class H,I,J,K tripExecution
    class L,M,N,O tripCompletion
    class P,Q,R exceptionHandling
    class G decisionNode
```

## 🔄 Trip State Management

### **Comprehensive Trip State Diagram**

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#FF6F00',
    'primaryTextColor': '#ffffff',
    'primaryBorderColor': '#E65100',
    'lineColor': '#FF8F00',
    'secondaryColor': '#FFA726',
    'tertiaryColor': '#FFE0B2',
    'background': '#ffffff',
    'mainBkg': '#FF6F00',
    'secondBkg': '#FFA726',
    'tertiaryBkg': '#FFE0B2'
  }
}}%%

stateDiagram-v2
    [*] --> TripRequested : 📱 User Requests Trip
    
    TripRequested --> SearchingDriver : 🔍 Finding Available Drivers
    TripRequested --> Cancelled : ❌ User Cancels Before Match
    
    SearchingDriver --> DriverAssigned : ✅ Driver Accepts Request
    SearchingDriver --> NoDriverFound : ⏰ Search Timeout (5 min)
    SearchingDriver --> Cancelled : ❌ User Cancels During Search
    
    NoDriverFound --> SearchingDriver : 🔄 Retry Search
    NoDriverFound --> Cancelled : ❌ User Gives Up
    
    DriverAssigned --> DriverEnRoute : 🚗 Driver Heading to Pickup
    DriverAssigned --> Cancelled : ❌ Driver/User Cancels
    
    DriverEnRoute --> DriverArrived : 📍 Driver at Pickup Location
    DriverEnRoute --> Cancelled : ❌ Driver/User Cancels
    DriverEnRoute --> DriverLate : ⏰ Delayed Arrival (>15 min)
    
    DriverLate --> DriverArrived : 📍 Driver Finally Arrives
    DriverLate --> Cancelled : ❌ Excessive Delay Cancellation
    
    DriverArrived --> TripStarted : 🚀 Passenger Enters Vehicle
    DriverArrived --> Cancelled : ❌ No-show Cancellation
    DriverArrived --> WaitingPassenger : ⏰ Waiting for Passenger
    
    WaitingPassenger --> TripStarted : 🚀 Passenger Arrives
    WaitingPassenger --> Cancelled : ❌ Passenger No-show
    
    TripStarted --> TripInProgress : 🛣️ Journey in Progress
    TripStarted --> Emergency : 🚨 Emergency Situation
    
    TripInProgress --> TripCompleted : 🏁 Arrived at Destination
    TripInProgress --> Emergency : 🚨 Emergency During Trip
    TripInProgress --> TripPaused : ⏸️ Temporary Stop
    
    TripPaused --> TripInProgress : ▶️ Resume Journey
    TripPaused --> TripCompleted : 🏁 End at Current Location
    
    Emergency --> TripCompleted : ✅ Emergency Resolved
    Emergency --> Cancelled : 🚫 Trip Terminated
    
    TripCompleted --> PaymentProcessing : 💳 Processing Payment
    
    PaymentProcessing --> PaymentCompleted : ✅ Payment Successful
    PaymentProcessing --> PaymentFailed : ❌ Payment Failed
    
    PaymentFailed --> PaymentRetry : 🔄 Retry Payment
    PaymentFailed --> PaymentPending : ⏳ Manual Review Required
    
    PaymentRetry --> PaymentCompleted : ✅ Payment Successful
    PaymentRetry --> PaymentPending : ❌ Multiple Failures
    
    PaymentCompleted --> RatingPending : ⭐ Awaiting User Rating
    PaymentPending --> RatingPending : ⭐ Skip to Rating
    
    RatingPending --> TripFinalized : ⭐ Rating Submitted
    RatingPending --> TripFinalized : ⏰ Rating Timeout (24h)
    
    TripFinalized --> [*] : ✅ Trip Complete
    Cancelled --> [*] : ❌ Trip Cancelled

    %% Eye-catching Business Process State Styling
    classDef activeState fill:#FF6F00,stroke:#E65100,stroke-width:4px,color:#ffffff,font-weight:bold
    classDef waitingState fill:#FFA726,stroke:#FF8F00,stroke-width:3px,color:#ffffff,font-weight:bold
    classDef progressState fill:#FFB74D,stroke:#FF9800,stroke-width:4px,color:#ffffff,font-weight:bold
    classDef completedState fill:#4CAF50,stroke:#388E3C,stroke-width:4px,color:#ffffff,font-weight:bold
    classDef errorState fill:#F44336,stroke:#D32F2F,stroke-width:3px,color:#ffffff,font-weight:bold
    classDef emergencyState fill:#FF5722,stroke:#D84315,stroke-width:5px,color:#ffffff,font-weight:bold
    classDef paymentState fill:#9C27B0,stroke:#7B1FA2,stroke-width:4px,color:#ffffff,font-weight:bold

    class TripRequested,DriverAssigned,TripStarted activeState
    class SearchingDriver,DriverEnRoute,DriverArrived,WaitingPassenger,RatingPending waitingState
    class TripInProgress,TripPaused progressState
    class TripCompleted,PaymentCompleted,TripFinalized completedState
    class Cancelled,NoDriverFound,DriverLate,PaymentFailed errorState
    class Emergency emergencyState
    class PaymentProcessing,PaymentRetry,PaymentPending paymentState
```

## 🎯 Driver Matching Algorithm

### **Smart Driver Assignment Process**

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#FF6F00',
    'primaryTextColor': '#ffffff',
    'primaryBorderColor': '#E65100',
    'lineColor': '#FF8F00',
    'secondaryColor': '#FFA726',
    'tertiaryColor': '#FFE0B2',
    'background': '#ffffff',
    'mainBkg': '#FF6F00',
    'secondBkg': '#FFA726',
    'tertiaryBkg': '#FFE0B2'
  }
}}%%

flowchart TD
    %% Input Parameters
    subgraph "📍 Trip Parameters"
        A[📍 Pickup Location<br/>🎯 Destination<br/>⏰ Requested Time]
        B[🚗 Trip Type<br/>💰 Fare Estimate<br/>👥 Passenger Count]
    end

    %% Driver Discovery
    subgraph "🔍 Driver Discovery"
        C[📡 Geospatial Query<br/>📏 Radius Search (5km)<br/>🗺️ PostGIS Integration]
        D[✅ Filter Available Drivers<br/>📊 Status: Online & Available<br/>🚗 Vehicle Type Match]
        E[📊 Driver Scoring<br/>⭐ Rating Weight (40%)<br/>📏 Distance Weight (35%)<br/>⏰ Response Time (25%)]
    end

    %% Matching Logic
    subgraph "🎯 Smart Matching"
        F[📈 Calculate Match Score<br/>🧮 Weighted Algorithm<br/>📊 Real-time Metrics]
        G[📋 Rank Drivers<br/>🥇 Best Match First<br/>📊 Score Descending]
        H{🎯 Top Driver Available?<br/>📱 Online Status<br/>⏰ Response Window}
    end

    %% Assignment Process
    subgraph "✅ Assignment Process"
        I[📱 Send Trip Request<br/>🔔 Push Notification<br/>⏰ 30-second Window]
        J{📱 Driver Response?<br/>✅ Accept/❌ Decline<br/>⏰ Timeout Check}
        K[✅ Assignment Confirmed<br/>🔗 Create Trip Connection<br/>📊 Update Driver Status]
    end

    %% Fallback Handling
    subgraph "🔄 Fallback Strategy"
        L[📋 Next Best Driver<br/>🔄 Iterate Through List<br/>📊 Score Threshold Check]
        M[📡 Expand Search Radius<br/>📏 Increase to 10km<br/>🔍 Broader Discovery]
        N[❌ No Driver Available<br/>📞 Suggest Alternatives<br/>⏰ Schedule for Later]
    end

    %% Flow Connections
    A --> C
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H
    
    H -->|✅ Available| I
    H -->|❌ Unavailable| L
    
    I --> J
    J -->|✅ Accepts| K
    J -->|❌ Declines/Timeout| L
    
    L --> H
    L -->|🔄 No More Drivers| M
    M --> C
    M -->|🔄 Still No Drivers| N

    %% Eye-catching Business Process Styling
    classDef tripParameters fill:#FF6F00,stroke:#E65100,stroke-width:4px,color:#ffffff,font-weight:bold
    classDef driverDiscovery fill:#FFA726,stroke:#FF8F00,stroke-width:4px,color:#ffffff,font-weight:bold
    classDef smartMatching fill:#FFB74D,stroke:#FF9800,stroke-width:4px,color:#ffffff,font-weight:bold
    classDef assignmentProcess fill:#4CAF50,stroke:#388E3C,stroke-width:4px,color:#ffffff,font-weight:bold
    classDef fallbackStrategy fill:#FF9800,stroke:#F57C00,stroke-width:3px,color:#ffffff,font-weight:bold
    classDef decisionNode fill:#2196F3,stroke:#1976D2,stroke-width:5px,color:#ffffff,font-weight:bold,stroke-dasharray: 8 4
    classDef errorNode fill:#F44336,stroke:#D32F2F,stroke-width:3px,color:#ffffff,font-weight:bold

    class A,B tripParameters
    class C,D,E driverDiscovery
    class F,G smartMatching
    class I,K assignmentProcess
    class L,M fallbackStrategy
    class H,J decisionNode
    class N errorNode
```

## 💰 Trip Pricing Engine

### **Dynamic Fare Calculation System**

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#FF6F00',
    'primaryTextColor': '#ffffff',
    'primaryBorderColor': '#E65100',
    'lineColor': '#FF8F00',
    'secondaryColor': '#FFA726',
    'tertiaryColor': '#FFE0B2',
    'background': '#ffffff',
    'mainBkg': '#FF6F00',
    'secondBkg': '#FFA726',
    'tertiaryBkg': '#FFE0B2'
  }
}}%%

flowchart TD
    %% Base Calculation
    subgraph "📊 Base Fare Calculation"
        A[📏 Distance Calculation<br/>🗺️ Route Optimization<br/>📍 Pickup to Destination]
        B[⏰ Time Estimation<br/>🚦 Traffic Analysis<br/>📊 Historical Data]
        C[💰 Base Rate Application<br/>💵 Per KM Rate: 2.5 SDG<br/>⏱️ Per Minute Rate: 0.5 SDG]
    end

    %% Dynamic Factors
    subgraph "📈 Dynamic Pricing Factors"
        D[🌡️ Demand Analysis<br/>📊 Real-time Requests<br/>📈 Supply vs Demand]
        E[⏰ Time-based Multiplier<br/>🌅 Peak Hours (7-9 AM)<br/>🌆 Evening Rush (5-7 PM)]
        F[🌦️ Weather Conditions<br/>☔ Rain Surge: +20%<br/>🌪️ Storm Surge: +50%]
        G[🎉 Special Events<br/>🏟️ Stadium Events<br/>🎊 Holidays & Festivals]
    end

    %% Calculation Engine
    subgraph "🧮 Pricing Engine"
        H[💰 Calculate Base Fare<br/>📏 Distance × Rate<br/>⏰ Time × Rate]
        I[📊 Apply Surge Multiplier<br/>📈 Demand Factor<br/>⏰ Time Factor]
        J[🌦️ Weather Adjustment<br/>☔ Condition Multiplier<br/>📊 Safety Premium]
        K[🎉 Event Surcharge<br/>🏟️ Location-based<br/>📅 Date-based Premium]
    end

    %% Final Processing
    subgraph "✅ Final Fare Processing"
        L[💰 Total Fare Calculation<br/>🧮 Sum All Components<br/>📊 Minimum Fare Check]
        M[🎯 Fare Optimization<br/>💰 Competitive Analysis<br/>📊 Market Rate Check]
        N[💳 Payment Breakdown<br/>💰 Trip Fare<br/>💸 Platform Fee<br/>⭐ Driver Earnings]
        O[📱 Display to User<br/>💰 Transparent Pricing<br/>📊 Fare Breakdown]
    end

    %% Flow Connections
    A --> H
    B --> H
    C --> H
    
    D --> I
    E --> I
    F --> J
    G --> K
    
    H --> I
    I --> J
    J --> K
    K --> L
    L --> M
    M --> N
    N --> O

    %% Eye-catching Business Process Styling
    classDef baseFare fill:#FF6F00,stroke:#E65100,stroke-width:4px,color:#ffffff,font-weight:bold
    classDef dynamicFactors fill:#FFA726,stroke:#FF8F00,stroke-width:4px,color:#ffffff,font-weight:bold
    classDef pricingEngine fill:#FFB74D,stroke:#FF9800,stroke-width:4px,color:#ffffff,font-weight:bold
    classDef finalProcessing fill:#4CAF50,stroke:#388E3C,stroke-width:4px,color:#ffffff,font-weight:bold

    class A,B,C baseFare
    class D,E,F,G dynamicFactors
    class H,I,J,K pricingEngine
    class L,M,N,O finalProcessing
```

## 📍 Real-time Trip Tracking

### **Live Location & Status Updates**

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#FF6F00',
    'primaryTextColor': '#ffffff',
    'primaryBorderColor': '#E65100',
    'lineColor': '#FF8F00',
    'secondaryColor': '#FFA726',
    'tertiaryColor': '#FFE0B2',
    'background': '#ffffff',
    'mainBkg': '#FF6F00',
    'secondBkg': '#FFA726',
    'tertiaryBkg': '#FFE0B2'
  }
}}%%

sequenceDiagram
    participant P as 📱 Passenger App
    participant WS as ⚡ WebSocket Gateway
    participant TS as 🚗 Trip Service
    participant LS as 📍 Location Service
    participant D as 🚗 Driver App
    participant DB as 🗄️ Database
    participant PN as 🔔 Push Notifications

    Note over P,PN: 🚀 Trip Started - Real-time Tracking Begins

    %% Initial Setup
    P->>WS: 🔗 Connect to Trip Room
    D->>WS: 🔗 Connect to Trip Room
    WS->>TS: ✅ Room Setup Complete
    
    %% Location Updates Loop
    loop 📍 Every 10 seconds
        D->>LS: 📍 Send GPS Coordinates
        LS->>DB: 💾 Store Location Data
        LS->>WS: 📡 Broadcast Location Update
        WS->>P: 📍 Real-time Position
        WS->>TS: 📊 Update Trip Progress
    end

    %% ETA Calculations
    LS->>TS: 🧮 Calculate ETA
    TS->>WS: ⏰ Updated ETA
    WS->>P: ⏰ ETA Notification

    %% Route Deviations
    alt 🛣️ Route Deviation Detected
        LS->>TS: 🚨 Route Change Alert
        TS->>WS: 📢 Route Update
        WS->>P: 🗺️ New Route Information
        TS->>PN: 🔔 Route Change Notification
    end

    %% Traffic Updates
    LS->>TS: 🚦 Traffic Condition Update
    TS->>WS: 📊 Traffic Alert
    WS->>P: 🚦 Traffic Information
    WS->>D: 🚦 Alternative Route Suggestion

    %% Milestone Updates
    alt 📍 Approaching Destination
        LS->>TS: 🎯 Near Destination (500m)
        TS->>WS: 📢 Arrival Soon
        WS->>P: 🏁 Arriving Soon Notification
        TS->>PN: 🔔 Arrival Alert
    end

    %% Trip Completion
    D->>TS: 🏁 Trip Completed
    TS->>DB: 💾 Final Trip Data
    TS->>WS: ✅ Trip Complete
    WS->>P: 🏁 Trip Finished
    WS->>D: ✅ Trip Confirmed
    TS->>PN: 🎉 Trip Complete Notification
```

## 🚨 Emergency & Safety Protocols

### **Emergency Response System**

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#F44336',
    'primaryTextColor': '#ffffff',
    'primaryBorderColor': '#D32F2F',
    'lineColor': '#FF5722',
    'secondaryColor': '#FF9800',
    'tertiaryColor': '#FFECB3',
    'background': '#ffffff',
    'mainBkg': '#F44336',
    'secondBkg': '#FF9800',
    'tertiaryBkg': '#FFECB3'
  }
}}%%

flowchart TD
    %% Emergency Triggers
    subgraph "🚨 Emergency Triggers"
        A[🚨 Panic Button Pressed<br/>📱 In-app Emergency<br/>🔴 One-touch Activation]
        B[📞 Emergency Call<br/>☎️ Direct Call to 999<br/>📱 Auto-dial Feature]
        C[🤖 Automatic Detection<br/>📊 Unusual Route Deviation<br/>⏰ Extended Trip Duration]
        D[👥 Third-party Report<br/>📞 Family/Friend Alert<br/>🔔 External Notification]
    end

    %% Immediate Response
    subgraph "⚡ Immediate Response"
        E[🚨 Emergency Alert Triggered<br/>📍 Capture Current Location<br/>📊 Trip Context Collection]
        F[📡 Multi-channel Notification<br/>🚨 Emergency Services<br/>👮 Local Police<br/>🏥 Medical Services]
        G[👨‍👩‍👧‍👦 Family Notification<br/>📱 Emergency Contacts<br/>📍 Live Location Sharing]
        H[🎧 Support Team Alert<br/>📞 24/7 Emergency Hotline<br/>👨‍💼 Escalation Protocol]
    end

    %% Tracking & Monitoring
    subgraph "📍 Enhanced Monitoring"
        I[📍 Continuous GPS Tracking<br/>📊 High-frequency Updates<br/>🗺️ Real-time Map View]
        J[📹 Trip Recording<br/>🎤 Audio Recording<br/>📱 Screen Capture]
        K[🚗 Driver Communication<br/>📱 Direct Contact<br/>📞 Voice Channel]
        L[👮 Authority Coordination<br/>🚨 Police Dispatch<br/>📍 Location Sharing]
    end

    %% Resolution Process
    subgraph "✅ Resolution & Follow-up"
        M[✅ Emergency Resolved<br/>👮 Authority Confirmation<br/>📊 Incident Report]
        N[📋 Incident Documentation<br/>📝 Detailed Report<br/>📊 Evidence Collection]
        O[🔍 Investigation Process<br/>👨‍💼 Internal Review<br/>📊 Safety Analysis]
        P[📈 Safety Improvements<br/>🛡️ Protocol Updates<br/>📚 Training Enhancement]
    end

    %% Flow Connections
    A --> E
    B --> E
    C --> E
    D --> E
    
    E --> F
    E --> G
    E --> H
    
    F --> I
    G --> I
    H --> I
    
    I --> J
    I --> K
    I --> L
    
    J --> M
    K --> M
    L --> M
    
    M --> N
    N --> O
    O --> P

    %% Emergency Styling
    classDef emergencyTrigger fill:#F44336,stroke:#D32F2F,stroke-width:5px,color:#ffffff,font-weight:bold
    classDef immediateResponse fill:#FF5722,stroke:#D84315,stroke-width:4px,color:#ffffff,font-weight:bold
    classDef enhancedMonitoring fill:#FF9800,stroke:#F57C00,stroke-width:4px,color:#ffffff,font-weight:bold
    classDef resolutionProcess fill:#4CAF50,stroke:#388E3C,stroke-width:4px,color:#ffffff,font-weight:bold

    class A,B,C,D emergencyTrigger
    class E,F,G,H immediateResponse
    class I,J,K,L enhancedMonitoring
    class M,N,O,P resolutionProcess
```

---

## 📊 Summary

These comprehensive trip purpose diagrams provide:

- **🎯 Complete Trip Lifecycle**: From initiation to completion with all possible states
- **🔄 State Management**: Detailed state transitions with error handling
- **🎯 Smart Matching**: Advanced driver assignment algorithm
- **💰 Dynamic Pricing**: Comprehensive fare calculation system
- **📍 Real-time Tracking**: Live location and status updates
- **🚨 Emergency Protocols**: Complete safety and emergency response system

All diagrams follow the **eye-catching distinguished styling** with:
- **Warm orange business process theme** for user-friendly workflows
- **Professional visual hierarchy** with proper stroke widths and fonts
- **Enhanced emoji communication** for quick visual reference
- **Mermaid v11+ compatibility** for optimal rendering

