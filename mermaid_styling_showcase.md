# Distinguished Mermaid Styling Showcase

This file demonstrates the different styling themes applied to each document type.

## Architecture Theme (Tech Blue)

```mermaid
%%{init: {
  "theme": "dark",
  "themeVariables": {
    "primaryColor": "#0d1117",
    "primaryTextColor": "#c9d1d9",
    "primaryBorderColor": "#1f6feb",
    "lineColor": "#1f6feb"
  },
  "flowchart": {
    "useMaxWidth": true,
    "htmlLabels": true
  }
}}%%
graph TB
    A["API Gateway"] --> B["Authentication Service"]
    B --> C[("PostgreSQL")]
    
    classDef primary fill:#0d1117,stroke:#1f6feb,stroke-width:4px,color:#c9d1d9,font-weight:bold;
    classDef database fill:#0d1117,stroke:#79c0ff,stroke-width:4px,color:#79c0ff,font-weight:bold;
    
    class A primary;
    class B primary;
    class C database;
```

## Business Process Theme (Corporate Green)

```mermaid
%%{init: {
  "theme": "dark",
  "themeVariables": {
    "primaryColor": "#0d1117",
    "primaryTextColor": "#aff5b4",
    "primaryBorderColor": "#238636",
    "lineColor": "#238636"
  },
  "flowchart": {
    "useMaxWidth": true,
    "htmlLabels": true
  }
}}%%
graph TB
    A["Trip Request"] --> B["Driver Assignment"]
    B --> C["Trip Completion"]
    
    classDef primary fill:#0d1117,stroke:#238636,stroke-width:4px,color:#aff5b4,font-weight:bold;
    classDef success fill:#0d1117,stroke:#3fb950,stroke-width:3px,color:#3fb950,font-weight:bold;
    
    class A primary;
    class B primary;
    class C success;
```

## Database Schema Theme (Data Purple)

```mermaid
%%{init: {
  "theme": "dark",
  "themeVariables": {
    "primaryColor": "#0d1117",
    "primaryTextColor": "#e9d5ff",
    "primaryBorderColor": "#8b5cf6",
    "lineColor": "#8b5cf6"
  },
  "er": {
    "useMaxWidth": true
  }
}}%%
erDiagram
    USER ||--o{ TRIP : creates
    DRIVER ||--o{ TRIP : accepts
    
    classDef primary fill:#0d1117,stroke:#8b5cf6,stroke-width:4px,color:#e9d5ff,font-weight:bold;
```

## System Overview Theme (Orange Gradient)

```mermaid
%%{init: {
  "theme": "dark",
  "themeVariables": {
    "primaryColor": "#0d1117",
    "primaryTextColor": "#ffe8cc",
    "primaryBorderColor": "#fd7e14",
    "lineColor": "#fd7e14"
  },
  "flowchart": {
    "useMaxWidth": true,
    "htmlLabels": true
  }
}}%%
graph TB
    A["Mobile Apps"] --> B["System Core"]
    B --> C["External Services"]
    
    classDef primary fill:#0d1117,stroke:#fd7e14,stroke-width:4px,color:#ffe8cc,font-weight:bold;
    classDef external fill:#0d1117,stroke:#ff922b,stroke-width:2px,color:#ff922b,font-weight:normal,stroke-dasharray: 3 3;
    
    class A primary;
    class B primary;
    class C external;
```

## WebSocket Events Theme (Electric Cyan)

```mermaid
%%{init: {
  "theme": "dark",
  "themeVariables": {
    "primaryColor": "#0d1117",
    "primaryTextColor": "#cffafe",
    "primaryBorderColor": "#06b6d4",
    "lineColor": "#06b6d4"
  },
  "sequence": {
    "useMaxWidth": true,
    "wrap": true
  }
}}%%
sequenceDiagram
    participant C as "Client"
    participant S as "Server"
    
    C->>S: Connect
    S->>C: Connected
    
    classDef primary fill:#0d1117,stroke:#06b6d4,stroke-width:4px,color:#cffafe,font-weight:bold;
```

## Driver Flow Theme (Professional Gold)

```mermaid
%%{init: {
  "theme": "dark",
  "themeVariables": {
    "primaryColor": "#0d1117",
    "primaryTextColor": "#fef3c7",
    "primaryBorderColor": "#d97706",
    "lineColor": "#d97706"
  },
  "flowchart": {
    "useMaxWidth": true,
    "htmlLabels": true
  }
}}%%
graph TB
    A["Driver Login"] --> B["Accept Trip"]
    B --> C["Complete Trip"]
    
    classDef primary fill:#0d1117,stroke:#d97706,stroke-width:4px,color:#fef3c7,font-weight:bold;
    classDef success fill:#0d1117,stroke:#059669,stroke-width:3px,color:#059669,font-weight:bold;
    
    class A primary;
    class B primary;
    class C success;
```

## Passenger Flow Theme (Royal Purple)

```mermaid
%%{init: {
  "theme": "dark",
  "themeVariables": {
    "primaryColor": "#0d1117",
    "primaryTextColor": "#ddd6fe",
    "primaryBorderColor": "#7c3aed",
    "lineColor": "#7c3aed"
  },
  "flowchart": {
    "useMaxWidth": true,
    "htmlLabels": true
  }
}}%%
graph TB
    A["Passenger App"] --> B["Request Trip"]
    B --> C["Trip Completed"]
    
    classDef primary fill:#0d1117,stroke:#7c3aed,stroke-width:4px,color:#ddd6fe,font-weight:bold;
    classDef success fill:#0d1117,stroke:#059669,stroke-width:3px,color:#059669,font-weight:bold;
    
    class A primary;
    class B primary;
    class C success;
```

## Backend Development Theme (Matrix Green)

```mermaid
%%{init: {
  "theme": "dark",
  "themeVariables": {
    "primaryColor": "#0d1117",
    "primaryTextColor": "#ccffcc",
    "primaryBorderColor": "#00ff41",
    "lineColor": "#00ff41"
  },
  "flowchart": {
    "useMaxWidth": true,
    "htmlLabels": true
  }
}}%%
graph TB
    A["Backend API"] --> B["Database Layer"]
    B --> C["Business Logic"]
    
    classDef primary fill:#0d1117,stroke:#00ff41,stroke-width:4px,color:#ccffcc,font-weight:bold;
    classDef database fill:#0d1117,stroke:#39ff14,stroke-width:4px,color:#39ff14,font-weight:bold;
    
    class A primary;
    class B database;
    class C primary;
```

## Theme Summary

Each document type now has its own distinctive visual identity:

- **Architecture**: Professional tech blue for system architecture
- **Business Processes**: Corporate green for business workflows
- **Database Schema**: Data purple for database diagrams
- **System Overview**: Orange gradient for system overviews
- **WebSocket Events**: Electric cyan for real-time communications
- **Driver Flow**: Professional gold for driver journeys
- **Passenger Flow**: Royal purple for passenger journeys
- **Backend Development**: Matrix green for development tasks
