# Column Grouping & Visibility Controls - Implementation Guide

## Overview

This guide covers implementing:
1. **Column Grouping** - Organize related columns under group headers
2. **Column Visibility Controls** - Show/hide columns and entire groups
3. **Column Panel** - Built-in AG Grid tool panel for column management
4. **User Preferences** - Save column visibility state per user

---

## Part 1: Column Grouping

### What is Column Grouping?

Column grouping allows you to organize related columns under a common header:

```
┌─────────────────────────────────────────────────────┐
│  Personal Info    │  Employment      │  Performance  │
├─────────┬─────────┼────────┬─────────┼──────┬───────┤
│ Name    │ Email   │ Dept   │ Salary  │ Rating│ Years │
├─────────┼─────────┼────────┼─────────┼──────┼───────┤
│ John    │ j@ex.com│ IT     │ 80000   │ 4.5  │ 5     │
└─────────┴─────────┴────────┴─────────┴──────┴───────┘
```

### Benefits

✅ **Organization** - Logical grouping of related data  
✅ **Clarity** - Easier to understand complex grids  
✅ **Bulk Actions** - Show/hide entire groups at once  
✅ **Nested Groups** - Support multi-level hierarchies  

---

## Implementation

### 1. Update Column Metadata Schema

**Stored Procedure - Result Set 2 (Column Metadata):**

Add `columnGroup` and `columnGroupShow` fields:

```sql
-- Result Set 2: Column Metadata with Groups
SELECT 
    'Id' AS field, 
    'ID' AS headerName, 
    'number' AS type, 
    70 AS width, 
    1 AS sortable, 
    1 AS filter,
    0 AS editable,
    NULL AS cellEditor,
    NULL AS cellEditorParams,
    NULL AS columnGroup,           -- NEW: Group name (NULL = no group)
    NULL AS columnGroupShow        -- NEW: 'open', 'closed', or NULL
UNION ALL
SELECT 'FullName', 'Full Name', 'string', 200, 1, 1, 1, 'agTextCellEditor', NULL,
       'Personal Info', NULL       -- In "Personal Info" group, always visible
UNION ALL
SELECT 'Email', 'Email', 'string', 250, 1, 1, 1, 'agTextCellEditor', NULL,
       'Personal Info', 'open'     -- In "Personal Info" group, visible when group is open
UNION ALL
SELECT 'Phone', 'Phone', 'string', 140, 1, 1, 0, NULL, NULL,
       'Personal Info', 'open'     -- In "Personal Info" group, visible when group is open
UNION ALL
SELECT 'Department', 'Department', 'string', 150, 1, 1, 0, NULL, NULL,
       'Employment', NULL          -- In "Employment" group, always visible
UNION ALL
SELECT 'Salary', 'Salary', 'number', 120, 1, 1, 1, 'agNumberCellEditor', NULL,
       'Employment', 'closed'      -- In "Employment" group, visible only when expanded
UNION ALL
SELECT 'JoinDate', 'Join Date', 'date', 130, 1, 1, 1, 'agDateCellEditor', NULL,
       'Employment', 'open'        -- In "Employment" group, visible when group is open
UNION ALL
SELECT 'PerformanceRating', 'Rating', 'number', 100, 1, 1, 1, 'agNumberCellEditor', NULL,
       'Performance', NULL         -- In "Performance" group, always visible
UNION ALL
SELECT 'YearsExperience', 'Experience', 'number', 120, 1, 1, 0, NULL, NULL,
       'Performance', 'open';      -- In "Performance" group, visible when group is open
```

**Column Group Show Options:**
- `NULL` - Always visible (regardless of group state)
- `'open'` - Visible when group is expanded
- `'closed'` - Visible when group is collapsed

---

### 2. Update Backend DTOs

**File: `API/WebAPI/DTOs/ColumnDefinition.cs`**

```csharp
public class ColumnDefinition
{
    public string Field { get; set; } = string.Empty;
    public string HeaderName { get; set; } = string.Empty;
    public string Type { get; set; } = "string";
    public int? Width { get; set; }
    public bool Sortable { get; set; } = true;
    public bool Filter { get; set; } = true;
    public bool Editable { get; set; } = false;
    public string? CellEditor { get; set; }
    public string? CellEditorParams { get; set; }
    
    // Column Grouping
    public string? ColumnGroup { get; set; }           // NEW
    public string? ColumnGroupShow { get; set; }       // NEW: 'open', 'closed', or null
    
    public Dictionary<string, object>? CustomProperties { get; set; }
}
```

**Update Service to Read Group Metadata:**

**File: `API/WebAPI/Services/DynamicGridService.cs`**

```csharp
private async Task<List<ColumnDefinition>> ReadColumnDefinitionsAsync(DbDataReader reader)
{
    var columns = new List<ColumnDefinition>();
    
    while (await reader.ReadAsync())
    {
        var colDef = new ColumnDefinition
        {
            Field = reader.GetString(reader.GetOrdinal("field")),
            HeaderName = reader.GetString(reader.GetOrdinal("headerName")),
            Type = reader.GetString(reader.GetOrdinal("type")),
            Width = reader.IsDBNull(reader.GetOrdinal("width")) 
                ? null 
                : reader.GetInt32(reader.GetOrdinal("width")),
            Sortable = reader.GetBoolean(reader.GetOrdinal("sortable")),
            Filter = reader.GetBoolean(reader.GetOrdinal("filter")),
            Editable = reader.GetBoolean(reader.GetOrdinal("editable"))
        };
        
        // Read optional fields
        var cellEditorOrdinal = reader.GetOrdinal("cellEditor");
        if (!reader.IsDBNull(cellEditorOrdinal))
            colDef.CellEditor = reader.GetString(cellEditorOrdinal);
        
        var cellEditorParamsOrdinal = reader.GetOrdinal("cellEditorParams");
        if (!reader.IsDBNull(cellEditorParamsOrdinal))
            colDef.CellEditorParams = reader.GetString(cellEditorParamsOrdinal);
        
        // NEW: Read column group metadata
        var columnGroupOrdinal = reader.GetOrdinal("columnGroup");
        if (!reader.IsDBNull(columnGroupOrdinal))
            colDef.ColumnGroup = reader.GetString(columnGroupOrdinal);
        
        var columnGroupShowOrdinal = reader.GetOrdinal("columnGroupShow");
        if (!reader.IsDBNull(columnGroupShowOrdinal))
            colDef.ColumnGroupShow = reader.GetString(columnGroupShowOrdinal);
        
        columns.Add(colDef);
    }
    
    return columns;
}
```

---

### 3. Update Frontend Service

**File: `Frontend/src/core/services/dynamic-grid.service.ts`**

```typescript
export interface ColumnDefinition {
  field: string;
  headerName: string;
  type: string;
  width?: number;
  sortable: boolean;
  filter: boolean;
  editable?: boolean;
  cellEditor?: string;
  cellEditorParams?: string;
  
  // Column Grouping
  columnGroup?: string;           // NEW
  columnGroupShow?: string;       // NEW: 'open', 'closed', or null
  
  customProperties?: Record<string, any>;
}
```

---

### 4. Update AG Grid Component

**File: `Frontend/src/shared/components/dynamic-grid/dynamic-grid.ts`**

```typescript
import { Component, Input, OnInit } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { 
  ColDef, 
  ColGroupDef,
  GridApi, 
  GridReadyEvent,
  SideBarDef
} from 'ag-grid-community';

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
      [sideBar]="sideBar"
      [suppressDragLeaveHidesColumns]="true"
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
  @Input() useInfiniteScroll: boolean = true;
  @Input() showColumnPanel: boolean = true;  // NEW: Toggle column panel
  
  columnDefs: (ColDef | ColGroupDef)[] = [];
  rowModelType: 'serverSide' | 'clientSide' = 'serverSide';
  sideBar: SideBarDef | string | string[] | boolean = false;
  
  private gridApi?: GridApi;

  constructor(private dynamicGridService: DynamicGridService) {}

  ngOnInit(): void {
    this.rowModelType = this.useInfiniteScroll ? 'serverSide' : 'clientSide';
    
    // Configure side bar with column panel
    if (this.showColumnPanel) {
      this.sideBar = {
        toolPanels: [
          {
            id: 'columns',
            labelDefault: 'Columns',
            labelKey: 'columns',
            iconKey: 'columns',
            toolPanel: 'agColumnsToolPanel',
            toolPanelParams: {
              suppressRowGroups: true,
              suppressValues: true,
              suppressPivots: true,
              suppressPivotMode: true,
              suppressColumnFilter: false,
              suppressColumnSelectAll: false,
              suppressColumnExpandAll: false
            }
          }
        ],
        defaultToolPanel: ''  // Start with panel closed
      };
    }
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    
    if (this.useInfiniteScroll) {
      this.setupServerSideDatasource();
    }
  }

  private updateColumnDefinitions(columns: ColumnDefinition[]): void {
    // Group columns by columnGroup
    const groupedColumns = this.groupColumns(columns);
    
    this.columnDefs = groupedColumns;
    this.gridApi?.setColumnDefs(groupedColumns);
  }

  private groupColumns(columns: ColumnDefinition[]): (ColDef | ColGroupDef)[] {
    const groups = new Map<string, ColumnDefinition[]>();
    const ungroupedColumns: ColDef[] = [];
    
    // Separate grouped and ungrouped columns
    columns.forEach(col => {
      if (col.columnGroup) {
        if (!groups.has(col.columnGroup)) {
          groups.set(col.columnGroup, []);
        }
        groups.get(col.columnGroup)!.push(col);
      } else {
        ungroupedColumns.push(this.mapToColDef(col));
      }
    });
    
    // Build column definitions with groups
    const result: (ColDef | ColGroupDef)[] = [];
    
    // Add ungrouped columns first
    result.push(...ungroupedColumns);
    
    // Add grouped columns
    groups.forEach((groupColumns, groupName) => {
      const groupDef: ColGroupDef = {
        headerName: groupName,
        children: groupColumns.map(col => this.mapToColDef(col))
      };
      result.push(groupDef);
    });
    
    return result;
  }

  private mapToColDef(col: ColumnDefinition): ColDef {
    const colDef: ColDef = {
      field: col.field,
      headerName: col.headerName,
      sortable: col.sortable,
      filter: col.filter,
      width: col.width,
      editable: col.editable,
      cellEditor: col.cellEditor,
      type: col.type === 'number' ? 'numericColumn' : undefined
    };
    
    // Add columnGroupShow if specified
    if (col.columnGroupShow) {
      colDef.columnGroupShow = col.columnGroupShow as 'open' | 'closed';
    }
    
    // Parse cell editor params if present
    if (col.cellEditorParams) {
      try {
        colDef.cellEditorParams = JSON.parse(col.cellEditorParams);
      } catch (e) {
        console.warn('Failed to parse cellEditorParams:', col.cellEditorParams);
      }
    }
    
    return colDef;
  }

  onCellValueChanged(event: any): void {
    // Handle inline editing (from previous guide)
  }
}
```

---

## Part 2: Column Visibility Controls

### Built-in AG Grid Column Panel

AG Grid provides a built-in **Columns Tool Panel** that allows users to:
- ✅ Show/hide individual columns
- ✅ Show/hide entire column groups
- ✅ Search for columns
- ✅ Expand/collapse groups
- ✅ Select/deselect all

### Features

The column panel appears as a sidebar and includes:

```
┌─────────────────┐
│ Columns         │
├─────────────────┤
│ 🔍 Search...    │
├─────────────────┤
│ ☑ Select All    │
├─────────────────┤
│ ▼ Personal Info │
│   ☑ Full Name   │
│   ☑ Email       │
│   ☑ Phone       │
│ ▼ Employment    │
│   ☑ Department  │
│   ☐ Salary      │
│   ☑ Join Date   │
│ ▼ Performance   │
│   ☑ Rating      │
│   ☑ Experience  │
└─────────────────┘
```

### Custom Column Visibility UI (Optional)

If you want a custom UI instead of the built-in panel:

**File: `Frontend/src/shared/components/dynamic-grid/column-visibility-panel.component.ts`**

```typescript
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ColumnVisibilityItem {
  field: string;
  headerName: string;
  group?: string;
  visible: boolean;
}

interface ColumnGroup {
  name: string;
  columns: ColumnVisibilityItem[];
  allVisible: boolean;
}

@Component({
  selector: 'app-column-visibility-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="column-panel">
      <div class="panel-header">
        <h3>Column Visibility</h3>
        <button (click)="toggleAll()" class="btn-toggle-all">
          {{ allColumnsVisible ? 'Hide All' : 'Show All' }}
        </button>
      </div>
      
      <div class="search-box">
        <input 
          type="text" 
          [(ngModel)]="searchTerm" 
          (ngModelChange)="filterColumns()"
          placeholder="Search columns...">
      </div>
      
      <div class="groups-container">
        @for (group of filteredGroups; track group.name) {
          <div class="column-group">
            <div class="group-header" (click)="toggleGroup(group)">
              <span class="expand-icon">{{ group.expanded ? '▼' : '▶' }}</span>
              <input 
                type="checkbox" 
                [checked]="group.allVisible"
                [indeterminate]="group.someVisible"
                (change)="toggleGroupVisibility(group, $event)"
                (click)="$event.stopPropagation()">
              <span class="group-name">{{ group.name }}</span>
              <span class="column-count">({{ group.visibleCount }}/{{ group.columns.length }})</span>
            </div>
            
            @if (group.expanded) {
              <div class="group-columns">
                @for (column of group.columns; track column.field) {
                  <div class="column-item">
                    <input 
                      type="checkbox" 
                      [checked]="column.visible"
                      (change)="toggleColumnVisibility(column, $event)">
                    <span class="column-name">{{ column.headerName }}</span>
                  </div>
                }
              </div>
            }
          </div>
        }
        
        <!-- Ungrouped columns -->
        @if (ungroupedColumns.length > 0) {
          <div class="column-group">
            <div class="group-header">
              <span class="group-name">Other Columns</span>
            </div>
            <div class="group-columns">
              @for (column of ungroupedColumns; track column.field) {
                <div class="column-item">
                  <input 
                    type="checkbox" 
                    [checked]="column.visible"
                    (change)="toggleColumnVisibility(column, $event)">
                  <span class="column-name">{{ column.headerName }}</span>
                </div>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .column-panel {
      width: 300px;
      height: 100%;
      background: white;
      border-left: 1px solid #ddd;
      display: flex;
      flex-direction: column;
    }
    
    .panel-header {
      padding: 15px;
      border-bottom: 1px solid #ddd;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .panel-header h3 {
      margin: 0;
      font-size: 16px;
    }
    
    .btn-toggle-all {
      padding: 5px 10px;
      font-size: 12px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    
    .search-box {
      padding: 10px 15px;
      border-bottom: 1px solid #ddd;
    }
    
    .search-box input {
      width: 100%;
      padding: 8px;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
    
    .groups-container {
      flex: 1;
      overflow-y: auto;
      padding: 10px;
    }
    
    .column-group {
      margin-bottom: 15px;
    }
    
    .group-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      background: #f5f5f5;
      border-radius: 4px;
      cursor: pointer;
      user-select: none;
    }
    
    .group-header:hover {
      background: #e8e8e8;
    }
    
    .expand-icon {
      width: 12px;
      font-size: 10px;
    }
    
    .group-name {
      font-weight: 600;
      flex: 1;
    }
    
    .column-count {
      font-size: 12px;
      color: #666;
    }
    
    .group-columns {
      padding-left: 30px;
      margin-top: 5px;
    }
    
    .column-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      cursor: pointer;
    }
    
    .column-item:hover {
      background: #f9f9f9;
    }
    
    .column-name {
      font-size: 14px;
    }
  `]
})
export class ColumnVisibilityPanel {
  @Input() columns: ColumnVisibilityItem[] = [];
  @Output() visibilityChanged = new EventEmitter<{ field: string, visible: boolean }>();
  
  searchTerm: string = '';
  filteredGroups: any[] = [];
  ungroupedColumns: ColumnVisibilityItem[] = [];
  allColumnsVisible: boolean = true;

  ngOnInit(): void {
    this.buildGroups();
  }

  ngOnChanges(): void {
    this.buildGroups();
  }

  private buildGroups(): void {
    const groupMap = new Map<string, ColumnVisibilityItem[]>();
    this.ungroupedColumns = [];
    
    this.columns.forEach(col => {
      if (col.group) {
        if (!groupMap.has(col.group)) {
          groupMap.set(col.group, []);
        }
        groupMap.get(col.group)!.push(col);
      } else {
        this.ungroupedColumns.push(col);
      }
    });
    
    this.filteredGroups = Array.from(groupMap.entries()).map(([name, columns]) => ({
      name,
      columns,
      expanded: true,
      allVisible: columns.every(c => c.visible),
      someVisible: columns.some(c => c.visible) && !columns.every(c => c.visible),
      visibleCount: columns.filter(c => c.visible).length
    }));
    
    this.updateAllColumnsVisible();
  }

  filterColumns(): void {
    if (!this.searchTerm) {
      this.buildGroups();
      return;
    }
    
    const term = this.searchTerm.toLowerCase();
    this.filteredGroups = this.filteredGroups.map(group => ({
      ...group,
      columns: group.columns.filter((col: ColumnVisibilityItem) => 
        col.headerName.toLowerCase().includes(term) ||
        col.field.toLowerCase().includes(term)
      )
    })).filter(group => group.columns.length > 0);
    
    this.ungroupedColumns = this.ungroupedColumns.filter(col =>
      col.headerName.toLowerCase().includes(term) ||
      col.field.toLowerCase().includes(term)
    );
  }

  toggleGroup(group: any): void {
    group.expanded = !group.expanded;
  }

  toggleGroupVisibility(group: any, event: any): void {
    const visible = event.target.checked;
    group.columns.forEach((col: ColumnVisibilityItem) => {
      col.visible = visible;
      this.visibilityChanged.emit({ field: col.field, visible });
    });
    group.allVisible = visible;
    group.someVisible = false;
    group.visibleCount = visible ? group.columns.length : 0;
    this.updateAllColumnsVisible();
  }

  toggleColumnVisibility(column: ColumnVisibilityItem, event: any): void {
    column.visible = event.target.checked;
    this.visibilityChanged.emit({ field: column.field, visible: column.visible });
    this.buildGroups();
  }

  toggleAll(): void {
    const newVisibility = !this.allColumnsVisible;
    this.columns.forEach(col => {
      col.visible = newVisibility;
      this.visibilityChanged.emit({ field: col.field, visible: newVisibility });
    });
    this.buildGroups();
  }

  private updateAllColumnsVisible(): void {
    this.allColumnsVisible = this.columns.every(c => c.visible);
  }
}
```

---

## Part 3: Save User Preferences

### Database Schema for Column State

**File: `API/WebAPI/Database/Migrations/AddGridColumnState.sql`**

```sql
CREATE TABLE GridColumnState (
    Id INT PRIMARY KEY IDENTITY(1,1),
    UserId INT NOT NULL,
    ProcedureName NVARCHAR(200) NOT NULL,
    ColumnState NVARCHAR(MAX) NOT NULL,  -- JSON: AG Grid column state
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 DEFAULT GETUTCDATE(),
    
    CONSTRAINT FK_GridColumnState_User FOREIGN KEY (UserId) REFERENCES Users(Id),
    CONSTRAINT UQ_GridColumnState_UserProc UNIQUE (UserId, ProcedureName)
);

CREATE INDEX IX_GridColumnState_UserId ON GridColumnState(UserId);
CREATE INDEX IX_GridColumnState_ProcedureName ON GridColumnState(ProcedureName);
```

### API Endpoints for Column State

**File: `API/WebAPI/Controllers/DynamicGridController.cs`**

```csharp
[HttpGet("column-state/{procedureName}")]
public async Task<IActionResult> GetColumnState(string procedureName)
{
    var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
    var state = await _gridService.GetColumnStateAsync(userId, procedureName);
    return Ok(state);
}

[HttpPost("column-state")]
public async Task<IActionResult> SaveColumnState([FromBody] SaveColumnStateRequest request)
{
    var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
    await _gridService.SaveColumnStateAsync(userId, request.ProcedureName, request.ColumnState);
    return Ok(new { success = true });
}
```

### Frontend - Save/Restore Column State

```typescript
// In dynamic-grid.ts
saveColumnState(): void {
  if (!this.gridApi) return;
  
  const columnState = this.gridApi.getColumnState();
  
  this.dynamicGridService.saveColumnState({
    procedureName: this.procedureName,
    columnState: JSON.stringify(columnState)
  }).subscribe({
    next: () => console.log('Column state saved'),
    error: (err) => console.error('Failed to save column state:', err)
  });
}

restoreColumnState(): void {
  this.dynamicGridService.getColumnState(this.procedureName).subscribe({
    next: (state) => {
      if (state && this.gridApi) {
        this.gridApi.applyColumnState({ state: JSON.parse(state), applyOrder: true });
      }
    },
    error: (err) => console.error('Failed to restore column state:', err)
  });
}
```

---

## Summary

### Column Grouping
✅ Define groups in stored procedure metadata  
✅ Use `columnGroup` field to assign columns to groups  
✅ Use `columnGroupShow` to control visibility behavior  
✅ AG Grid automatically renders group headers  

### Column Visibility
✅ Built-in AG Grid Columns Tool Panel  
✅ Custom visibility panel component (optional)  
✅ Show/hide individual columns or entire groups  
✅ Search functionality for finding columns  

### User Preferences
✅ Save column state to database  
✅ Restore on grid load  
✅ Per-user, per-procedure preferences  

### Next Steps
1. Update stored procedures with column group metadata
2. Enable AG Grid side bar with columns tool panel
3. Implement save/restore column state
4. Test with complex multi-group grids
