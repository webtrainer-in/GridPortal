# Using Dynamic Grid in a New Component

## Overview

This guide shows you how to use the `dynamic-grid` component in your Angular application. The dynamic grid is a fully generic, reusable component that can display any data from any stored procedure without writing table-specific code.

---

## Quick Start

### **Step 1: Create Your Component**

```bash
ng generate component components/my-grid
```

### **Step 2: Add Grid to Template**

**File:** `my-grid.component.html`

```html
<div class="grid-container">
  <h2>My Grid Title</h2>
  
  <app-dynamic-grid
    [procedureName]="'sp_Grid_MyTable'"
    [showColumnVisibility]="true"
    [showGlobalSearch]="true"
    [enableInlineEdit]="true">
  </app-dynamic-grid>
</div>
```

### **Step 3: Done!**

That's it! The grid will automatically:
- ✅ Fetch data from `sp_Grid_MyTable`
- ✅ Display columns with proper types
- ✅ Enable pagination, sorting, filtering
- ✅ Support inline editing and deletion

---

## Component Properties

### **Required Properties**

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `procedureName` | `string` | Name of stored procedure to call | `'sp_Grid_Buses'` |

### **Optional Properties**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `showColumnVisibility` | `boolean` | `true` | Show/hide column visibility toggle |
| `showGlobalSearch` | `boolean` | `true` | Show global search box |
| `enableInlineEdit` | `boolean` | `true` | Enable inline editing |
| `paginationThreshold` | `number` | `1000` | Switch to server-side pagination above this |
| `defaultPageSize` | `number` | `15` | Default rows per page |

---

## Complete Examples

### **Example 1: Simple Grid (Read-Only)**

**Component:** `bus-list.component.html`

```html
<div class="page-container">
  <div class="page-header">
    <h1>Bus List</h1>
    <p>View all buses in the power system</p>
  </div>

  <app-dynamic-grid
    [procedureName]="'sp_Grid_Buses'"
    [enableInlineEdit]="false">
  </app-dynamic-grid>
</div>
```

**Features:**
- ✅ Display bus data
- ✅ Pagination, sorting, filtering
- ❌ No editing or deletion

---

### **Example 2: Full CRUD Grid**

**Component:** `employee-management.component.html`

```html
<div class="page-container">
  <div class="page-header">
    <h1>Employee Management</h1>
    <button class="btn btn-primary" (click)="addEmployee()">
      <i class="fas fa-plus"></i> Add Employee
    </button>
  </div>

  <app-dynamic-grid
    [procedureName]="'sp_Grid_Employees'"
    [showColumnVisibility]="true"
    [showGlobalSearch]="true"
    [enableInlineEdit]="true"
    [paginationThreshold]="500"
    [defaultPageSize]="20">
  </app-dynamic-grid>
</div>
```

**Component:** `employee-management.component.ts`

```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-employee-management',
  templateUrl: './employee-management.component.html',
  styleUrls: ['./employee-management.component.scss']
})
export class EmployeeManagementComponent {
  
  addEmployee() {
    // Navigate to add employee form or open modal
    console.log('Add employee clicked');
  }
}
```

**Features:**
- ✅ Full CRUD operations
- ✅ Column visibility toggle
- ✅ Global search
- ✅ Custom page size (20 rows)
- ✅ Server-side pagination above 500 rows

---

### **Example 3: Grid with Custom Styling**

**Component:** `custom-grid.component.html`

```html
<div class="custom-grid-wrapper">
  <div class="grid-header">
    <h2>Custom Styled Grid</h2>
    <div class="grid-actions">
      <button class="action-btn">Export</button>
      <button class="action-btn">Import</button>
    </div>
  </div>

  <app-dynamic-grid
    [procedureName]="'sp_Grid_Buses'"
    [showColumnVisibility]="true"
    [showGlobalSearch]="true">
  </app-dynamic-grid>
</div>
```

**Component:** `custom-grid.component.scss`

```scss
.custom-grid-wrapper {
  padding: 20px;
  background: #f5f5f5;
  border-radius: 8px;

  .grid-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding: 15px;
    background: white;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);

    h2 {
      margin: 0;
      color: #333;
    }

    .grid-actions {
      display: flex;
      gap: 10px;

      .action-btn {
        padding: 8px 16px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;

        &:hover {
          background: #0056b3;
        }
      }
    }
  }
}
```

---

### **Example 4: Multiple Grids in One Component**

**Component:** `dashboard.component.html`

```html
<div class="dashboard">
  <div class="grid-section">
    <h3>Recent Buses</h3>
    <app-dynamic-grid
      [procedureName]="'sp_Grid_Buses'"
      [defaultPageSize]="5"
      [enableInlineEdit]="false">
    </app-dynamic-grid>
  </div>

  <div class="grid-section">
    <h3>Recent Employees</h3>
    <app-dynamic-grid
      [procedureName]="'sp_Grid_Employees'"
      [defaultPageSize]="5"
      [enableInlineEdit]="false">
    </app-dynamic-grid>
  </div>
</div>
```

**Component:** `dashboard.component.scss`

```scss
.dashboard {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  padding: 20px;

  .grid-section {
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);

    h3 {
      margin-top: 0;
      margin-bottom: 15px;
      color: #333;
      border-bottom: 2px solid #007bff;
      padding-bottom: 10px;
    }
  }
}
```

---

## Routing Setup

### **Add Route to Your Module**

**File:** `app-routing.module.ts`

```typescript
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BusListComponent } from './components/bus-list/bus-list.component';
import { EmployeeManagementComponent } from './components/employee-management/employee-management.component';

const routes: Routes = [
  { path: 'buses', component: BusListComponent },
  { path: 'employees', component: EmployeeManagementComponent },
  // ... other routes
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
```

---

## Backend Requirements

### **Stored Procedure Setup**

For the grid to work, you need **3 stored procedures** registered:

#### **1. Grid Procedure (Data Fetching)**

**File:** `sp_Grid_MyTable.sql`

```sql
CREATE OR REPLACE FUNCTION sp_Grid_MyTable(
    p_PageNumber INT DEFAULT 1,
    p_PageSize INT DEFAULT 15,
    p_StartRow INT DEFAULT NULL,
    p_EndRow INT DEFAULT NULL,
    p_SortColumn VARCHAR DEFAULT NULL,
    p_SortDirection VARCHAR DEFAULT 'ASC',
    p_FilterJson TEXT DEFAULT NULL,
    p_SearchTerm VARCHAR DEFAULT NULL
)
RETURNS JSONB AS $$
-- Implementation here
-- Must return: { rows: [...], columns: [...], totalCount: N }
$$ LANGUAGE plpgsql;
```

#### **2. Update Procedure**

**File:** `sp_Grid_Update_MyEntity.sql`

```sql
CREATE OR REPLACE FUNCTION sp_Grid_Update_MyEntity(
    p_Id INT,
    p_ChangesJson TEXT,
    p_UserId INT
)
RETURNS JSONB AS $$
-- Implementation here
-- Must return: { success: true/false, message: "..." }
$$ LANGUAGE plpgsql;
```

#### **3. Delete Procedure**

**File:** `sp_Grid_Delete_MyEntity.sql`

```sql
CREATE OR REPLACE FUNCTION sp_Grid_Delete_MyEntity(
    p_Id INT
)
RETURNS JSONB AS $$
-- Implementation here
-- Must return: { success: true/false, message: "..." }
$$ LANGUAGE plpgsql;
```

#### **4. Register All Procedures**

```sql
-- Register grid procedure
INSERT INTO "StoredProcedureRegistry" (
    "ProcedureName", "DisplayName", "Category", "IsActive",
    "AllowedRoles", "DefaultPageSize", "MaxPageSize"
)
VALUES (
    'sp_Grid_MyTable', 'My Table Grid', 'My Category', true,
    '["Admin", "Manager", "User"]'::jsonb, 15, 1000
);

-- Register update procedure
INSERT INTO "StoredProcedureRegistry" (
    "ProcedureName", "DisplayName", "Category", "IsActive",
    "AllowedRoles", "DefaultPageSize", "MaxPageSize"
)
VALUES (
    'sp_Grid_Update_MyEntity', 'Update My Entity', 'My Category', true,
    '["Admin", "Manager"]'::jsonb, 1, 1
);

-- Register delete procedure
INSERT INTO "StoredProcedureRegistry" (
    "ProcedureName", "DisplayName", "Category", "IsActive",
    "AllowedRoles", "DefaultPageSize", "MaxPageSize"
)
VALUES (
    'sp_Grid_Delete_MyEntity', 'Delete My Entity', 'My Category', true,
    '["Admin", "Manager"]'::jsonb, 1, 1
);
```

---

## Common Patterns

### **Pattern 1: Grid with Toolbar**

```html
<div class="grid-page">
  <!-- Toolbar -->
  <div class="toolbar">
    <button (click)="refresh()">
      <i class="fas fa-sync"></i> Refresh
    </button>
    <button (click)="export()">
      <i class="fas fa-download"></i> Export
    </button>
  </div>

  <!-- Grid -->
  <app-dynamic-grid
    [procedureName]="'sp_Grid_MyTable'">
  </app-dynamic-grid>
</div>
```

### **Pattern 2: Grid with Filters**

```html
<div class="grid-page">
  <!-- Custom Filters -->
  <div class="filters">
    <select [(ngModel)]="selectedCategory" (change)="onFilterChange()">
      <option value="">All Categories</option>
      <option value="A">Category A</option>
      <option value="B">Category B</option>
    </select>
  </div>

  <!-- Grid -->
  <app-dynamic-grid
    [procedureName]="gridProcedure">
  </app-dynamic-grid>
</div>
```

**Component:**
```typescript
export class MyGridComponent {
  selectedCategory = '';
  gridProcedure = 'sp_Grid_MyTable';

  onFilterChange() {
    // You can pass filter to stored procedure via FilterJson
    // Or use different procedures for different filters
    if (this.selectedCategory === 'A') {
      this.gridProcedure = 'sp_Grid_MyTable_CategoryA';
    } else {
      this.gridProcedure = 'sp_Grid_MyTable';
    }
  }
}
```

### **Pattern 3: Grid in Modal/Dialog**

```html
<!-- Modal -->
<div class="modal" *ngIf="showModal">
  <div class="modal-content">
    <div class="modal-header">
      <h3>Select Item</h3>
      <button (click)="closeModal()">×</button>
    </div>
    
    <div class="modal-body">
      <app-dynamic-grid
        [procedureName]="'sp_Grid_MyTable'"
        [defaultPageSize]="10"
        [enableInlineEdit]="false">
      </app-dynamic-grid>
    </div>
  </div>
</div>
```

---

## Troubleshooting

### **Grid Not Loading**

**Check:**
1. ✅ Stored procedure exists and is registered
2. ✅ User has access (check `AllowedRoles`)
3. ✅ Procedure name is correct (case-sensitive)
4. ✅ Browser console for errors
5. ✅ Network tab for API response

### **Edit/Delete Not Working**

**Check:**
1. ✅ Update/Delete procedures exist and are registered
2. ✅ Naming convention: `sp_Grid_Update_[Entity]`, `sp_Grid_Delete_[Entity]`
3. ✅ User has permission for update/delete procedures
4. ✅ Primary key is correctly identified in grid data

### **Styling Issues**

**Solution:** Add custom CSS to your component:

```scss
::ng-deep app-dynamic-grid {
  .grid-container {
    // Your custom styles
  }
}
```

---

## Best Practices

### **1. Use Descriptive Procedure Names**

```typescript
// Good
[procedureName]="'sp_Grid_ActiveEmployees'"

// Bad
[procedureName]="'sp_Grid_Emp'"
```

### **2. Set Appropriate Page Sizes**

```html
<!-- For small datasets -->
<app-dynamic-grid
  [procedureName]="'sp_Grid_SmallTable'"
  [defaultPageSize]="50">
</app-dynamic-grid>

<!-- For large datasets -->
<app-dynamic-grid
  [procedureName]="'sp_Grid_LargeTable'"
  [defaultPageSize]="15"
  [paginationThreshold]="500">
</app-dynamic-grid>
```

### **3. Disable Features You Don't Need**

```html
<!-- Read-only grid -->
<app-dynamic-grid
  [procedureName]="'sp_Grid_ReadOnly'"
  [enableInlineEdit]="false"
  [showColumnVisibility]="false">
</app-dynamic-grid>
```

### **4. Add Loading States**

```html
<div class="page-container">
  <div *ngIf="loading" class="loading-spinner">
    Loading...
  </div>
  
  <app-dynamic-grid
    *ngIf="!loading"
    [procedureName]="'sp_Grid_MyTable'">
  </app-dynamic-grid>
</div>
```

---

## Summary

Using the dynamic grid is simple:

1. **Add component** to your template with `[procedureName]`
2. **Ensure stored procedures** exist and are registered
3. **Customize** with optional properties
4. **Style** with your own CSS

The grid handles everything else automatically! 🎉

---

## Quick Reference

### **Minimal Setup**
```html
<app-dynamic-grid [procedureName]="'sp_Grid_MyTable'"></app-dynamic-grid>
```

### **Full Configuration**
```html
<app-dynamic-grid
  [procedureName]="'sp_Grid_MyTable'"
  [showColumnVisibility]="true"
  [showGlobalSearch]="true"
  [enableInlineEdit]="true"
  [paginationThreshold]="1000"
  [defaultPageSize]="15">
</app-dynamic-grid>
```

### **Required Backend**
- ✅ `sp_Grid_MyTable` (grid data)
- ✅ `sp_Grid_Update_MyEntity` (editing)
- ✅ `sp_Grid_Delete_MyEntity` (deletion)
- ✅ All registered in `StoredProcedureRegistry`
