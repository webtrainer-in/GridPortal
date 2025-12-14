# Row-Level Editing with Edit/Save Action Buttons - Implementation Guide

## Overview

This guide covers **row-level editing** where:
1. User clicks **Edit** button in Actions column
2. Entire row becomes editable
3. User modifies multiple cells
4. User clicks **Save** to commit changes or **Cancel** to discard
5. Single API call updates entire row in database

---

## User Experience Flow

### Step 1: Initial State (View Mode)

```
┌─────────┬──────────────┬──────────────────────┬────────────┬──────────┐
│ Actions │ Name         │ Email                │ Department │ Salary   │
├─────────┼──────────────┼──────────────────────┼────────────┼──────────┤
│ [Edit]  │ John Smith   │ john@example.com     │ IT         │ $80,000  │
│ [Edit]  │ Jane Doe     │ jane@example.com     │ HR         │ $75,000  │
└─────────┴──────────────┴──────────────────────┴────────────┴──────────┘
```

### Step 2: User Clicks Edit Button

```
┌─────────────┬──────────────┬──────────────────────┬────────────┬──────────┐
│ Actions     │ Name         │ Email                │ Department │ Salary   │
├─────────────┼──────────────┼──────────────────────┼────────────┼──────────┤
│ [Save][X]   │ [John Smith] │ [john@example.com]   │ [IT▼]      │ [$80,000]│ ← Edit Mode
│ [Edit]      │ Jane Doe     │ jane@example.com     │ HR         │ $75,000  │
└─────────────┴──────────────┴──────────────────────┴────────────┴──────────┘
                ↑ Editable cells (input fields)
```

**Visual Changes:**
- Edit button → Save & Cancel buttons
- Row background changes (e.g., light yellow)
- Cells become input fields
- Other rows remain in view mode

### Step 3: User Edits Multiple Cells

```
┌─────────────┬──────────────┬──────────────────────────┬────────────┬──────────┐
│ Actions     │ Name         │ Email                    │ Department │ Salary   │
├─────────────┼──────────────┼──────────────────────────┼────────────┼──────────┤
│ [Save][X]   │ [John Smith] │ [john.smith@company.com] │ [Sales▼]   │ [$85,000]│
│ [Edit]      │ Jane Doe     │ jane@example.com         │ HR         │ $75,000  │
└─────────────┴──────────────┴──────────────────────────┴────────────┴──────────┘
                                ↑ Changed              ↑ Changed   ↑ Changed
```

**User can edit:**
- Email: `john.smith@company.com`
- Department: `Sales`
- Salary: `$85,000`

### Step 4: User Clicks Save

```
API Call → Database Update → Success
```

**Result:**
```
┌─────────┬──────────────┬──────────────────────────┬────────────┬──────────┐
│ Actions │ Name         │ Email                    │ Department │ Salary   │
├─────────┼──────────────┼──────────────────────────┼────────────┼──────────┤
│ [Edit]  │ John Smith   │ john.smith@company.com   │ Sales      │ $85,000  │ ✅ Saved
│ [Edit]  │ Jane Doe     │ jane@example.com         │ HR         │ $75,000  │
└─────────┴──────────────┴──────────────────────────┴────────────┴──────────┘
```

**Visual Feedback:**
- Row flashes green
- Returns to view mode
- Shows updated values

### Step 5: User Clicks Cancel (Alternative)

```
Discard Changes → Revert to Original Values
```

**Result:**
```
┌─────────┬──────────────┬──────────────────────┬────────────┬──────────┐
│ Actions │ Name         │ Email                │ Department │ Salary   │
├─────────┼──────────────┼──────────────────────┼────────────┼──────────┤
│ [Edit]  │ John Smith   │ john@example.com     │ IT         │ $80,000  │ ← Reverted
│ [Edit]  │ Jane Doe     │ jane@example.com     │ HR         │ $75,000  │
└─────────┴──────────────┴──────────────────────┴────────────┴──────────┘
```

---

## Implementation

### 1. Actions Column Configuration

**Stored Procedure - Result Set 2 (Column Metadata):**

```sql
-- Result Set 2: Column Metadata
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
    1 AS pinned  -- Pin to left
UNION ALL
SELECT 'Id', 'ID', 'number', 70, 1, 1, 0, NULL, NULL, NULL, NULL, 0
UNION ALL
SELECT 'FullName', 'Full Name', 'string', 200, 1, 1, 1, 'agTextCellEditor', NULL, 'Personal Info', NULL, 0
UNION ALL
SELECT 'Email', 'Email', 'string', 250, 1, 1, 1, 'agTextCellEditor', NULL, 'Personal Info', 'open', 0
-- ... other columns
```

**Note:** `pinned = 1` keeps Actions column visible when scrolling horizontally.

---

### 2. Frontend - Column Definitions

**File: `Frontend/src/shared/components/dynamic-grid/dynamic-grid.ts`**

```typescript
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { ActionButtonsRendererComponent } from './action-buttons-renderer.component';

@Component({
  selector: 'app-dynamic-grid',
  standalone: true,
  imports: [CommonModule, AgGridAngular],
  template: `
    <ag-grid-angular
      class="ag-theme-alpine"
      [columnDefs]="columnDefs"
      [rowModelType]="rowModelType"
      [serverSideDatasource]="serverSideDatasource"
      [getRowStyle]="getRowStyle"
      [animateRows]="true"
      [enableCellChangeFlash]="true"
      (gridReady)="onGridReady($event)"
    ></ag-grid-angular>
  `
})
export class DynamicGrid {
  columnDefs: ColDef[] = [];
  editingRows: Set<any> = new Set();  // Track rows in edit mode
  
  private updateColumnDefinitions(columns: ColumnDefinition[]): void {
    const colDefs: ColDef[] = [];
    
    // Add Actions column first
    colDefs.push({
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      pinned: 'left',
      cellRenderer: ActionButtonsRendererComponent,
      cellRendererParams: {
        onEdit: (rowData: any) => this.enableRowEdit(rowData),
        onSave: (rowData: any) => this.saveRow(rowData),
        onCancel: (rowData: any) => this.cancelRowEdit(rowData),
        isEditing: (rowData: any) => this.editingRows.has(rowData.Id)
      },
      editable: false,
      sortable: false,
      filter: false
    });
    
    // Add data columns
    columns.forEach(col => {
      if (col.field !== 'actions') {
        colDefs.push({
          field: col.field,
          headerName: col.headerName,
          width: col.width,
          sortable: col.sortable,
          filter: col.filter,
          editable: (params) => this.editingRows.has(params.data.Id),  // Editable only in edit mode
          cellEditor: col.cellEditor,
          cellEditorParams: col.cellEditorParams ? JSON.parse(col.cellEditorParams) : undefined
        });
      }
    });
    
    this.columnDefs = colDefs;
    this.gridApi?.setColumnDefs(colDefs);
  }
  
  enableRowEdit(rowData: any): void {
    // Store original data for cancel functionality
    rowData._originalData = { ...rowData };
    
    // Add to editing set
    this.editingRows.add(rowData.Id);
    
    // Refresh row to update editable state and action buttons
    this.gridApi?.refreshCells({ force: true });
  }
  
  saveRow(rowData: any): void {
    // Collect changed fields
    const changes: Record<string, any> = {};
    const originalData = rowData._originalData;
    
    Object.keys(rowData).forEach(key => {
      if (key !== '_originalData' && key !== 'Id' && rowData[key] !== originalData[key]) {
        changes[key] = rowData[key];
      }
    });
    
    if (Object.keys(changes).length === 0) {
      // No changes, just exit edit mode
      this.cancelRowEdit(rowData);
      return;
    }
    
    // Call API to save
    const updateRequest = {
      procedureName: this.procedureName,
      rowId: rowData.Id,
      changes: changes
    };
    
    this.dynamicGridService.updateRow(updateRequest).subscribe({
      next: (response) => {
        if (response.success) {
          // Remove from editing set
          this.editingRows.delete(rowData.Id);
          
          // Remove original data backup
          delete rowData._originalData;
          
          // Refresh row
          this.gridApi?.refreshCells({ force: true });
          
          // Flash row green
          const rowNode = this.gridApi?.getRowNode(rowData.Id);
          if (rowNode) {
            this.gridApi?.flashCells({ rowNodes: [rowNode] });
          }
          
          console.log('✅ Row saved successfully');
        } else {
          alert(`❌ Save failed: ${response.message}`);
        }
      },
      error: (error) => {
        console.error('Error saving row:', error);
        alert('❌ Failed to save. Please try again.');
      }
    });
  }
  
  cancelRowEdit(rowData: any): void {
    // Restore original data
    if (rowData._originalData) {
      Object.keys(rowData._originalData).forEach(key => {
        rowData[key] = rowData._originalData[key];
      });
      delete rowData._originalData;
    }
    
    // Remove from editing set
    this.editingRows.delete(rowData.Id);
    
    // Refresh row
    this.gridApi?.refreshCells({ force: true });
  }
  
  getRowStyle = (params: any) => {
    if (this.editingRows.has(params.data.Id)) {
      return { background: '#fff9e6' };  // Light yellow for edit mode
    }
    return undefined;
  };
}
```

---

### 3. Action Buttons Cell Renderer

**File: `Frontend/src/shared/components/dynamic-grid/action-buttons-renderer.component.ts`**

```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

@Component({
  selector: 'app-action-buttons-renderer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="action-buttons">
      @if (!isEditing) {
        <button 
          class="btn-edit" 
          (click)="onEditClick()"
          title="Edit row">
          ✏️ Edit
        </button>
      } @else {
        <button 
          class="btn-save" 
          (click)="onSaveClick()"
          title="Save changes">
          ✅ Save
        </button>
        <button 
          class="btn-cancel" 
          (click)="onCancelClick()"
          title="Cancel editing">
          ❌
        </button>
      }
    </div>
  `,
  styles: [`
    .action-buttons {
      display: flex;
      gap: 5px;
      padding: 5px;
    }
    
    button {
      padding: 4px 8px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
    }
    
    .btn-edit {
      background: #007bff;
      color: white;
    }
    
    .btn-edit:hover {
      background: #0056b3;
    }
    
    .btn-save {
      background: #28a745;
      color: white;
    }
    
    .btn-save:hover {
      background: #218838;
    }
    
    .btn-cancel {
      background: #dc3545;
      color: white;
      padding: 4px 6px;
    }
    
    .btn-cancel:hover {
      background: #c82333;
    }
  `]
})
export class ActionButtonsRendererComponent implements ICellRendererAngularComp {
  private params!: ICellRendererParams & {
    onEdit: (rowData: any) => void;
    onSave: (rowData: any) => void;
    onCancel: (rowData: any) => void;
    isEditing: (rowData: any) => boolean;
  };
  
  isEditing: boolean = false;

  agInit(params: any): void {
    this.params = params;
    this.isEditing = this.params.isEditing(this.params.data);
  }

  refresh(params: any): boolean {
    this.params = params;
    this.isEditing = this.params.isEditing(this.params.data);
    return true;
  }

  onEditClick(): void {
    this.params.onEdit(this.params.data);
  }

  onSaveClick(): void {
    this.params.onSave(this.params.data);
  }

  onCancelClick(): void {
    this.params.onCancel(this.params.data);
  }
}
```

---

### 4. Backend - DTOs

**File: `API/WebAPI/DTOs/RowUpdateRequest.cs`**

```csharp
public class RowUpdateRequest
{
    public string ProcedureName { get; set; } = string.Empty;
    public object RowId { get; set; } = null!;
    public Dictionary<string, object> Changes { get; set; } = new();  // Field -> New Value
}

public class RowUpdateResponse
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public Dictionary<string, object>? UpdatedRow { get; set; }
    public string? ErrorCode { get; set; }
}
```

---

### 5. Backend - API Controller

**File: `API/WebAPI/Controllers/DynamicGridController.cs`**

```csharp
[HttpPost("update-row")]
public async Task<IActionResult> UpdateRow([FromBody] RowUpdateRequest request)
{
    try
    {
        var userRoles = User.Claims
            .Where(c => c.Type == ClaimTypes.Role)
            .Select(c => c.Value)
            .ToArray();
        
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

        var response = await _gridService.UpdateRowAsync(request, userRoles, userId);
        
        if (response.Success)
            return Ok(response);
        else
            return BadRequest(response);
    }
    catch (UnauthorizedAccessException ex)
    {
        _logger.LogWarning(ex, "Unauthorized row update attempt");
        return Forbid();
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error updating row");
        return StatusCode(500, new RowUpdateResponse 
        { 
            Success = false, 
            Message = "An error occurred while updating the row" 
        });
    }
}
```

---

### 6. Backend - Service Method

**File: `API/WebAPI/Services/DynamicGridService.cs`**

```csharp
public async Task<RowUpdateResponse> UpdateRowAsync(
    RowUpdateRequest request,
    string[] userRoles,
    int userId)
{
    // Validate access
    if (!await ValidateProcedureAccessAsync(request.ProcedureName, userRoles))
    {
        throw new UnauthorizedAccessException("Access denied");
    }

    // Determine update procedure name
    var updateProcedureName = request.ProcedureName.Replace("sp_Grid_", "sp_Grid_Update_");
    
    if (!await ValidateProcedureAccessAsync(updateProcedureName, userRoles))
    {
        return new RowUpdateResponse
        {
            Success = false,
            Message = "Update not supported for this grid"
        };
    }

    try
    {
        // Convert changes dictionary to JSON
        var changesJson = JsonSerializer.Serialize(request.Changes);
        
        var parameters = new[]
        {
            new SqlParameter("@Id", request.RowId),
            new SqlParameter("@ChangesJson", changesJson),
            new SqlParameter("@UserId", userId),
            new SqlParameter("@Success", SqlDbType.Bit) { Direction = ParameterDirection.Output },
            new SqlParameter("@Message", SqlDbType.NVarChar, 500) { Direction = ParameterDirection.Output }
        };

        await _context.Database.ExecuteSqlRawAsync(
            $"EXEC {updateProcedureName} @Id, @ChangesJson, @UserId, @Success OUTPUT, @Message OUTPUT",
            parameters
        );

        var success = (bool)parameters[3].Value;
        var message = parameters[4].Value?.ToString();

        return new RowUpdateResponse
        {
            Success = success,
            Message = message
        };
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error executing update procedure");
        return new RowUpdateResponse
        {
            Success = false,
            Message = "Database error occurred"
        };
    }
}
```

---

### 7. Stored Procedure - Row-Level Update

**File: `API/WebAPI/Database/StoredProcedures/sp_Grid_Update_[ClientName]_[EntityName].sql`**

```sql
CREATE OR ALTER PROCEDURE sp_Grid_Update_Acme_Employees
    @Id INT,
    @ChangesJson NVARCHAR(MAX),  -- JSON: { "Email": "new@email.com", "Salary": 85000 }
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
        
        -- Parse JSON changes
        DECLARE @Email NVARCHAR(100) = JSON_VALUE(@ChangesJson, '$.Email');
        DECLARE @Department NVARCHAR(100) = JSON_VALUE(@ChangesJson, '$.Department');
        DECLARE @Salary DECIMAL(18,2) = CAST(JSON_VALUE(@ChangesJson, '$.Salary') AS DECIMAL(18,2));
        DECLARE @Status NVARCHAR(20) = JSON_VALUE(@ChangesJson, '$.Status');
        
        -- Validate changes
        IF @Email IS NOT NULL
        BEGIN
            -- Validate email format
            IF @Email NOT LIKE '%_@__%.__%'
            BEGIN
                SET @Message = 'Invalid email format';
                ROLLBACK TRANSACTION;
                RETURN;
            END
            
            -- Check if email already exists
            IF EXISTS (SELECT 1 FROM Employees WHERE Email = @Email AND Id != @Id)
            BEGIN
                SET @Message = 'Email already in use';
                ROLLBACK TRANSACTION;
                RETURN;
            END
        END
        
        IF @Salary IS NOT NULL AND (@Salary < 0 OR @Salary > 1000000)
        BEGIN
            SET @Message = 'Salary must be between $0 and $1,000,000';
            ROLLBACK TRANSACTION;
            RETURN;
        END
        
        IF @Status IS NOT NULL AND @Status NOT IN ('Active', 'Inactive', 'On Leave')
        BEGIN
            SET @Message = 'Invalid status value';
            ROLLBACK TRANSACTION;
            RETURN;
        END
        
        -- Build dynamic UPDATE statement
        DECLARE @SQL NVARCHAR(MAX) = 'UPDATE Employees SET ';
        DECLARE @SetClauses NVARCHAR(MAX) = '';
        
        IF @Email IS NOT NULL
            SET @SetClauses = @SetClauses + 'Email = @Email, ';
        
        IF @Department IS NOT NULL
            SET @SetClauses = @SetClauses + 'DepartmentId = (SELECT Id FROM Departments WHERE Name = @Department), ';
        
        IF @Salary IS NOT NULL
            SET @SetClauses = @SetClauses + 'Salary = @Salary, ';
        
        IF @Status IS NOT NULL
            SET @SetClauses = @SetClauses + 'Status = @Status, ';
        
        -- Always update audit fields
        SET @SetClauses = @SetClauses + 'UpdatedAt = GETUTCDATE(), UpdatedBy = @UserId ';
        
        SET @SQL = @SQL + @SetClauses + 'WHERE Id = @Id';
        
        -- Execute dynamic SQL
        EXEC sp_executesql @SQL,
            N'@Id INT, @Email NVARCHAR(100), @Department NVARCHAR(100), @Salary DECIMAL(18,2), @Status NVARCHAR(20), @UserId INT',
            @Id, @Email, @Department, @Salary, @Status, @UserId;
        
        IF @@ROWCOUNT = 0
        BEGIN
            SET @Message = 'Record not found';
            ROLLBACK TRANSACTION;
            RETURN;
        END
        
        COMMIT TRANSACTION;
        SET @Success = 1;
        SET @Message = 'Row updated successfully';
        
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

## Visual Indicators

### Edit Mode Styling

```css
/* Row in edit mode */
.ag-row-editing {
  background-color: #fff9e6 !important;
  border-left: 3px solid #ffc107;
}

/* Editable cells in edit mode */
.ag-cell-editable {
  background-color: white;
  border: 1px solid #007bff;
}

/* Modified cells (different from original) */
.ag-cell-modified {
  background-color: #fff3cd;
  border-left: 2px solid #ffc107;
}
```

---

## Features Summary

### ✅ Row-Level Editing
- Click Edit button to enable row editing
- All editable cells become active
- Edit multiple fields before saving

### ✅ Action Buttons
- **Edit** - Enable editing for row
- **Save** - Commit all changes to database
- **Cancel** - Discard changes and revert

### ✅ Visual Feedback
- Edit mode: Light yellow background
- Modified cells: Highlighted
- Save success: Green flash
- Validation errors: Alert message

### ✅ Data Integrity
- Transaction-based updates
- Validation before save
- Rollback on error
- Audit trail (UpdatedBy, UpdatedAt)

### ✅ User Experience
- Intuitive workflow
- Clear visual states
- Undo capability (Cancel button)
- Batch updates (single API call)

---

## Advantages Over Cell-Level Editing

| Aspect | Cell-Level | Row-Level |
|--------|------------|-----------|
| **API Calls** | One per cell | One per row |
| **User Control** | Auto-save | Explicit save |
| **Undo** | Difficult | Easy (Cancel button) |
| **Validation** | Per field | Across fields |
| **Performance** | More calls | Fewer calls |
| **UX** | Immediate | Deliberate |

---

## Next Steps

1. Implement ActionButtonsRendererComponent
2. Add row edit state management
3. Create row update API endpoint
4. Implement row-level update stored procedure
5. Add visual indicators for edit mode
6. Test with multiple concurrent edits
7. Add keyboard shortcuts (Escape to cancel, Ctrl+S to save)
