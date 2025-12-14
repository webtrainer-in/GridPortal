# Inline Editing & Infinite Scrolling - Implementation Guide

## Overview

This guide covers the implementation of two advanced AG Grid features:
1. **Inline Editing** - Row-level editing with Edit/Save/Cancel action buttons (Primary approach)
2. **Infinite Scrolling** - Load data on-demand as user scrolls (Server-Side Row Model)

> **Note:** For complete row-level editing implementation with Edit/Save/Cancel buttons, see [row_level_editing_guide.md](file:///C:/Users/Sandy/.gemini/antigravity/brain/88f8e8ed-ac65-456f-a896-ac435d7d462d/row_level_editing_guide.md)

This document covers the technical foundation for both features. The row-level editing guide provides the recommended user experience pattern.

---

## Part 1: Infinite Scrolling

### AG Grid Server-Side Row Model

**Benefits:**
- Handle millions of rows without loading all data
- Smooth scrolling experience
- Reduced memory footprint
- On-demand data loading

### Frontend Implementation

#### 1. Update Dynamic Grid Service

**File: `Frontend/src/core/services/dynamic-grid.service.ts`**

```typescript
export interface GridDataRequest {
  procedureName: string;
  
  // Traditional Pagination
  pageNumber?: number;
  pageSize?: number;
  
  // Infinite Scrolling
  startRow?: number;
  endRow?: number;
  
  // Sorting & Filtering
  sortColumn?: string;
  sortDirection?: 'ASC' | 'DESC';
  filterJson?: string;
  searchTerm?: string;
}

export interface GridDataResponse {
  rows: Record<string, any>[];
  columns: ColumnDefinition[];
  totalCount: number;
  pageNumber?: number;
  pageSize?: number;
  totalPages?: number;
  lastRow?: number;  // For infinite scrolling
  metadata?: Record<string, any>;
}
```

#### 2. Configure AG Grid for Server-Side Row Model

**File: `Frontend/src/shared/components/dynamic-grid/dynamic-grid.ts`**

```typescript
import { Component, Input, OnInit } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { 
  ColDef, 
  GridApi, 
  GridReadyEvent,
  IServerSideDatasource,
  IServerSideGetRowsParams,
  ServerSideStoreType
} from 'ag-grid-community';
import { DynamicGridService } from '../../../core/services/dynamic-grid.service';

@Component({
  selector: 'app-dynamic-grid',
  standalone: true,
  imports: [AgGridAngular],
  template: `
    <ag-grid-angular
      class="ag-theme-alpine"
      [columnDefs]="columnDefs"
      [rowModelType]="rowModelType"
      [serverSideDatasource]="serverSideDatasource"
      [cacheBlockSize]="cacheBlockSize"
      [maxBlocksInCache]="maxBlocksInCache"
      [pagination]="pagination"
      [paginationPageSize]="paginationPageSize"
      [animateRows]="true"
      [enableCellChangeFlash]="true"
      (gridReady)="onGridReady($event)"
      (cellValueChanged)="onCellValueChanged($event)"
    ></ag-grid-angular>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    
    .ag-theme-alpine {
      width: 100%;
      height: 100%;
    }
  `]
})
export class DynamicGrid implements OnInit {
  @Input() procedureName: string = '';
  @Input() columnDefs: ColDef[] = [];
  @Input() useInfiniteScroll: boolean = true;  // Toggle between modes
  @Input() cacheBlockSize: number = 100;  // Rows per block
  @Input() maxBlocksInCache: number = 10;  // Max blocks in memory
  @Input() paginationPageSize: number = 15;
  
  rowModelType: 'serverSide' | 'clientSide' = 'serverSide';
  pagination: boolean = false;
  serverSideDatasource?: IServerSideDatasource;
  
  private gridApi?: GridApi;

  constructor(private dynamicGridService: DynamicGridService) {}

  ngOnInit(): void {
    this.rowModelType = this.useInfiniteScroll ? 'serverSide' : 'clientSide';
    this.pagination = !this.useInfiniteScroll;
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    
    if (this.useInfiniteScroll) {
      this.setupServerSideDatasource();
    }
  }

  private setupServerSideDatasource(): void {
    const datasource: IServerSideDatasource = {
      getRows: (params: IServerSideGetRowsParams) => {
        console.log('Requesting rows:', params.request);
        
        const request = {
          procedureName: this.procedureName,
          startRow: params.request.startRow,
          endRow: params.request.endRow,
          sortColumn: params.request.sortModel[0]?.colId,
          sortDirection: params.request.sortModel[0]?.sort?.toUpperCase() as 'ASC' | 'DESC',
          filterJson: JSON.stringify(params.request.filterModel)
        };

        this.dynamicGridService.executeGridProcedure(request).subscribe({
          next: (response) => {
            // Update column definitions if provided
            if (response.columns && response.columns.length > 0) {
              this.updateColumnDefinitions(response.columns);
            }
            
            // Success callback with rows and last row
            params.success({
              rowData: response.rows,
              rowCount: response.lastRow ?? response.totalCount
            });
          },
          error: (error) => {
            console.error('Error loading grid data:', error);
            params.fail();
          }
        });
      }
    };

    this.serverSideDatasource = datasource;
    this.gridApi?.setServerSideDatasource(datasource);
  }

  private updateColumnDefinitions(columns: any[]): void {
    const colDefs: ColDef[] = columns.map(col => ({
      field: col.field,
      headerName: col.headerName,
      sortable: col.sortable,
      filter: col.filter,
      width: col.width,
      editable: col.editable,
      cellEditor: col.cellEditor,
      cellEditorParams: col.cellEditorParams ? JSON.parse(col.cellEditorParams) : undefined,
      type: col.type === 'number' ? 'numericColumn' : undefined
    }));

    this.columnDefs = colDefs;
    this.gridApi?.setColumnDefs(colDefs);
  }

  onCellValueChanged(event: any): void {
    // Handle inline editing (see Part 2)
  }
}
```

### Backend Implementation

#### Update DynamicGridService

**File: `API/WebAPI/Services/DynamicGridService.cs`**

```csharp
public async Task<GridDataResponse> ExecuteGridProcedureAsync(
    GridDataRequest request, 
    string[] userRoles)
{
    // Validate access...
    
    // Build parameters - support both pagination modes
    var parameters = new List<SqlParameter>
    {
        new SqlParameter("@PageNumber", request.PageNumber),
        new SqlParameter("@PageSize", request.PageSize),
        new SqlParameter("@StartRow", (object?)request.StartRow ?? DBNull.Value),
        new SqlParameter("@EndRow", (object?)request.EndRow ?? DBNull.Value),
        new SqlParameter("@SortColumn", (object?)request.SortColumn ?? DBNull.Value),
        new SqlParameter("@SortDirection", request.SortDirection ?? "ASC"),
        new SqlParameter("@FilterJson", (object?)request.FilterJson ?? DBNull.Value),
        new SqlParameter("@SearchTerm", (object?)request.SearchTerm ?? DBNull.Value)
    };

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
            command.Parameters.Add(param);
        }

        using var reader = await command.ExecuteReaderAsync();
        
        // Result Set 1: Grid Data
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
                response.LastRow = response.TotalCount;  // For infinite scroll
            }
        }
    }

    // Calculate total pages for traditional pagination
    if (request.PageSize > 0)
    {
        response.TotalPages = (int)Math.Ceiling(response.TotalCount / (double)request.PageSize);
    }

    return response;
}
```

### Updated Stored Procedure Template

```sql
CREATE OR ALTER PROCEDURE sp_Grid_[ClientName]_[EntityName]
    @PageNumber INT = 1,
    @PageSize INT = 15,
    @StartRow INT = NULL,
    @EndRow INT = NULL,
    @SortColumn NVARCHAR(100) = NULL,
    @SortDirection NVARCHAR(4) = 'ASC',
    @FilterJson NVARCHAR(MAX) = NULL,
    @SearchTerm NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Determine offset and fetch size
    DECLARE @Offset INT;
    DECLARE @FetchSize INT;
    
    IF @StartRow IS NOT NULL AND @EndRow IS NOT NULL
    BEGIN
        -- Infinite scrolling mode
        SET @Offset = @StartRow;
        SET @FetchSize = @EndRow - @StartRow;
    END
    ELSE
    BEGIN
        -- Traditional pagination mode
        SET @Offset = (@PageNumber - 1) * @PageSize;
        SET @FetchSize = @PageSize;
    END
    
    -- Validate inputs
    IF @FetchSize > 1000 SET @FetchSize = 1000;  -- Max block size
    IF @FetchSize < 1 SET @FetchSize = 100;
    IF @SortDirection NOT IN ('ASC', 'DESC') SET @SortDirection = 'ASC';
    
    -- Result Set 1: Grid Data
    SELECT 
        e.Id,
        e.FirstName + ' ' + e.LastName AS FullName,
        e.Email,
        d.Name AS Department,
        e.Salary,
        FORMAT(e.JoinDate, 'yyyy-MM-dd') AS JoinDate,
        e.Status
    FROM Employees e
    INNER JOIN Departments d ON e.DepartmentId = d.Id
    WHERE 
        (@SearchTerm IS NULL OR 
         e.FirstName LIKE '%' + @SearchTerm + '%' OR 
         e.LastName LIKE '%' + @SearchTerm + '%')
    ORDER BY 
        CASE WHEN @SortColumn = 'FullName' AND @SortDirection = 'ASC' 
             THEN e.FirstName END ASC,
        CASE WHEN @SortColumn = 'FullName' AND @SortDirection = 'DESC' 
             THEN e.FirstName END DESC,
        e.Id
    OFFSET @Offset ROWS
    FETCH NEXT @FetchSize ROWS ONLY;
    
    -- Result Set 2: Column Metadata
    SELECT 
        'Id' AS field, 'ID' AS headerName, 'number' AS type, 70 AS width, 
        1 AS sortable, 1 AS filter, 0 AS editable, NULL AS cellEditor, NULL AS cellEditorParams
    UNION ALL
    SELECT 'FullName', 'Full Name', 'string', 200, 1, 1, 1, 'agTextCellEditor', NULL
    UNION ALL
    SELECT 'Email', 'Email', 'string', 250, 1, 1, 1, 'agTextCellEditor', NULL
    UNION ALL
    SELECT 'Department', 'Department', 'string', 150, 1, 1, 0, NULL, NULL
    UNION ALL
    SELECT 'Salary', 'Salary', 'number', 120, 1, 1, 1, 'agNumberCellEditor', NULL
    UNION ALL
    SELECT 'JoinDate', 'Join Date', 'date', 130, 1, 1, 1, 'agDateCellEditor', NULL
    UNION ALL
    SELECT 'Status', 'Status', 'string', 100, 1, 1, 1, 'agSelectCellEditor', 
           '{"values":["Active","Inactive"]}';
    
    -- Result Set 3: Total Count
    SELECT COUNT(*) AS TotalCount
    FROM Employees e
    WHERE 
        (@SearchTerm IS NULL OR 
         e.FirstName LIKE '%' + @SearchTerm + '%' OR 
         e.LastName LIKE '%' + @SearchTerm + '%');
END
GO
```

---

## Part 2: Inline Editing

### Frontend Implementation

#### 1. Handle Cell Value Changes

**In `dynamic-grid.ts`:**

```typescript
onCellValueChanged(event: any): void {
  const updateRequest = {
    procedureName: this.procedureName,
    rowId: event.data.Id,  // Assumes 'Id' is the primary key
    fieldName: event.colDef.field,
    newValue: event.newValue,
    oldValue: event.oldValue
  };

  // Optimistic update - cell already shows new value
  this.dynamicGridService.updateCell(updateRequest).subscribe({
    next: (response) => {
      if (response.success) {
        console.log('Cell updated successfully');
        
        // Flash the cell to indicate success
        event.api.flashCells({ rowNodes: [event.node] });
        
        // If server transformed the value, update the cell
        if (response.updatedValue !== undefined) {
          event.node.setDataValue(event.colDef.field, response.updatedValue);
        }
      } else {
        // Revert to old value
        event.node.setDataValue(event.colDef.field, event.oldValue);
        alert(`Update failed: ${response.message}`);
      }
    },
    error: (error) => {
      // Revert to old value
      event.node.setDataValue(event.colDef.field, event.oldValue);
      console.error('Error updating cell:', error);
      alert('Failed to update cell. Please try again.');
    }
  });
}
```

#### 2. Add Update Method to Service

**File: `Frontend/src/core/services/dynamic-grid.service.ts`**

```typescript
export interface CellUpdateRequest {
  procedureName: string;
  rowId: any;
  fieldName: string;
  newValue: any;
  oldValue?: any;
}

export interface CellUpdateResponse {
  success: boolean;
  message?: string;
  updatedValue?: any;
  updatedRow?: Record<string, any>;
  errorCode?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DynamicGridService {
  // ... existing code ...

  updateCell(request: CellUpdateRequest): Observable<CellUpdateResponse> {
    return this.http.post<CellUpdateResponse>(`${this.apiUrl}/update-cell`, request);
  }
}
```

### Backend Implementation

#### 1. Add Update Endpoint to Controller

**File: `API/WebAPI/Controllers/DynamicGridController.cs`**

```csharp
[HttpPost("update-cell")]
public async Task<IActionResult> UpdateCell([FromBody] CellUpdateRequest request)
{
    try
    {
        var userRoles = User.Claims
            .Where(c => c.Type == ClaimTypes.Role)
            .Select(c => c.Value)
            .ToArray();
        
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

        var response = await _gridService.UpdateCellAsync(request, userRoles, userId);
        
        if (response.Success)
        {
            return Ok(response);
        }
        else
        {
            return BadRequest(response);
        }
    }
    catch (UnauthorizedAccessException ex)
    {
        _logger.LogWarning(ex, "Unauthorized cell update attempt");
        return Forbid();
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error updating cell");
        return StatusCode(500, new CellUpdateResponse 
        { 
            Success = false, 
            Message = "An error occurred while updating the cell" 
        });
    }
}
```

#### 2. Add Update Method to Service

**File: `API/WebAPI/Services/DynamicGridService.cs`**

```csharp
public async Task<CellUpdateResponse> UpdateCellAsync(
    CellUpdateRequest request,
    string[] userRoles,
    int userId)
{
    // 1. Validate procedure access
    if (!await ValidateProcedureAccessAsync(request.ProcedureName, userRoles))
    {
        throw new UnauthorizedAccessException("Access denied to update this data");
    }

    // 2. Determine update procedure name
    var updateProcedureName = request.ProcedureName.Replace("sp_Grid_", "sp_Grid_Update_");
    
    // 3. Validate update procedure exists
    if (!await ValidateProcedureAccessAsync(updateProcedureName, userRoles))
    {
        return new CellUpdateResponse
        {
            Success = false,
            Message = "Update not supported for this grid",
            ErrorCode = "UPDATE_NOT_SUPPORTED"
        };
    }

    // 4. Execute update stored procedure
    try
    {
        var parameters = new[]
        {
            new SqlParameter("@Id", request.RowId),
            new SqlParameter("@FieldName", request.FieldName),
            new SqlParameter("@NewValue", request.NewValue ?? DBNull.Value),
            new SqlParameter("@UserId", userId),
            new SqlParameter("@Success", SqlDbType.Bit) { Direction = ParameterDirection.Output },
            new SqlParameter("@Message", SqlDbType.NVarChar, 500) { Direction = ParameterDirection.Output }
        };

        await _context.Database.ExecuteSqlRawAsync(
            $"EXEC {updateProcedureName} @Id, @FieldName, @NewValue, @UserId, @Success OUTPUT, @Message OUTPUT",
            parameters
        );

        var success = (bool)parameters[4].Value;
        var message = parameters[5].Value?.ToString();

        return new CellUpdateResponse
        {
            Success = success,
            Message = message
        };
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error executing update procedure: {ProcedureName}", updateProcedureName);
        return new CellUpdateResponse
        {
            Success = false,
            Message = "Database error occurred",
            ErrorCode = "DB_ERROR"
        };
    }
}
```

### Update Stored Procedure Template

```sql
CREATE OR ALTER PROCEDURE sp_Grid_Update_[ClientName]_[EntityName]
    @Id INT,
    @FieldName NVARCHAR(100),
    @NewValue NVARCHAR(MAX),
    @UserId INT,
    @Success BIT OUTPUT,
    @Message NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET @Success = 0;
    SET @Message = '';
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Validate user has permission to edit this field
        -- (Add your authorization logic here)
        
        -- Update based on field name
        IF @FieldName = 'FullName'
        BEGIN
            -- Parse full name into first and last
            DECLARE @FirstName NVARCHAR(50) = LEFT(@NewValue, CHARINDEX(' ', @NewValue) - 1);
            DECLARE @LastName NVARCHAR(50) = SUBSTRING(@NewValue, CHARINDEX(' ', @NewValue) + 1, LEN(@NewValue));
            
            UPDATE Employees
            SET FirstName = @FirstName,
                LastName = @LastName,
                UpdatedAt = GETUTCDATE(),
                UpdatedBy = @UserId
            WHERE Id = @Id;
        END
        ELSE IF @FieldName = 'Email'
        BEGIN
            -- Validate email format
            IF @NewValue NOT LIKE '%_@__%.__%'
            BEGIN
                SET @Message = 'Invalid email format';
                ROLLBACK TRANSACTION;
                RETURN;
            END
            
            UPDATE Employees
            SET Email = @NewValue,
                UpdatedAt = GETUTCDATE(),
                UpdatedBy = @UserId
            WHERE Id = @Id;
        END
        ELSE IF @FieldName = 'Salary'
        BEGIN
            UPDATE Employees
            SET Salary = CAST(@NewValue AS DECIMAL(18,2)),
                UpdatedAt = GETUTCDATE(),
                UpdatedBy = @UserId
            WHERE Id = @Id;
        END
        ELSE IF @FieldName = 'Status'
        BEGIN
            IF @NewValue NOT IN ('Active', 'Inactive')
            BEGIN
                SET @Message = 'Invalid status value';
                ROLLBACK TRANSACTION;
                RETURN;
            END
            
            UPDATE Employees
            SET Status = @NewValue,
                UpdatedAt = GETUTCDATE(),
                UpdatedBy = @UserId
            WHERE Id = @Id;
        END
        ELSE
        BEGIN
            SET @Message = 'Field not editable: ' + @FieldName;
            ROLLBACK TRANSACTION;
            RETURN;
        END
        
        IF @@ROWCOUNT = 0
        BEGIN
            SET @Message = 'Record not found';
            ROLLBACK TRANSACTION;
            RETURN;
        END
        
        COMMIT TRANSACTION;
        SET @Success = 1;
        SET @Message = 'Updated successfully';
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
            
        SET @Success = 0;
        SET @Message = ERROR_MESSAGE();
    END CATCH
END
GO
```

---

## AG Grid Cell Editors

### Built-in Cell Editors

AG Grid provides several built-in cell editors:

| Editor | Use Case | Example |
|--------|----------|---------|
| `agTextCellEditor` | Text input | Names, descriptions |
| `agNumberCellEditor` | Numeric input | Salary, age, quantity |
| `agDateCellEditor` | Date picker | Join date, birth date |
| `agSelectCellEditor` | Dropdown | Status, category |
| `agLargeTextCellEditor` | Multi-line text | Comments, notes |

### Column Definition Examples

```typescript
// Text editor
{
  field: 'fullName',
  headerName: 'Full Name',
  editable: true,
  cellEditor: 'agTextCellEditor'
}

// Number editor
{
  field: 'salary',
  headerName: 'Salary',
  editable: true,
  cellEditor: 'agNumberCellEditor',
  cellEditorParams: {
    min: 0,
    max: 1000000,
    precision: 2
  }
}

// Date editor
{
  field: 'joinDate',
  headerName: 'Join Date',
  editable: true,
  cellEditor: 'agDateCellEditor'
}

// Select editor
{
  field: 'status',
  headerName: 'Status',
  editable: true,
  cellEditor: 'agSelectCellEditor',
  cellEditorParams: {
    values: ['Active', 'Inactive', 'On Leave']
  }
}
```

---

## Testing Checklist

### Infinite Scrolling
- [ ] Grid loads initial block of data
- [ ] Scrolling down loads more data
- [ ] Sorting works correctly
- [ ] Filtering works correctly
- [ ] Total row count is accurate
- [ ] Performance is acceptable with large datasets

### Inline Editing
- [ ] Editable cells are visually indicated
- [ ] Cell editors open on click
- [ ] Changes are saved to database
- [ ] Validation errors are displayed
- [ ] Failed updates revert to old value
- [ ] Success feedback is shown
- [ ] Unauthorized edits are prevented

---

## Performance Optimization

### Infinite Scrolling
1. **Optimal Block Size:** 100-200 rows per block
2. **Cache Blocks:** Keep 5-10 blocks in memory
3. **Debounce Filters:** Wait 300ms before applying
4. **Index Database:** Add indexes on sort/filter columns

### Inline Editing
1. **Debounce Updates:** Wait for user to finish typing
2. **Batch Updates:** Group multiple cell changes
3. **Optimistic UI:** Update immediately, revert on error
4. **Audit Logging:** Log changes asynchronously

---

## Security Considerations

### Inline Editing
1. **Field-Level Permissions:** Check user can edit specific fields
2. **Row-Level Security:** Verify user can edit specific rows
3. **Data Validation:** Validate on both client and server
4. **Audit Trail:** Log who changed what and when
5. **Concurrency:** Handle simultaneous edits (optimistic locking)

---

## Summary

**Infinite Scrolling:**
- Use AG Grid Server-Side Row Model
- Pass `startRow` and `endRow` to stored procedures
- Return data in blocks (100-200 rows)
- Provide total count for scroll bar

**Inline Editing:**
- Mark columns as `editable: true`
- Handle `cellValueChanged` event
- Call update API endpoint
- Use optimistic updates with rollback on error
- Create `sp_Grid_Update_XXX` procedures for each grid
