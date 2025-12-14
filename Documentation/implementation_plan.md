# Dynamic Grid with Client-Specific Stored Procedures - Implementation Plan

## Overview

This plan outlines a **flexible, dynamic architecture** where:
- Clients can define their own stored procedures
- API dynamically calls the specified stored procedure
- All stored procedures follow a **standard contract/interface** for AG Grid compatibility
- Frontend remains agnostic to the specific stored procedure being called
- **Inline editing** support for cell-level data updates
- **Infinite scrolling** for seamless data loading without traditional pagination

## Architecture Principles

### 1. **Standard Grid Data Contract**

All stored procedures must return data in a standardized format that AG Grid can consume:

```typescript
interface IGridDataResponse {
  columns: ColumnDefinition[];
  rows: GridRow[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  metadata?: Record<string, any>;
}
```

### 2. **Stored Procedure Naming Convention**

```
sp_Grid_{ClientName}_{EntityName}
Examples:
- sp_Grid_Acme_Employees
- sp_Grid_TechCorp_Projects
- sp_Grid_Global_Invoices
```

### 3. **Standard Input Parameters**

All grid stored procedures must accept these parameters:

```sql
@PageNumber INT = 1,
@PageSize INT = 15,
@SortColumn NVARCHAR(100) = NULL,
@SortDirection NVARCHAR(4) = 'ASC',  -- 'ASC' or 'DESC'
@FilterJson NVARCHAR(MAX) = NULL,     -- JSON string of filters
@SearchTerm NVARCHAR(200) = NULL,

-- For Infinite Scrolling (Server-Side Row Model)
@StartRow INT = NULL,                 -- Starting row index (0-based)
@EndRow INT = NULL                    -- Ending row index (exclusive)
```

**Note:** For infinite scrolling, use `@StartRow` and `@EndRow` instead of `@PageNumber` and `@PageSize`.

### 4. **Infinite Scrolling Support**

The grid supports **AG Grid Server-Side Row Model** for infinite scrolling:

**Benefits:**
- ✅ Load data on-demand as user scrolls
- ✅ Handle millions of rows efficiently
- ✅ Smooth scrolling experience
- ✅ Reduced initial load time

**How It Works:**
1. AG Grid requests data in blocks (e.g., 100 rows at a time)
2. API calls stored procedure with `@StartRow` and `@EndRow`
3. SP returns only the requested rows
4. Grid displays data and requests more as user scrolls

**Stored Procedure Pattern:**
```sql
-- Calculate offset and fetch size
DECLARE @Offset INT = ISNULL(@StartRow, (@PageNumber - 1) * @PageSize);
DECLARE @FetchSize INT = ISNULL(@EndRow - @StartRow, @PageSize);

-- Return rows in the requested range
OFFSET @Offset ROWS
FETCH NEXT @FetchSize ROWS ONLY;
```

### 5. **Inline Editing Support**

The grid supports **row-level editing** with Edit/Save/Cancel action buttons:

**Features:**
- ✅ Click **Edit** button to enable row editing
- ✅ All editable cells in the row become active
- ✅ User can modify multiple fields
- ✅ Click **Save** to commit all changes (single API call)
- ✅ Click **Cancel** to discard changes and revert
- ✅ Visual indicators for edit mode
- ✅ Validation before save
- ✅ Error handling with rollback

**Workflow:**
1. User clicks **Edit** button in Actions column
2. Row enters edit mode (background changes, cells become editable)
3. User edits multiple cells as needed
4. User clicks **Save** → All changes sent to database in one request
5. OR User clicks **Cancel** → All changes discarded, row reverts to original state

**Column Metadata for Editing:**
```sql
-- Result Set 2: Column Metadata includes Actions column and editable flags
SELECT 
    'actions' AS field, 
    'Actions' AS headerName, 
    'actions' AS type, 
    120 AS width, 
    0 AS sortable, 
    0 AS filter,
    0 AS editable,
    NULL AS cellEditor,
    NULL AS cellEditorParams,
    NULL AS columnGroup,
    NULL AS columnGroupShow,
    1 AS pinned  -- Pin Actions column to left
UNION ALL
SELECT 'FullName', 'Full Name', 'string', 200, 1, 1, 
       1 AS editable,  -- Editable when row is in edit mode
       'agTextCellEditor', NULL, 'Personal Info', NULL, 0
UNION ALL
SELECT 'Email', 'Email', 'string', 250, 1, 1, 
       1 AS editable,  -- Editable when row is in edit mode
       'agTextCellEditor', NULL, 'Personal Info', 'open', 0
```

**Update Stored Procedure Required:**
Each grid that supports editing needs a corresponding row-level update procedure:
```sql
CREATE PROCEDURE sp_Grid_Update_{ClientName}_{EntityName}
    @Id INT,
    @ChangesJson NVARCHAR(MAX),  -- JSON: { "Email": "new@email.com", "Salary": 85000 }
    @UserId INT,
    @Success BIT OUTPUT,
    @Message NVARCHAR(500) OUTPUT
AS
BEGIN
    -- Parse JSON changes
    -- Validate all changes
    -- Update multiple fields in single transaction
    -- Return success/error
END
```

**See:** [row_level_editing_guide.md](file:///C:/Users/Sandy/.gemini/antigravity/brain/88f8e8ed-ac65-456f-a896-ac435d7d462d/row_level_editing_guide.md) for complete implementation details.

### 6. **Standard Output Format**

All stored procedures must return:
1. **Result Set 1:** Grid data rows (dynamic columns based on client needs)
2. **Result Set 2:** Column metadata (optional, for dynamic column generation)
3. **Result Set 3:** Total count (single row, single column named `TotalCount`)

---

## Database Schema

### 1. **StoredProcedureRegistry Table**

Track which stored procedures are available and their configurations:

```sql
CREATE TABLE StoredProcedureRegistry (
    Id INT PRIMARY KEY IDENTITY(1,1),
    ProcedureName NVARCHAR(200) NOT NULL UNIQUE,
    DisplayName NVARCHAR(200) NOT NULL,
    Description NVARCHAR(500),
    ClientId INT NULL,  -- FK to Clients table (if multi-tenant)
    Category NVARCHAR(100),  -- e.g., 'HR', 'Finance', 'Operations'
    IsActive BIT DEFAULT 1,
    RequiresAuth BIT DEFAULT 1,
    AllowedRoles NVARCHAR(500),  -- JSON array of role names
    CacheDurationSeconds INT DEFAULT 0,  -- 0 = no cache
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(100),
    UpdatedAt DATETIME2,
    UpdatedBy NVARCHAR(100),
    
    -- Metadata
    ColumnDefinitionsJson NVARCHAR(MAX),  -- Pre-defined column defs (optional)
    DefaultPageSize INT DEFAULT 15,
    MaxPageSize INT DEFAULT 100,
    
    CONSTRAINT CK_SortDirection CHECK (AllowedRoles IS NULL OR ISJSON(AllowedRoles) = 1)
);

CREATE INDEX IX_StoredProcedureRegistry_ProcedureName ON StoredProcedureRegistry(ProcedureName);
CREATE INDEX IX_StoredProcedureRegistry_ClientId ON StoredProcedureRegistry(ClientId);
```

### 2. **GridConfiguration Table** (Optional - for saved grid states)

```sql
CREATE TABLE GridConfigurations (
    Id INT PRIMARY KEY IDENTITY(1,1),
    UserId INT NOT NULL,  -- FK to Users
    ProcedureName NVARCHAR(200) NOT NULL,
    ConfigurationName NVARCHAR(200) NOT NULL,
    ColumnState NVARCHAR(MAX),  -- AG Grid column state JSON
    FilterState NVARCHAR(MAX),  -- AG Grid filter state JSON
    SortState NVARCHAR(MAX),    -- AG Grid sort state JSON
    IsDefault BIT DEFAULT 0,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2,
    
    CONSTRAINT FK_GridConfig_User FOREIGN KEY (UserId) REFERENCES Users(Id),
    CONSTRAINT UQ_GridConfig_UserProcName UNIQUE (UserId, ProcedureName, ConfigurationName)
);
```

---

## Standard Stored Procedure Template

### Template for Client-Specific SPs

```sql
CREATE OR ALTER PROCEDURE sp_Grid_[ClientName]_[EntityName]
    @PageNumber INT = 1,
    @PageSize INT = 15,
    @SortColumn NVARCHAR(100) = NULL,
    @SortDirection NVARCHAR(4) = 'ASC',
    @FilterJson NVARCHAR(MAX) = NULL,
    @SearchTerm NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Validate inputs
    IF @PageSize > 100 SET @PageSize = 100;  -- Max page size
    IF @PageSize < 1 SET @PageSize = 15;
    IF @PageNumber < 1 SET @PageNumber = 1;
    IF @SortDirection NOT IN ('ASC', 'DESC') SET @SortDirection = 'ASC';
    
    DECLARE @Offset INT = (@PageNumber - 1) * @PageSize;
    
    -- Parse filters (if needed)
    -- DECLARE @DepartmentFilter INT = JSON_VALUE(@FilterJson, '$.department');
    
    -- Result Set 1: Grid Data
    -- Client defines their own columns here
    SELECT 
        e.Id,
        e.FirstName + ' ' + e.LastName AS FullName,
        e.Email,
        d.Name AS Department,
        e.Salary,
        FORMAT(e.JoinDate, 'yyyy-MM-dd') AS JoinDate,
        e.Status
        -- Add any client-specific columns
    FROM Employees e
    INNER JOIN Departments d ON e.DepartmentId = d.Id
    WHERE 
        (@SearchTerm IS NULL OR 
         e.FirstName LIKE '%' + @SearchTerm + '%' OR 
         e.LastName LIKE '%' + @SearchTerm + '%' OR 
         e.Email LIKE '%' + @SearchTerm + '%')
    ORDER BY 
        CASE WHEN @SortColumn = 'FullName' AND @SortDirection = 'ASC' 
             THEN e.FirstName END ASC,
        CASE WHEN @SortColumn = 'FullName' AND @SortDirection = 'DESC' 
             THEN e.FirstName END DESC,
        CASE WHEN @SortColumn = 'Email' AND @SortDirection = 'ASC' 
             THEN e.Email END ASC,
        CASE WHEN @SortColumn = 'Email' AND @SortDirection = 'DESC' 
             THEN e.Email END DESC,
        e.Id  -- Default sort
    OFFSET @Offset ROWS
    FETCH NEXT @PageSize ROWS ONLY;
    
    -- Result Set 2: Column Metadata (Optional - for dynamic column generation)
    SELECT 
        'Id' AS field, 'ID' AS headerName, 'number' AS type, 70 AS width, 1 AS sortable, 1 AS filter
    UNION ALL
    SELECT 'FullName', 'Full Name', 'string', 200, 1, 1
    UNION ALL
    SELECT 'Email', 'Email', 'string', 250, 1, 1
    UNION ALL
    SELECT 'Department', 'Department', 'string', 150, 1, 1
    UNION ALL
    SELECT 'Salary', 'Salary', 'number', 120, 1, 1
    UNION ALL
    SELECT 'JoinDate', 'Join Date', 'date', 130, 1, 1
    UNION ALL
    SELECT 'Status', 'Status', 'string', 100, 1, 1;
    
    -- Result Set 3: Total Count
    SELECT COUNT(*) AS TotalCount
    FROM Employees e
    WHERE 
        (@SearchTerm IS NULL OR 
         e.FirstName LIKE '%' + @SearchTerm + '%' OR 
         e.LastName LIKE '%' + @SearchTerm + '%' OR 
         e.Email LIKE '%' + @SearchTerm + '%');
END
GO
```

---

## Backend Implementation

### 1. **DTOs for Dynamic Grid**

**Files to Create:**
- `API/WebAPI/DTOs/GridDataRequest.dto.cs`
- `API/WebAPI/DTOs/GridDataResponse.dto.cs`
- `API/WebAPI/DTOs/ColumnDefinition.dto.cs`
- `API/WebAPI/DTOs/CellUpdateRequest.dto.cs` ⭐ NEW
- `API/WebAPI/DTOs/CellUpdateResponse.dto.cs` ⭐ NEW

**GridDataRequest.cs:**
```csharp
public class GridDataRequest
{
    public string ProcedureName { get; set; } = string.Empty;
    
    // Traditional Pagination
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 15;
    
    // Infinite Scrolling (Server-Side Row Model)
    public int? StartRow { get; set; }
    public int? EndRow { get; set; }
    
    // Sorting & Filtering
    public string? SortColumn { get; set; }
    public string? SortDirection { get; set; } = "ASC";
    public string? FilterJson { get; set; }
    public string? SearchTerm { get; set; }
}
```

**GridDataResponse.cs:**
```csharp
public class GridDataResponse
{
    public List<Dictionary<string, object>> Rows { get; set; } = new();
    public List<ColumnDefinition> Columns { get; set; } = new();
    public int TotalCount { get; set; }
    public int PageNumber { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
    
    // For Infinite Scrolling
    public int? LastRow { get; set; }  // Total rows available (null if unknown)
    
    public Dictionary<string, object>? Metadata { get; set; }
}
```

**ColumnDefinition.cs:**
```csharp
public class ColumnDefinition
{
    public string Field { get; set; } = string.Empty;
    public string HeaderName { get; set; } = string.Empty;
    public string Type { get; set; } = "string";  // string, number, date, boolean
    public int? Width { get; set; }
    public bool Sortable { get; set; } = true;
    public bool Filter { get; set; } = true;
    
    // Inline Editing Support
    public bool Editable { get; set; } = false;
    public string? CellEditor { get; set; }  // 'agTextCellEditor', 'agSelectCellEditor', etc.
    public string? CellEditorParams { get; set; }  // JSON string
    
    public Dictionary<string, object>? CustomProperties { get; set; }
}
```

**CellUpdateRequest.cs:** ⭐ NEW
```csharp
public class CellUpdateRequest
{
    public string ProcedureName { get; set; } = string.Empty;
    public object RowId { get; set; } = null!;  // Primary key value
    public string FieldName { get; set; } = string.Empty;
    public object? NewValue { get; set; }
    public object? OldValue { get; set; }  // For optimistic locking
}
```

**CellUpdateResponse.cs:** ⭐ NEW
```csharp
public class CellUpdateResponse
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public object? UpdatedValue { get; set; }  // Server may transform the value
    public Dictionary<string, object>? UpdatedRow { get; set; }  // Full row if needed
    public string? ErrorCode { get; set; }
}
```

---

### 2. **Dynamic Grid Service**

**Files to Create:**
- `API/WebAPI/Services/IDynamicGridService.cs`
- `API/WebAPI/Services/DynamicGridService.cs`

**IDynamicGridService.cs:**
```csharp
public interface IDynamicGridService
{
    Task<GridDataResponse> ExecuteGridProcedureAsync(GridDataRequest request, string[] userRoles);
    Task<List<StoredProcedureInfo>> GetAvailableProceduresAsync(string[] userRoles);
    Task<bool> ValidateProcedureAccessAsync(string procedureName, string[] userRoles);
}

public class StoredProcedureInfo
{
    public string ProcedureName { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Category { get; set; }
}
```

**DynamicGridService.cs:**
```csharp
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using System.Data;
using System.Text.Json;

public class DynamicGridService : IDynamicGridService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<DynamicGridService> _logger;
    private readonly IConfiguration _configuration;

    public DynamicGridService(
        ApplicationDbContext context,
        ILogger<DynamicGridService> logger,
        IConfiguration configuration)
    {
        _context = context;
        _logger = logger;
        _configuration = configuration;
    }

    public async Task<GridDataResponse> ExecuteGridProcedureAsync(
        GridDataRequest request, 
        string[] userRoles)
    {
        // 1. Validate procedure exists and user has access
        if (!await ValidateProcedureAccessAsync(request.ProcedureName, userRoles))
        {
            throw new UnauthorizedAccessException(
                $"Access denied to procedure: {request.ProcedureName}");
        }

        // 2. Validate and sanitize procedure name (prevent SQL injection)
        if (!IsValidProcedureName(request.ProcedureName))
        {
            throw new ArgumentException("Invalid procedure name");
        }

        // 3. Build parameters
        var parameters = new[]
        {
            new SqlParameter("@PageNumber", request.PageNumber),
            new SqlParameter("@PageSize", request.PageSize),
            new SqlParameter("@SortColumn", (object?)request.SortColumn ?? DBNull.Value),
            new SqlParameter("@SortDirection", request.SortDirection ?? "ASC"),
            new SqlParameter("@FilterJson", (object?)request.FilterJson ?? DBNull.Value),
            new SqlParameter("@SearchTerm", (object?)request.SearchTerm ?? DBNull.Value)
        };

        // 4. Execute stored procedure and read multiple result sets
        var response = new GridDataResponse
        {
            PageNumber = request.PageNumber,
            PageSize = request.PageSize
        };

        using (var connection = _context.Database.GetDbConnection())
        {
            await connection.OpenAsync();
            
            using var command = connection.CreateCommand();
            command.CommandText = request.ProcedureName;
            command.CommandType = CommandType.StoredProcedure;
            
            foreach (var param in parameters)
            {
                command.Parameters.Add(new SqlParameter(param.ParameterName, param.Value));
            }

            using var reader = await command.ExecuteReaderAsync();
            
            // Result Set 1: Grid Data (dynamic columns)
            response.Rows = await ReadDynamicRowsAsync(reader);
            
            // Result Set 2: Column Metadata (optional)
            if (await reader.NextResultAsync())
            {
                response.Columns = await ReadColumnDefinitionsAsync(reader);
            }
            
            // Result Set 3: Total Count
            if (await reader.NextResultAsync())
            {
                if (await reader.ReadAsync())
                {
                    response.TotalCount = reader.GetInt32(0);
                }
            }
        }

        // Calculate total pages
        response.TotalPages = (int)Math.Ceiling(response.TotalCount / (double)request.PageSize);

        return response;
    }

    private async Task<List<Dictionary<string, object>>> ReadDynamicRowsAsync(DbDataReader reader)
    {
        var rows = new List<Dictionary<string, object>>();
        
        while (await reader.ReadAsync())
        {
            var row = new Dictionary<string, object>();
            
            for (int i = 0; i < reader.FieldCount; i++)
            {
                var columnName = reader.GetName(i);
                var value = reader.IsDBNull(i) ? null : reader.GetValue(i);
                row[columnName] = value ?? DBNull.Value;
            }
            
            rows.Add(row);
        }
        
        return rows;
    }

    private async Task<List<ColumnDefinition>> ReadColumnDefinitionsAsync(DbDataReader reader)
    {
        var columns = new List<ColumnDefinition>();
        
        while (await reader.ReadAsync())
        {
            columns.Add(new ColumnDefinition
            {
                Field = reader.GetString(reader.GetOrdinal("field")),
                HeaderName = reader.GetString(reader.GetOrdinal("headerName")),
                Type = reader.GetString(reader.GetOrdinal("type")),
                Width = reader.IsDBNull(reader.GetOrdinal("width")) 
                    ? null 
                    : reader.GetInt32(reader.GetOrdinal("width")),
                Sortable = reader.GetBoolean(reader.GetOrdinal("sortable")),
                Filter = reader.GetBoolean(reader.GetOrdinal("filter"))
            });
        }
        
        return columns;
    }

    public async Task<bool> ValidateProcedureAccessAsync(
        string procedureName, 
        string[] userRoles)
    {
        var registry = await _context.Set<StoredProcedureRegistry>()
            .FirstOrDefaultAsync(sp => 
                sp.ProcedureName == procedureName && 
                sp.IsActive);

        if (registry == null)
        {
            _logger.LogWarning("Procedure not found in registry: {ProcedureName}", procedureName);
            return false;
        }

        // Check if procedure requires auth
        if (!registry.RequiresAuth)
        {
            return true;
        }

        // Check role-based access
        if (!string.IsNullOrEmpty(registry.AllowedRoles))
        {
            var allowedRoles = JsonSerializer.Deserialize<string[]>(registry.AllowedRoles);
            if (allowedRoles != null && !allowedRoles.Intersect(userRoles).Any())
            {
                _logger.LogWarning(
                    "User roles {UserRoles} do not have access to {ProcedureName}", 
                    string.Join(",", userRoles), 
                    procedureName);
                return false;
            }
        }

        return true;
    }

    public async Task<List<StoredProcedureInfo>> GetAvailableProceduresAsync(string[] userRoles)
    {
        var procedures = await _context.Set<StoredProcedureRegistry>()
            .Where(sp => sp.IsActive)
            .ToListAsync();

        var availableProcedures = new List<StoredProcedureInfo>();

        foreach (var proc in procedures)
        {
            // Check if user has access
            if (!proc.RequiresAuth || string.IsNullOrEmpty(proc.AllowedRoles))
            {
                availableProcedures.Add(MapToInfo(proc));
                continue;
            }

            var allowedRoles = JsonSerializer.Deserialize<string[]>(proc.AllowedRoles);
            if (allowedRoles != null && allowedRoles.Intersect(userRoles).Any())
            {
                availableProcedures.Add(MapToInfo(proc));
            }
        }

        return availableProcedures;
    }

    private bool IsValidProcedureName(string procedureName)
    {
        // Only allow alphanumeric, underscore, and must start with sp_Grid_
        return System.Text.RegularExpressions.Regex.IsMatch(
            procedureName, 
            @"^sp_Grid_[a-zA-Z0-9_]+$");
    }

    private StoredProcedureInfo MapToInfo(StoredProcedureRegistry registry)
    {
        return new StoredProcedureInfo
        {
            ProcedureName = registry.ProcedureName,
            DisplayName = registry.DisplayName,
            Description = registry.Description,
            Category = registry.Category
        };
    }
}
```

---

### 3. **API Controller**

**File to Create:**
- `API/WebAPI/Controllers/DynamicGridController.cs`

```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DynamicGridController : ControllerBase
{
    private readonly IDynamicGridService _gridService;
    private readonly ILogger<DynamicGridController> _logger;

    public DynamicGridController(
        IDynamicGridService gridService,
        ILogger<DynamicGridController> logger)
    {
        _gridService = gridService;
        _logger = logger;
    }

    [HttpPost("execute")]
    public async Task<IActionResult> ExecuteGridProcedure([FromBody] GridDataRequest request)
    {
        try
        {
            // Get user roles from JWT token
            var userRoles = User.Claims
                .Where(c => c.Type == ClaimTypes.Role)
                .Select(c => c.Value)
                .ToArray();

            var response = await _gridService.ExecuteGridProcedureAsync(request, userRoles);
            
            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "Unauthorized access to procedure: {ProcedureName}", 
                request.ProcedureName);
            return Forbid();
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid request for procedure: {ProcedureName}", 
                request.ProcedureName);
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing procedure: {ProcedureName}", 
                request.ProcedureName);
            return StatusCode(500, new { error = "An error occurred while processing your request" });
        }
    }

    [HttpGet("available-procedures")]
    public async Task<IActionResult> GetAvailableProcedures()
    {
        try
        {
            var userRoles = User.Claims
                .Where(c => c.Type == ClaimTypes.Role)
                .Select(c => c.Value)
                .ToArray();

            var procedures = await _gridService.GetAvailableProceduresAsync(userRoles);
            
            return Ok(procedures);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving available procedures");
            return StatusCode(500, new { error = "An error occurred while retrieving procedures" });
        }
    }
}
```

---

## Frontend Implementation

### 1. **Dynamic Grid Service**

**File to Create:**
- `Frontend/src/core/services/dynamic-grid.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface GridDataRequest {
  procedureName: string;
  pageNumber: number;
  pageSize: number;
  sortColumn?: string;
  sortDirection?: 'ASC' | 'DESC';
  filterJson?: string;
  searchTerm?: string;
}

export interface GridDataResponse {
  rows: Record<string, any>[];
  columns: ColumnDefinition[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  metadata?: Record<string, any>;
}

export interface ColumnDefinition {
  field: string;
  headerName: string;
  type: string;
  width?: number;
  sortable: boolean;
  filter: boolean;
  editable?: boolean;
  customProperties?: Record<string, any>;
}

export interface StoredProcedureInfo {
  procedureName: string;
  displayName: string;
  description?: string;
  category?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DynamicGridService {
  private apiUrl = `${environment.apiEndpoint}/api/DynamicGrid`;

  constructor(private http: HttpClient) {}

  executeGridProcedure(request: GridDataRequest): Observable<GridDataResponse> {
    return this.http.post<GridDataResponse>(`${this.apiUrl}/execute`, request);
  }

  getAvailableProcedures(): Observable<StoredProcedureInfo[]> {
    return this.http.get<StoredProcedureInfo[]>(`${this.apiUrl}/available-procedures`);
  }
}
```

---

### 2. **Updated Dynamic Grid Demo Component**

**File to Modify:**
- `Frontend/src/shared/components/dynamic-grid/dynamic-grid-demo.ts`

```typescript
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DynamicGrid, GridRow } from './dynamic-grid';
import { ColDef } from 'ag-grid-community';
import { DynamicGridService, GridDataRequest, StoredProcedureInfo } from '../../../core/services/dynamic-grid.service';

@Component({
  selector: 'app-dynamic-grid-demo',
  standalone: true,
  imports: [CommonModule, DynamicGrid, FormsModule],
  template: `
    <div class="demo-container">
      <div class="controls">
        <h2>Dynamic Grid Demo</h2>
        
        <div class="procedure-selector">
          <label for="procedureSelect">Select Data Source:</label>
          <select 
            id="procedureSelect" 
            [(ngModel)]="selectedProcedure" 
            (change)="onProcedureChange()">
            <option value="">-- Select Procedure --</option>
            @for (proc of availableProcedures; track proc.procedureName) {
              <option [value]="proc.procedureName">
                {{ proc.displayName }} 
                @if (proc.category) { ({{ proc.category }}) }
              </option>
            }
          </select>
        </div>

        <div class="search-box">
          <input 
            type="text" 
            [(ngModel)]="searchTerm" 
            (keyup.enter)="loadGridData()"
            placeholder="Search...">
          <button (click)="loadGridData()">Search</button>
        </div>
      </div>

      @if (loading) {
        <div class="loading-spinner">Loading data...</div>
      }
      
      @if (error) {
        <div class="error-message">{{ error }}</div>
      }
      
      @if (!loading && !error && columnDefs.length > 0) {
        <app-dynamic-grid
          [columnDefs]="columnDefs"
          [rowData]="rowData"
          [paginationPageSize]="pageSize"
        ></app-dynamic-grid>
      }
    </div>
  `,
  styles: [`
    .demo-container {
      padding: 20px;
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .controls {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .procedure-selector, .search-box {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    select, input, button {
      padding: 8px 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
    }

    button {
      background-color: #007bff;
      color: white;
      cursor: pointer;
    }

    button:hover {
      background-color: #0056b3;
    }

    .loading-spinner, .error-message {
      padding: 20px;
      text-align: center;
    }

    .error-message {
      color: #dc3545;
      background-color: #f8d7da;
      border: 1px solid #f5c6cb;
      border-radius: 4px;
    }
  `]
})
export class DynamicGridDemoComponent implements OnInit {
  columnDefs: ColDef[] = [];
  rowData: GridRow[] = [];
  loading = false;
  error: string | null = null;
  
  availableProcedures: StoredProcedureInfo[] = [];
  selectedProcedure: string = '';
  searchTerm: string = '';
  pageSize: number = 15;

  constructor(private dynamicGridService: DynamicGridService) {}

  ngOnInit(): void {
    this.loadAvailableProcedures();
  }

  loadAvailableProcedures(): void {
    this.dynamicGridService.getAvailableProcedures().subscribe({
      next: (procedures) => {
        this.availableProcedures = procedures;
        
        // Auto-select first procedure if available
        if (procedures.length > 0) {
          this.selectedProcedure = procedures[0].procedureName;
          this.loadGridData();
        }
      },
      error: (error) => {
        this.error = 'Failed to load available data sources';
        console.error('Error loading procedures:', error);
      }
    });
  }

  onProcedureChange(): void {
    if (this.selectedProcedure) {
      this.loadGridData();
    }
  }

  loadGridData(): void {
    if (!this.selectedProcedure) {
      return;
    }

    this.loading = true;
    this.error = null;

    const request: GridDataRequest = {
      procedureName: this.selectedProcedure,
      pageNumber: 1,
      pageSize: this.pageSize,
      searchTerm: this.searchTerm || undefined
    };

    this.dynamicGridService.executeGridProcedure(request).subscribe({
      next: (response) => {
        // Convert column definitions to AG Grid format
        this.columnDefs = response.columns.map(col => ({
          field: col.field,
          headerName: col.headerName,
          sortable: col.sortable,
          filter: col.filter,
          width: col.width,
          type: col.type === 'number' ? 'numericColumn' : undefined
        }));

        this.rowData = response.rows;
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Failed to load grid data';
        this.loading = false;
        console.error('Error loading grid data:', error);
      }
    });
  }
}
```

---

## Security Considerations

### 1. **Stored Procedure Whitelist**

Only procedures registered in `StoredProcedureRegistry` can be executed.

### 2. **SQL Injection Prevention**

- Procedure name validation with regex
- All parameters are properly parameterized
- No dynamic SQL construction from user input

### 3. **Role-Based Access Control**

- Each procedure has `AllowedRoles` configuration
- User roles validated before execution
- Unauthorized access logged

### 4. **Input Validation**

```csharp
// In DynamicGridService
private void ValidateRequest(GridDataRequest request)
{
    if (request.PageSize > 100) 
        throw new ArgumentException("Page size cannot exceed 100");
    
    if (request.PageSize < 1) 
        throw new ArgumentException("Page size must be at least 1");
    
    if (!string.IsNullOrEmpty(request.SortDirection) && 
        request.SortDirection != "ASC" && 
        request.SortDirection != "DESC")
        throw new ArgumentException("Sort direction must be ASC or DESC");
}
```

---

## Client Onboarding Process

### Steps to Add a New Client's Grid

1. **Client creates their stored procedure** following the standard template
2. **Register the procedure** in `StoredProcedureRegistry`:
   ```sql
   INSERT INTO StoredProcedureRegistry 
   (ProcedureName, DisplayName, Description, Category, AllowedRoles, DefaultPageSize)
   VALUES 
   ('sp_Grid_Acme_Employees', 'Acme Employees', 'Employee list for Acme Corp', 
    'HR', '["Admin", "HR Manager"]', 15);
   ```
3. **Test the procedure** using the API endpoint
4. **Frontend automatically picks up** the new procedure in the dropdown

---

## Advantages of This Approach

✅ **Flexibility:** Each client can have custom data structures  
✅ **Scalability:** Easy to add new grids without code changes  
✅ **Security:** Centralized access control and validation  
✅ **Maintainability:** Standard contract makes it predictable  
✅ **Performance:** Clients can optimize their own SPs  
✅ **Multi-tenancy Ready:** Easy to isolate client data  

---

## File Summary

### New Files (Backend)
1. `Models/StoredProcedureRegistry.cs`
2. `Models/GridConfiguration.cs` (optional)
3. `DTOs/GridDataRequest.cs`
4. `DTOs/GridDataResponse.cs`
5. `DTOs/ColumnDefinition.cs`
6. `Services/IDynamicGridService.cs`
7. `Services/DynamicGridService.cs`
8. `Controllers/DynamicGridController.cs`
9. `Database/Migrations/AddStoredProcedureRegistry.cs`
10. `Database/StoredProcedures/sp_Grid_Template.sql` (template for clients)

### Modified Files (Backend)
1. `Data/ApplicationDbContext.cs` - Add DbSets
2. `Program.cs` - Register DynamicGridService

### New Files (Frontend)
1. `src/core/services/dynamic-grid.service.ts`

### Modified Files (Frontend)
1. `src/shared/components/dynamic-grid/dynamic-grid-demo.ts`

---

## Next Steps

1. Review this dynamic architecture approach
2. Confirm the standard contract meets your needs
3. Decide on additional metadata requirements
4. Plan for caching strategy (if needed)
5. Determine client onboarding workflow
