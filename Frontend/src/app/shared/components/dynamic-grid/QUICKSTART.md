# Quick Start Guide - Dynamic Grid

## Step 1: Import HttpClient (if not already done)

In your `app.config.ts`, ensure HttpClient is provided:

```typescript
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    // ... other providers
  ]
};
```

## Step 2: Use in Any Component

### Method 1: Direct Import (Recommended)

```typescript
import { Component } from '@angular/core';
import { DynamicGridComponent } from './shared/components/dynamic-grid/dynamic-grid';
import type { GridConfig, GridColumn } from './shared/components/dynamic-grid/dynamic-grid.model';

@Component({
  selector: 'app-my-page',
  standalone: true,
  imports: [DynamicGridComponent],
  template: `
    <div class="page-container">
      <h1>My Data</h1>
      <app-dynamic-grid [config]="gridConfig"></app-dynamic-grid>
    </div>
  `
})
export class MyPageComponent {
  gridConfig: GridConfig = {
    columns: [
      { field: 'id', header: 'ID', width: '80px' },
      { field: 'name', header: 'Name', width: '200px' },
      { field: 'email', header: 'Email', width: '250px' }
    ],
    data: [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
    ],
    options: {
      paginator: true,
      rows: 25,
      selectable: true,
      exportCSV: true
    }
  };
}
```

### Method 2: Using Index Export

```typescript
import { DynamicGridComponent } from './shared/components/dynamic-grid';
import type { GridConfig } from './shared/components/dynamic-grid';
```

## Step 3: Common Scenarios

### Scenario A: Display Existing Data from Your Service

```typescript
import { Component, OnInit } from '@angular/core';
import { DynamicGridComponent } from './shared/components/dynamic-grid/dynamic-grid';
import type { GridConfig, GridColumn } from './shared/components/dynamic-grid/dynamic-grid.model';
import { YourDataService } from './services/your-data.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [DynamicGridComponent],
  template: '<app-dynamic-grid [config]="gridConfig"></app-dynamic-grid>'
})
export class UsersComponent implements OnInit {
  gridConfig!: GridConfig;

  constructor(private dataService: YourDataService) {}

  ngOnInit() {
    this.dataService.getUsers().subscribe(users => {
      const columns: GridColumn[] = [
        { field: 'id', header: 'ID', width: '80px' },
        { field: 'username', header: 'Username', width: '150px' },
        { field: 'email', header: 'Email', width: '250px' },
        { field: 'role', header: 'Role', width: '120px' }
      ];

      this.gridConfig = {
        columns: columns,
        data: users,
        options: {
          paginator: true,
          rows: 50,
          selectable: true,
          exportCSV: true
        }
      };
    });
  }
}
```

### Scenario B: Load from API with Lazy Loading

```typescript
import { Component, OnInit } from '@angular/core';
import { DynamicGridComponent } from './shared/components/dynamic-grid/dynamic-grid';
import type { GridConfig, GridColumn, GridLazyLoadEvent } from './shared/components/dynamic-grid/dynamic-grid.model';

@Component({
  selector: 'app-large-dataset',
  standalone: true,
  imports: [DynamicGridComponent],
  template: `
    <app-dynamic-grid 
      [config]="gridConfig"
      (onLazyLoad)="handleLazyLoad($event)">
    </app-dynamic-grid>
  `
})
export class LargeDatasetComponent implements OnInit {
  gridConfig!: GridConfig;

  ngOnInit() {
    const columns: GridColumn[] = [
      { field: 'id', header: 'ID', width: '80px' },
      { field: 'name', header: 'Name', width: '200px' },
      { field: 'status', header: 'Status', width: '120px' }
    ];

    this.gridConfig = {
      columns: columns,
      apiEndpoint: '/api/your-endpoint',
      totalRecords: 1000000, // Total records in your database
      options: {
        paginator: true,
        rows: 100,
        lazy: true, // Enable server-side pagination
        virtualScroll: true,
        selectable: false,
        globalFilter: false // Use server-side search
      }
    };
  }

  handleLazyLoad(event: GridLazyLoadEvent) {
    console.log('Load page:', event.first, 'rows:', event.rows);
    // The component will automatically call your API with these parameters
  }
}
```

### Scenario C: Hide Sensitive Columns

```typescript
const columns: GridColumn[] = [
  { field: 'id', header: 'ID', visible: true },
  { field: 'name', header: 'Name', visible: true },
  { field: 'email', header: 'Email', visible: true },
  { field: 'ssn', header: 'SSN', visible: false }, // Hidden
  { field: 'salary', header: 'Salary', visible: false }, // Hidden
  { field: 'internalCode', header: 'Internal', visible: false } // Hidden
];

// Users can show these columns using the column selector dropdown
```

### Scenario D: Custom Formatting

```typescript
const columns: GridColumn[] = [
  { 
    field: 'amount', 
    header: 'Amount', 
    dataType: 'number',
    format: (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
  },
  { 
    field: 'createdAt', 
    header: 'Date',
    dataType: 'date',
    format: (value: string) => new Date(value).toLocaleDateString('en-US')
  },
  { 
    field: 'status', 
    header: 'Status',
    format: (value: string) => value === 'active' ? '✓ Active' : '✗ Inactive'
  }
];
```

## Step 4: Add to Routes (Optional)

If you want to create a dedicated page for examples:

```typescript
// app.routes.ts
import { GridExampleComponent } from './shared/components/dynamic-grid/grid-example.component';

export const routes: Routes = [
  // ... your other routes
  {
    path: 'grid-examples',
    component: GridExampleComponent
  }
];
```

## Step 5: Test It

1. **For static data**: Just set `config.data` with your array
2. **For API data**: Set `config.apiEndpoint` to your API URL
3. **For large datasets**: Set `options.lazy = true` and `options.virtualScroll = true`

## Common Issues & Solutions

### Issue: "Cannot find module"
**Solution**: Check your import path. Use relative paths from your component location.

### Issue: "HttpClient not provided"
**Solution**: Add `provideHttpClient()` to your `app.config.ts` providers array.

### Issue: Columns not showing
**Solution**: 
- Check that column `field` names match your data properties
- Verify `visible` is not set to `false`
- Check browser console for errors

### Issue: Performance problems with large data
**Solution**:
- Enable virtual scrolling: `virtualScroll: true`
- Use lazy loading: `lazy: true`
- Reduce rows per page: `rows: 50`

## Next Steps

1. ✅ Copy the example from `grid-example.component.ts`
2. ✅ Modify columns to match your data structure
3. ✅ Set your API endpoint or static data
4. ✅ Customize options (pagination, filtering, etc.)
5. ✅ Test with your actual data

## Need Help?

- Check `README.md` for detailed documentation
- See `grid-example.component.ts` for working examples
- Review PrimeNG Table documentation: https://primeng.org/table
