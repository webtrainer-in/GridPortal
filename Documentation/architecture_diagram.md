# Dynamic Grid Architecture - Visual Overview

## System Architecture

```mermaid
graph TB
    subgraph Frontend["Frontend (Angular)"]
        UI[Dynamic Grid Component]
        Service[Dynamic Grid Service]
        UI -->|1. Select Procedure| Service
        UI -->|2. Request Data| Service
    end

    subgraph API["Web API (.NET)"]
        Controller[Dynamic Grid Controller]
        GridService[Dynamic Grid Service]
        Validator[Security Validator]
        
        Service -->|HTTP POST| Controller
        Controller -->|3. Validate & Execute| GridService
        GridService -->|4. Check Access| Validator
    end

    subgraph Database["SQL Server Database"]
        Registry[(Stored Procedure<br/>Registry Table)]
        SP1[sp_Grid_Client1_Employees]
        SP2[sp_Grid_Client2_Projects]
        SP3[sp_Grid_Client3_Invoices]
        Tables[(Client Tables)]
        
        Validator -->|5. Verify Access| Registry
        GridService -->|6. Execute SP| SP1
        GridService -.->|Or Execute| SP2
        GridService -.->|Or Execute| SP3
        SP1 -->|7. Query Data| Tables
        SP2 -.-> Tables
        SP3 -.-> Tables
    end

    GridService -->|8. Return Results| Controller
    Controller -->|9. JSON Response| Service
    Service -->|10. Display Data| UI

    style UI fill:#e1f5ff
    style Service fill:#e1f5ff
    style Controller fill:#fff4e1
    style GridService fill:#fff4e1
    style Validator fill:#ffe1e1
    style Registry fill:#e1ffe1
    style SP1 fill:#f0e1ff
    style SP2 fill:#f0e1ff
    style SP3 fill:#f0e1ff
```

---

## Data Flow Sequence

```mermaid
sequenceDiagram
    participant User
    participant Component as Dynamic Grid<br/>Component
    participant Service as Dynamic Grid<br/>Service
    participant API as API Controller
    participant GridSvc as Grid Service
    participant Registry as SP Registry
    participant SP as Stored<br/>Procedure
    participant DB as Database

    User->>Component: 1. Select procedure from dropdown
    Component->>Service: 2. executeGridProcedure(request)
    Service->>API: 3. POST /api/DynamicGrid/execute
    
    API->>API: 4. Extract user roles from JWT
    API->>GridSvc: 5. ExecuteGridProcedureAsync(request, roles)
    
    GridSvc->>Registry: 6. Validate procedure exists
    Registry-->>GridSvc: 7. Procedure metadata
    
    GridSvc->>GridSvc: 8. Check role-based access
    
    alt Access Granted
        GridSvc->>SP: 9. EXEC sp_Grid_XXX with parameters
        SP->>DB: 10. Query tables with JOINs
        DB-->>SP: 11. Result sets
        SP-->>GridSvc: 12. Return 3 result sets:<br/>- Data rows<br/>- Column metadata<br/>- Total count
        GridSvc->>GridSvc: 13. Parse result sets
        GridSvc-->>API: 14. GridDataResponse
        API-->>Service: 15. JSON response
        Service-->>Component: 16. GridDataResponse
        Component->>Component: 17. Map columns to AG Grid
        Component->>User: 18. Display grid with data
    else Access Denied
        GridSvc-->>API: Error: Unauthorized
        API-->>Service: 403 Forbidden
        Service-->>Component: Error
        Component->>User: Show error message
    end
```

---

## Standard Stored Procedure Contract

```mermaid
graph LR
    subgraph Input["Standard Input Parameters"]
        P1[PageNumber: INT]
        P2[PageSize: INT]
        P3[SortColumn: NVARCHAR]
        P4[SortDirection: NVARCHAR]
        P5[FilterJson: NVARCHAR MAX]
        P6[SearchTerm: NVARCHAR]
    end

    subgraph SP["Client Stored Procedure<br/>sp_Grid_XXX"]
        Logic[Business Logic<br/>JOINs, Filters, Sorting]
    end

    subgraph Output["Standard Output (3 Result Sets)"]
        RS1["Result Set 1:<br/>Grid Data Rows<br/>(Dynamic Columns)"]
        RS2["Result Set 2:<br/>Column Metadata<br/>(field, headerName, type, etc.)"]
        RS3["Result Set 3:<br/>Total Count<br/>(Single INT value)"]
    end

    P1 --> SP
    P2 --> SP
    P3 --> SP
    P4 --> SP
    P5 --> SP
    P6 --> SP

    SP --> RS1
    SP --> RS2
    SP --> RS3

    style SP fill:#f0e1ff
    style Input fill:#e1f5ff
    style Output fill:#e1ffe1
```

---

## Security Layers

```mermaid
graph TD
    Request[API Request]
    
    Request --> L1{Layer 1:<br/>Authentication}
    L1 -->|No JWT| Reject1[401 Unauthorized]
    L1 -->|Valid JWT| L2{Layer 2:<br/>Procedure Exists?}
    
    L2 -->|Not in Registry| Reject2[404 Not Found]
    L2 -->|In Registry| L3{Layer 3:<br/>Procedure Active?}
    
    L3 -->|Inactive| Reject3[403 Forbidden]
    L3 -->|Active| L4{Layer 4:<br/>Role-Based Access}
    
    L4 -->|No Access| Reject4[403 Forbidden]
    L4 -->|Has Access| L5{Layer 5:<br/>Valid SP Name?}
    
    L5 -->|Invalid Format| Reject5[400 Bad Request]
    L5 -->|Valid Format| L6{Layer 6:<br/>Input Validation}
    
    L6 -->|Invalid Params| Reject6[400 Bad Request]
    L6 -->|Valid Params| Execute[Execute Stored Procedure]
    
    Execute --> Success[200 OK with Data]
    
    style Request fill:#e1f5ff
    style Execute fill:#e1ffe1
    style Success fill:#c8ffc8
    style Reject1 fill:#ffcccc
    style Reject2 fill:#ffcccc
    style Reject3 fill:#ffcccc
    style Reject4 fill:#ffcccc
    style Reject5 fill:#ffcccc
    style Reject6 fill:#ffcccc
```

---

## Client Onboarding Workflow

```mermaid
graph LR
    subgraph Client["Client Team"]
        C1[1. Define Data<br/>Requirements]
        C2[2. Create Stored<br/>Procedure]
        C3[3. Test SP<br/>Locally]
    end

    subgraph Admin["Admin/DBA"]
        A1[4. Review SP<br/>for Security]
        A2[5. Deploy SP to<br/>Database]
        A3[6. Register in<br/>SP Registry Table]
        A4[7. Set Allowed<br/>Roles]
    end

    subgraph System["System (Automatic)"]
        S1[8. API Discovers<br/>New SP]
        S2[9. Frontend Shows<br/>in Dropdown]
    end

    subgraph User["End User"]
        U1[10. Select & Use<br/>New Grid]
    end

    C1 --> C2 --> C3 --> A1
    A1 --> A2 --> A3 --> A4
    A4 --> S1 --> S2 --> U1

    style Client fill:#e1f5ff
    style Admin fill:#fff4e1
    style System fill:#e1ffe1
    style User fill:#f0e1ff
```

---

## Example: Multi-Client Scenario

```mermaid
graph TB
    subgraph Frontend["Single Frontend Application"]
        Grid[Dynamic Grid Component]
    end

    subgraph API["Shared API"]
        DGS[Dynamic Grid Service]
    end

    subgraph Database["Database"]
        subgraph Client1["Client 1: Acme Corp"]
            SP1[sp_Grid_Acme_Employees]
            T1[(Employees Table)]
            T2[(Departments Table)]
            SP1 --> T1
            SP1 --> T2
        end

        subgraph Client2["Client 2: TechCorp"]
            SP2[sp_Grid_Tech_Projects]
            T3[(Projects Table)]
            T4[(Teams Table)]
            T5[(Milestones Table)]
            SP2 --> T3
            SP2 --> T4
            SP2 --> T5
        end

        subgraph Client3["Client 3: GlobalInc"]
            SP3[sp_Grid_Global_Invoices]
            T6[(Invoices Table)]
            T7[(Customers Table)]
            T8[(Payments Table)]
            SP3 --> T6
            SP3 --> T7
            SP3 --> T8
        end
    end

    Grid -->|Request with<br/>procedureName| DGS
    DGS -.->|Execute| SP1
    DGS -.->|Execute| SP2
    DGS -.->|Execute| SP3

    style Grid fill:#e1f5ff
    style DGS fill:#fff4e1
    style Client1 fill:#ffe1e1
    style Client2 fill:#e1ffe1
    style Client3 fill:#e1e1ff
```

---

## Column Definition Mapping

```mermaid
graph LR
    subgraph SP["Stored Procedure<br/>Result Set 2"]
        SPCol["field: 'FullName'<br/>headerName: 'Full Name'<br/>type: 'string'<br/>width: 200<br/>sortable: true<br/>filter: true"]
    end

    subgraph Backend["Backend DTO"]
        DTO["ColumnDefinition {<br/>  Field: 'FullName',<br/>  HeaderName: 'Full Name',<br/>  Type: 'string',<br/>  Width: 200,<br/>  Sortable: true,<br/>  Filter: true<br/>}"]
    end

    subgraph Frontend["Frontend AG Grid"]
        AGGrid["ColDef {<br/>  field: 'FullName',<br/>  headerName: 'Full Name',<br/>  width: 200,<br/>  sortable: true,<br/>  filter: true,<br/>  type: undefined<br/>}"]
    end

    SPCol -->|JSON| DTO
    DTO -->|HTTP Response| AGGrid

    style SP fill:#f0e1ff
    style Backend fill:#fff4e1
    style Frontend fill:#e1f5ff
```

---

## Caching Strategy (Optional Enhancement)

```mermaid
graph TB
    Request[API Request]
    
    Request --> Cache{Check Cache}
    Cache -->|Cache Hit| Return1[Return Cached Data]
    Cache -->|Cache Miss| Execute[Execute SP]
    
    Execute --> Store[Store in Cache]
    Store --> Return2[Return Fresh Data]
    
    subgraph CacheConfig["Cache Configuration<br/>(Per Procedure in Registry)"]
        Duration[CacheDurationSeconds]
        Key[Cache Key:<br/>ProcedureName + Parameters]
    end
    
    Duration -.->|Configure TTL| Store
    Key -.->|Generate Key| Cache

    style Request fill:#e1f5ff
    style Cache fill:#fff4e1
    style Execute fill:#f0e1ff
    style Store fill:#e1ffe1
    style Return1 fill:#c8ffc8
    style Return2 fill:#c8ffc8
```

---

## Error Handling Flow

```mermaid
graph TD
    Start[API Request]
    
    Start --> Try{Try Execute}
    
    Try -->|Success| Success[200 OK]
    
    Try -->|UnauthorizedAccessException| E1[Log Warning]
    E1 --> R1[403 Forbidden]
    
    Try -->|ArgumentException| E2[Log Warning]
    E2 --> R2[400 Bad Request]
    
    Try -->|SqlException| E3[Log Error]
    E3 --> R3[500 Internal Server Error]
    
    Try -->|Other Exception| E4[Log Error]
    E4 --> R4[500 Internal Server Error]
    
    Success --> Client[Client Receives Data]
    R1 --> Client2[Client Shows Error]
    R2 --> Client2
    R3 --> Client2
    R4 --> Client2

    style Success fill:#c8ffc8
    style R1 fill:#ffcccc
    style R2 fill:#ffcccc
    style R3 fill:#ffcccc
    style R4 fill:#ffcccc
    style Client fill:#e1f5ff
    style Client2 fill:#ffe1e1
```
