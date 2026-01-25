# 📋 Business Processes & User Journeys

This document outlines the key business processes and user journeys in the Sikka Transportation Platform, providing detailed workflows for all user types and system interactions.

## 📑 Table of Contents

- [🚗 Trip Booking Process](#-trip-booking-process)
- [👤 User Registration & Verification](#-user-registration--verification)
- [💳 Payment Processing Workflows](#-payment-processing-workflows)
- [⭐ Rating & Review System](#-rating--review-system)
- [🛡️ Admin Management Processes](#️-admin-management-processes)
- [🚨 Emergency & Safety Procedures](#-emergency--safety-procedures)

---

## 🚗 Trip Booking Process

### **Complete Trip Journey**

```mermaid
flowchart TD
    A["Passenger Opens App"] --> B["Enter Destination"]
    B --> C["Select Trip Type"]
    C --> D["View Fare Estimate"]
    D --> E["Confirm Booking"]
    E --> F["Find Available Drivers"]
    
    F --> G{"Driver Available?"}
    G --> |No| H["Notify: No Drivers"]
    G --> |Yes| I["Send Trip Request to Drivers"]
    
    I --> J{"Driver Accepts?"}
    J --> |No| K["Try Next Driver"]
    K --> J
    J --> |Yes| L["Trip Assigned"]
    
    L --> M["Driver Navigates to Pickup"]
    M --> N["Driver Arrives at Pickup"]
    N --> O["Passenger Enters Vehicle"]
    O --> P["Trip Starts"]
    P --> Q["Navigate to Destination"]
    Q --> R["Trip Completed"]
    R --> S["Process Payment"]
    S --> T["Rate & Review"]
    T --> U["Trip Finished"]
    
    H --> V["Suggest Alternative"]
    V --> W["Retry or Cancel"]

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
    class O revNode;
    class P commNode;
    class Q refNode;
    class R earnNode;
    class S main;
    class T decision;
    class U revNode;
    class V commNode;
    class W refNode;
    class Y earnNode;
```

### **Detailed Trip States**

#### **1. Trip Request Phase**
```mermaid
stateDiagram-v2
    [*] --> Requested
    Requested --> Searching: Find drivers
    Searching --> Expired: No response (5 min)
    Searching --> Accepted: Driver accepts
    Expired --> [*]
    Accepted --> DriverEnRoute

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
    class D decision;
    class E revNode;
    class R commNode;
    class S refNode;
```

#### **2. Trip Execution Phase**
```mermaid
stateDiagram-v2
    DriverEnRoute --> DriverArrived: Driver at pickup
    DriverArrived --> InProgress: Passenger enters
    InProgress --> Completed: Reach destination
    InProgress --> Cancelled: Trip cancelled
    Completed --> Rated: Rating submitted
    Rated --> [*]
    Cancelled --> [*]

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

    class C main;
    class D decision;
    class I revNode;
    class R commNode;
```

### **Trip Cancellation Scenarios**

```mermaid
flowchart TD
    A["Trip Active"] --> B{"Who Cancels?"}
    
    B --> |Passenger| C["Passenger Cancellation"]
    B --> |Driver| D["Driver Cancellation"]
    B --> |System| E["System Cancellation"]
    
    C --> F{"Trip Status?"}
    F --> |Requested| G["Free Cancellation"]
    F --> |Accepted| H["Cancellation Fee"]
    F --> |In Progress| I["Full Fare Charge"]
    
    D --> J{"Valid Reason?"}
    J --> |Yes| K["No Penalty"]
    J --> |No| L["Driver Penalty"]
    
    E --> M["System Issues"]
    M --> N["Full Refund"]
    
    G --> O["Update Status"]
    H --> O
    I --> O
    K --> O
    L --> O
    N --> O
    O --> P["Notify All Parties"]
    P --> Q["End Process"]

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
    class O revNode;
    class P commNode;
    class Q refNode;
    class R earnNode;
    class S main;
    class Y decision;
```

---

## 👤 User Registration & Verification

### **Passenger Registration Flow**

```mermaid
sequenceDiagram
    participant P as "Passenger"
    participant A as "Sikka API"
    participant S as "SMS Service"
    participant D as "Database"
    
    P ->> A: Submit Registration (phone, name, email)
    A ->> A: Validate Input
    A ->> D: Check Phone Exists
    D ->> A: Phone Available
    A ->> A: Generate OTP
    A ->> S: Send OTP SMS
    S ->> P: OTP Message
    A ->> P: Registration Pending
    
    P ->> A: Submit OTP
    A ->> A: Verify OTP
    A ->> D: Create User Account
    A ->> D: Create Wallet
    D ->> A: Account Created
    A ->> P: Registration Complete

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
    class D decision;
    class P revNode;
    class S commNode;
```

### **Driver Registration & Verification**

```mermaid
flowchart TD
    A["Driver Applies"] --> B["Submit Personal Info"]
    B --> C["Upload Documents"]
    C --> D["Vehicle Information"]
    D --> E["Background Check"]
    
    E --> F{"Documents Valid?"}
    F --> |No| G["Request Corrections"]
    G --> C
    F --> |Yes| H["Admin Review"]
    
    H --> I{"Admin Approval?"}
    I --> |No| J["Rejection Notice"]
    I --> |Yes| K["Account Activated"]
    
    K --> L["Driver Training"]
    L --> M["Platform Onboarding"]
    M --> N["Ready to Drive"]
    
    J --> O["Appeal Process"]
    O --> H

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
    class O revNode;
    class Y commNode;
```

### **Document Verification Process**

```mermaid
flowchart LR
    A["Driver Uploads"] --> B["Driving License"]
    A --> C["Vehicle Registration"]
    A --> D["Insurance Certificate"]
    A --> E["ID Card/Passport"]
    
    B --> F["OCR Extraction"]
    C --> F
    D --> F
    E --> F
    
    F --> G["Data Validation"]
    G --> H{"Auto-Verify?"}
    
    H --> |Yes| I["Approved"]
    H --> |No| J["Manual Review"]
    
    J --> K{"Admin Decision"}
    K --> |Approve| I
    K --> |Reject| L["Request Resubmission"]
    
    I --> M["Driver Activated"]
    L --> A

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
    class R revNode;
    class Y commNode;
```

---

## 💳 Payment Processing Workflows

### **Multi-Gateway Payment Flow**

```mermaid
flowchart TD
    A[""Trip Completed""] --> B[""Calculate Fare""]
    B --> C[""Select Payment Method""]
    
    C --> D{""Payment Method""}
    D --> |Wallet| E[""Wallet Payment""]
    D --> |EBS| F[""EBS Gateway""]
    D --> |CyberPay| G[""CyberPay Gateway""]
    D --> |Cash| H[""Cash Payment""]
    
    E --> I[""Check Wallet Balance""]
    I --> J{""Sufficient Balance?""}
    J --> |Yes| K[""Deduct Amount""]
    J --> |No| L[""Insufficient Funds""]
    
    F --> M[""EBS Processing""]
    G --> N[""CyberPay Processing""]
    
    M --> O{""EBS Success?""}
    N --> P{""CyberPay Success?""}
    
    O --> |Yes| Q[""Payment Success""]
    O --> |No| R[""EBS Payment Failed""]
    P --> |Yes| Q
    P --> |No| S[""CyberPay Payment Failed""]
    
    H --> T[""Driver Confirms Cash""]
    T --> Q
    
    K --> Q
    L --> U[""Wallet Payment Failed""]
    R --> V[""Payment Failed""]
    S --> V
    U --> V
    
    Q --> W[""Update Balances""]
    W --> X[""Driver Earnings (85%)""]
    W --> Y[""Platform Commission (15%)""]
    W --> Z[""Send Receipt""]
    
    V --> AA[""Retry Payment""]
    AA --> AB[""Alternative Method""]

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
    class AA decision;
    class AB revNode;
    class B commNode;
    class C refNode;
    class D earnNode;
    class E main;
    class EBS decision;
    class F revNode;
    class G commNode;
    class H refNode;
    class I earnNode;
    class J main;
    class K decision;
    class L revNode;
    class M commNode;
    class N refNode;
    class O earnNode;
    class P main;
    class Q decision;
    class R revNode;
    class S commNode;
    class T refNode;
    class U earnNode;
    class V main;
    class W decision;
    class X revNode;
    class Y commNode;
    class Z refNode;
```

### **Wallet Management System**

```mermaid
stateDiagram-v2
    [*] --> Active
    Active --> Suspended: Admin action
    Active --> Frozen: Security issue
    Suspended --> Active: Admin approval
    Frozen --> Active: Issue resolved
    
    Active --> TopUp: Add funds
    TopUp --> Active: Funds added
    
    Active --> Payment: Make payment
    Payment --> Active: Payment success
    Payment --> InsufficientFunds: Low balance
    InsufficientFunds --> Active: Funds added

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
    class F decision;
    class I revNode;
    class P commNode;
    class S refNode;
    class T earnNode;
```

### **Refund Processing**

```mermaid
flowchart TD
    A["Refund Request"] --> B{"Refund Type"}
    
    B --> |Trip Cancellation| C["Cancellation Refund"]
    B --> |Service Issue| D["Service Refund"]
    B --> |Overcharge| E["Adjustment Refund"]
    
    C --> F{"Cancellation Time"}
    F --> |Before Pickup| G["Full Refund"]
    F --> |After Pickup| H["Partial Refund"]
    
    D --> I["Admin Review"]
    I --> J{"Approved?"}
    J --> |Yes| K["Full Refund"]
    J --> |No| L["Refund Denied"]
    
    E --> M["Calculate Difference"]
    M --> N["Process Adjustment"]
    
    G --> O["Process Refund"]
    H --> O
    K --> O
    N --> O
    
    O --> P{"Original Payment Method"}
    P --> |Wallet| Q["Credit Wallet"]
    P --> |Gateway| R["Gateway Refund"]
    
    Q --> S["Refund Complete"]
    R --> T{"Gateway Success?"}
    T --> |Yes| S
    T --> |No| U["Manual Processing"]
    
    L --> V["Notify User"]
    S --> V
    U --> V

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
    class O revNode;
    class P commNode;
    class Q refNode;
    class R earnNode;
    class S main;
    class T decision;
    class U revNode;
    class V commNode;
    class W refNode;
    class Y earnNode;
```

---

## ⭐ Rating & Review System

### **Post-Trip Rating Flow**

```mermaid
sequenceDiagram
    participant P as "Passenger"
    participant D as "Driver"
    participant A as "API"
    participant N as "Notification"
    
    Note over P,D: Trip Completed
    
    A ->> P: Request Rating
    A ->> D: Request Rating
    
    P ->> A: Submit Rating (1-5 stars + comment)
    A ->> A: Validate Rating
    A ->> A: Update Driver Average
    A ->> N: Notify Driver of Rating
    
    D ->> A: Submit Rating (1-5 stars + comment)
    A ->> A: Validate Rating
    A ->> A: Update Passenger Average
    A ->> N: Notify Passenger of Rating
    
    A ->> A: Check for Issues
    A ->> A: Update User Profiles

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
    class D decision;
    class N revNode;
    class P commNode;
```

### **Rating Impact System**

```mermaid
flowchart TD
    A["Rating Submitted"] --> B["Update User Average"]
    B --> C{"Rating Below 3.0?"}
    
    C --> |Yes| D["Flag for Review"]
    C --> |No| E["Normal Processing"]
    
    D --> F{"Multiple Low Ratings?"}
    F --> |Yes| G["Automatic Suspension"]
    F --> |No| H["Warning Notice"]
    
    G --> I["Admin Review Required"]
    H --> J["Performance Monitoring"]
    
    E --> K["Update Profile"]
    K --> L{"Driver Rating > 4.8?"}
    L --> |Yes| M["Premium Driver Status"]
    L --> |No| N["Standard Status"]
    
    I --> O["Manual Investigation"]
    O --> P{"Reinstate?"}
    P --> |Yes| Q["Account Reactivated"]
    P --> |No| R["Permanent Suspension"]

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
    class O revNode;
    class P commNode;
    class Q refNode;
    class R earnNode;
    class Y main;
```

---

## 🛡️ Admin Management Processes

### **User Management Workflow**

```mermaid
flowchart TD
    A["Admin Dashboard"] --> B["User Management"]
    B --> C{"Action Type"}
    
    C --> |View Users| D["List Users"]
    C --> |Suspend User| E["Suspension Process"]
    C --> |Verify Driver| F["Driver Verification"]
    C --> |Handle Dispute| G["Dispute Resolution"]
    
    D --> H["Filter & Search"]
    H --> I["User Details"]
    I --> J["Action Menu"]
    
    E --> K["Select Reason"]
    K --> L["Set Duration"]
    L --> M["Notify User"]
    M --> N["Update Status"]
    
    F --> O["Review Documents"]
    O --> P{"Documents Valid?"}
    P --> |Yes| Q["Approve Driver"]
    P --> |No| R["Request Resubmission"]
    
    G --> S["Review Complaint"]
    S --> T["Investigate Issue"]
    T --> U["Make Decision"]
    U --> V["Implement Resolution"]
    V --> W["Notify Parties"]

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
    class O revNode;
    class P commNode;
    class Q refNode;
    class R earnNode;
    class S main;
    class T decision;
    class U revNode;
    class V commNode;
    class W refNode;
    class Y earnNode;
```

### **Financial Management**

```mermaid
%%{init: {'theme':'base', 'themeVariables': {'primaryColor':'#ff6b6b','primaryTextColor':'#fff','primaryBorderColor':'#ff6b6b','lineColor':'#ffa726','sectionBkgColor':'#ff6b6b','altSectionBkgColor':'#fff','gridColor':'#fff','secondaryColor':'#006100','tertiaryColor':'#fff'}}}%%
flowchart TD
    %% Node Definitions
    A[""Financial Dashboard""] --> B{""Report Type""}
    
    B --> |Revenue| C[""Revenue Analysis""]
    B --> |Commissions| D[""Commission Tracking""]
    B --> |Refunds| E[""Refund Management""]
    B --> |Driver Earnings| F[""Earnings Reports""]
    
    subgraph "RevenueFlow"["" ""]
        direction TB
        C --> G[""Select Period""]
        G --> H[""Visualizations""]
        H --> I[""Export CSV""]
    end
    
    subgraph "CommissionFlow"["" ""]
        direction TB
        D --> J[""Platform (15%)""]
        J --> K[""Driver (85%)""]
        K --> L[""Fee Logic""]
    end
    
    subgraph "RefundFlow"["" ""]
        direction TB
        E --> M[""Review""]
        M --> N[""Process""]
        N --> O[""Sync Logs""]
    end
    
    subgraph "EarningsFlow"["" ""]
        direction TB
        F --> P[""Top Earners""]
        P --> Q[""Metrics""]
        Q --> R[""Incentives""]
    end

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

    %% Applying Classes
    class A main;
    class B decision;
    class C,G,H,I revNode;
    class D,J,K,L commNode;
    class E,M,N,O refNode;
    class F,P,Q,R earnNode;

    %% Subgraph Blending
    style RevenueFlow fill:#0d1117,stroke:#3fb950,stroke-width:1px,stroke-dasharray: 2
    style CommissionFlow fill:#0d1117,stroke:#bc8cff,stroke-width:1px,stroke-dasharray: 2
    style RefundFlow fill:#0d1117,stroke:#ff7b72,stroke-width:1px,stroke-dasharray: 2
    style EarningsFlow fill:#0d1117,stroke:#388bfd,stroke-width:1px,stroke-dasharray: 2
```

### **System Monitoring**

```mermaid
flowchart LR
    A["System Health"] --> B["API Performance"]
    A --> C["Database Status"]
    A --> D["Payment Gateways"]
    A --> E["Real-time Services"]
    
    B --> F["Response Times"]
    B --> G["Error Rates"]
    B --> H["Throughput"]
    
    C --> I["Connection Pool"]
    C --> J["Query Performance"]
    C --> K["Storage Usage"]
    
    D --> L["EBS Status"]
    D --> M["CyberPay Status"]
    D --> N["Success Rates"]
    
    E --> O["WebSocket Connections"]
    E --> P["Active Trips"]
    E --> Q["Driver Locations"]
    
    F --> R["Alerts"]
    G --> R
    H --> R
    I --> R
    J --> R
    K --> R
    L --> R
    M --> R
    N --> R
    O --> R
    P --> R
    Q --> R
    
    R --> S["Notification System"]
    S --> T["Admin Alerts"]
    S --> U["Auto-scaling"]
    S --> V["Incident Response"]

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
    class O revNode;
    class P commNode;
    class Q refNode;
    class R earnNode;
    class S main;
    class T decision;
    class U revNode;
    class V commNode;
```

---

## 🚨 Emergency & Safety Procedures

### **Emergency Response System**

```mermaid
flowchart TD
    A["Emergency Triggered"] --> B{"Emergency Type"}
    
    B --> |Panic Button| C["Immediate Alert"]
    B --> |Accident| D["Accident Protocol"]
    B --> |Route Deviation| E["Safety Check"]
    B --> |No Response| F["Welfare Check"]
    
    C --> G["Alert Emergency Contacts"]
    C --> H["Notify Authorities"]
    C --> I["Track Location"]
    
    D --> J["Emergency Services"]
    D --> K["Insurance Notification"]
    D --> L["Trip Suspension"]
    
    E --> M["Contact Driver"]
    E --> N["Contact Passenger"]
    E --> O["Verify Safety"]
    
    F --> P["Multiple Contact Attempts"]
    F --> Q["Location Tracking"]
    F --> R["Emergency Escalation"]
    
    G --> S["Emergency Response Team"]
    H --> S
    I --> S
    J --> S
    K --> S
    L --> S
    M --> S
    N --> S
    O --> S
    P --> S
    Q --> S
    R --> S
    
    S --> T["Coordinate Response"]
    T --> U["Follow-up Actions"]
    U --> V["Incident Report"]
    V --> W["System Updates"]

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
    class O revNode;
    class P commNode;
    class Q refNode;
    class R earnNode;
    class S main;
    class T decision;
    class U revNode;
    class V commNode;
    class W refNode;
```

### **Safety Verification Process**

```mermaid
sequenceDiagram
    participant S as "System"
    participant D as "Driver"
    participant P as "Passenger"
    participant E as "Emergency Team"
    
    S ->> S: Monitor Trip Progress
    S ->> S: Detect Anomaly
    
    alt Route Deviation
        S ->> D: Route Verification Request
        D ->> S: Explanation/Confirmation
        S ->> P: Safety Check Notification
        P ->> S: Confirm Safety
    else No Response
        S ->> D: Welfare Check
        S ->> P: Welfare Check
        Note over S: Wait 2 minutes
        S ->> E: Escalate to Emergency Team
        E ->> S: Take Control
    else Panic Button
        S ->> E: Immediate Alert
        E ->> S: Emergency Response
        S ->> D: Emergency Notification
        S ->> P: Emergency Notification
    end
    
    S ->> S: Log Incident
    S ->> S: Update Safety Protocols

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

    class D main;
    class E decision;
    class P revNode;
    class S commNode;
```

---

## 📊 Key Performance Indicators (KPIs)

### **Business Metrics**
- **Trip Completion Rate**: Target 95%+
- **Average Response Time**: < 3 minutes
- **Customer Satisfaction**: 4.5+ stars average
- **Driver Utilization**: 70%+ active hours
- **Payment Success Rate**: 98%+

### **Operational Metrics**
- **App Crash Rate**: < 0.1%
- **API Response Time**: < 200ms average
- **System Uptime**: 99.9%+
- **Real-time Update Latency**: < 2 seconds
- **Support Resolution Time**: < 24 hours

### **Financial Metrics**
- **Revenue Growth**: Month-over-month tracking
- **Commission Collection**: 15% platform fee
- **Refund Rate**: < 2% of total transactions
- **Payment Gateway Fees**: Optimized routing
- **Driver Earnings**: 85% of trip fare

---

This comprehensive business process documentation ensures all stakeholders understand the complete user journeys and system workflows within the Sikka Transportation Platform.

