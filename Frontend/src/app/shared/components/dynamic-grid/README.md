# Dynamic Grid Component

A highly performant, reusable Angular grid component built with **PrimeNG Table** that can handle millions of records through virtual scrolling and lazy loading.

## Features

✅ **Dynamic Data Loading**
- Static JSON data
- API endpoint (load all at once)
- Lazy loading from API (for large datasets)

✅ **Column Management**
- Dynamic column configuration
- Show/hide columns
- Column resizing and reordering
- Custom column formatting
- Nested field support (e.g., `user.address.city`)

✅ **Performance**
- Virtual scrolling for millions of records
- Lazy loading with server-side pagination
- Optimized rendering

✅ **User Features**
- Global search/filter
- Column-specific filtering
- Sorting (single column)
- Pagination
- Row selection (single/multiple)
- Export to CSV
- Responsive design

## Installation

The component uses PrimeNG (already installed in your project):

```bash
npm install primeng primeicons primeflex
```

## File Structure

```
src/app/shared/components/dynamic-grid/
├── dynamic-grid.ts              # Main component
├── dynamic-grid.html            # Template
├── dynamic-grid.scss            # Styles
├── dynamic-grid.model.ts        # TypeScript interfaces
├── grid-example.component.ts    # Usage examples
└── README.md                    # This file
```

## Usage

### 1. Basic Usage with Static Data

```typescript
import { DynamicGridComponent } from './shared/components/dynamic-grid/dynamic-grid';
import { GridConfig, GridColumn } from './shared/components/dynamic-grid/dynamic-grid.model';

@Component({
  imports: [DynamicGridComponent],
  // ...
})
export class MyComponent {
  gridConfig: GridConfig;

  ngOnInit() {
    const columns: GridColumn[] = [
      { field: 'id', header: 'ID', width: '80px' },
      { field: 'name', header: 'Name', width: '200px' },
      { field: 'email', header: 'Email', width: '250px' },
      { 
        field: 'salary', 
        header: 'Salary', 
        dataType: 'number',
        format: (value: number) => `$${value.toLocaleString()}`
      }
    ];

    this.gridConfig = {
      columns: columns,
      data: [
        { id: 1, name: 'John Doe', email: 'john@example.com', salary: 75000 },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', salary: 85000 }
      ],
      options: {
        paginator: true,
        rows: 25,
        selectable: true
      }
    };
  }
}
```

```html
<app-dynamic-grid [config]="gridConfig"></app-dynamic-grid>
```

### 2. Load from API Endpoint

```typescript
this.gridConfig = {
  columns: columns,
  apiEndpoint: 'https://api.example.com/users',
  options: {
    paginator: true,
    rows: 50,
    lazy: false // Load all data at once
  }
};
```

### 3. Lazy Loading (For Millions of Records)

```typescript
this.gridConfig = {
  columns: columns,
  apiEndpoint: 'https://api.example.com/large-dataset',
  totalRecords: 1000000, // Total records in database
  options: {
    paginator: true,
    rows: 100,
    lazy: true, // Enable lazy loading
    virtualScroll: true,
    virtualScrollItemSize: 50
  }
};
```

**Your API should accept these query parameters:**
- `first` - Starting index
- `rows` - Number of rows to fetch
- `sortField` - Field to sort by
- `sortOrder` - 1 for ascending, -1 for descending
- `filters` - JSON object with filter values
- `globalFilter` - Global search term

**API Response Format:**
```json
{
  "data": [ /* array of records */ ],
  "total": 1000000
}
```

Or simply return an array if total is known on client side.

### 4. Hide Columns

```typescript
const columns: GridColumn[] = [
  { field: 'id', header: 'ID', visible: true },
  { field: 'internalCode', header: 'Internal Code', visible: false }, // Hidden
  { field: 'name', header: 'Name', visible: true }
];
```

### 5. Custom Column Formatting

```typescript
{ 
  field: 'status', 
  header: 'Status',
  format: (value: string, rowData: any) => {
    return value === 'active' ? '✓ Active' : '✗ Inactive';
  }
},
{ 
  field: 'createdAt', 
  header: 'Created',
  dataType: 'date'
},
{ 
  field: 'price', 
  header: 'Price',
  dataType: 'number',
  align: 'right'
}
```

### 6. Nested Fields

```typescript
const columns: GridColumn[] = [
  { field: 'user.name', header: 'User Name' },
  { field: 'user.address.city', header: 'City' },
  { field: 'company.department.name', header: 'Department' }
];
```

### 7. Row Selection

```typescript
// In your component
this.gridConfig = {
  columns: columns,
  data: data,
  options: {
    selectable: true,
    selectionMode: 'multiple' // or 'single'
  }
};

handleRowSelect(rowData: any) {
  console.log('Selected:', rowData);
}
```

```html
<app-dynamic-grid 
  [config]="gridConfig"
  (onRowSelect)="handleRowSelect($event)">
</app-dynamic-grid>
```

## Configuration Reference

### GridColumn Interface

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `field` | string | Field name from data object (supports nested like 'user.name') | Required |
| `header` | string | Column header text | Required |
| `visible` | boolean | Show/hide column | true |
| `width` | string | Column width (px, %, auto) | auto |
| `sortable` | boolean | Enable sorting | true |
| `filterable` | boolean | Enable filtering | true |
| `dataType` | string | Data type: 'text', 'number', 'date', 'boolean' | 'text' |
| `format` | function | Custom formatter: `(value, rowData) => string` | - |
| `styleClass` | string | Custom CSS class | - |
| `align` | string | Text alignment: 'left', 'center', 'right' | 'left' |

### GridOptions Interface

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `paginator` | boolean | Enable pagination | true |
| `rows` | number | Rows per page | 50 |
| `rowsPerPageOptions` | number[] | Page size options | [25, 50, 100, 500] |
| `virtualScroll` | boolean | Enable virtual scrolling | true |
| `virtualScrollItemSize` | number | Row height for virtual scroll | 50 |
| `globalFilter` | boolean | Enable global search | true |
| `selectable` | boolean | Enable row selection | false |
| `selectionMode` | string | 'single' or 'multiple' | 'single' |
| `lazy` | boolean | Enable lazy loading | false |
| `loading` | boolean | Show loading indicator | false |
| `resizableColumns` | boolean | Allow column resizing | true |
| `reorderableColumns` | boolean | Allow column reordering | true |
| `showGridlines` | boolean | Show grid lines | true |
| `stripedRows` | boolean | Alternating row colors | true |
| `exportCSV` | boolean | Enable CSV export | true |
| `responsive` | boolean | Responsive layout | true |

## Events

| Event | Description | Payload |
|-------|-------------|---------|
| `onRowSelect` | Emitted when a row is selected | Selected row data |
| `onLazyLoad` | Emitted on lazy load (pagination, sort, filter) | `GridLazyLoadEvent` |
| `onDataChange` | Emitted when data is loaded/changed | Array of data |

## Methods

You can access component methods via `@ViewChild`:

```typescript
@ViewChild(DynamicGridComponent) grid!: DynamicGridComponent;

// Refresh data
this.grid.refresh();

// Get selected rows
const selected = this.grid.getSelectedRows();

// Clear selection
this.grid.clearSelection();
```

## Performance Tips

### For Large Datasets (Millions of Records)

1. **Use Lazy Loading**
   ```typescript
   options: {
     lazy: true,
     virtualScroll: true,
     rows: 100
   }
   ```

2. **Implement Server-Side Pagination**
   - Your backend should handle filtering, sorting, and pagination
   - Return only the requested page of data

3. **Disable Client-Side Features**
   ```typescript
   options: {
     lazy: true,
     globalFilter: false, // Use server-side search
     exportCSV: false     // Export from server
   }
   ```

4. **Optimize Row Height**
   ```typescript
   virtualScrollItemSize: 50 // Adjust based on your content
   ```

### For Medium Datasets (10K-100K Records)

```typescript
options: {
  lazy: false,
  virtualScroll: true,
  virtualScrollItemSize: 50,
  rows: 50
}
```

### For Small Datasets (<10K Records)

```typescript
options: {
  lazy: false,
  virtualScroll: false,
  paginator: true,
  rows: 25
}
```

## Server-Side API Example

### Node.js/Express Example

```javascript
app.get('/api/users', (req, res) => {
  const first = parseInt(req.query.first) || 0;
  const rows = parseInt(req.query.rows) || 50;
  const sortField = req.query.sortField;
  const sortOrder = parseInt(req.query.sortOrder) || 1;
  const globalFilter = req.query.globalFilter;

  // Your database query with pagination, sorting, filtering
  const query = db.users
    .skip(first)
    .limit(rows);

  if (sortField) {
    query.sort({ [sortField]: sortOrder });
  }

  if (globalFilter) {
    query.where('name').regex(new RegExp(globalFilter, 'i'));
  }

  Promise.all([
    query.exec(),
    db.users.countDocuments()
  ]).then(([data, total]) => {
    res.json({ data, total });
  });
});
```

## Styling Customization

The component uses CSS variables for easy theming:

```scss
.dynamic-grid-container {
  --primary-color: #007bff;
  --surface-card: #ffffff;
  --text-color: #333333;
  --surface-border: #dee2e6;
}
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Why PrimeNG over AG-Grid?

| Feature | PrimeNG Table | AG-Grid Community |
|---------|---------------|-------------------|
| **License** | Free (MIT) | Free (Limited) |
| **Virtual Scrolling** | ✅ Full support | ⚠️ Limited |
| **Lazy Loading** | ✅ Built-in | ⚠️ Limited |
| **Large Datasets** | ✅ Millions | ⚠️ Restrictions |
| **Bundle Size** | Smaller | Larger |
| **Integration** | Already installed | Need additional setup |

## Troubleshooting

### Data not showing
- Check browser console for errors
- Verify API endpoint returns data in correct format
- Ensure column `field` names match your data properties

### Performance issues
- Enable virtual scrolling for large datasets
- Use lazy loading for millions of records
- Reduce the number of visible columns
- Implement server-side filtering/sorting

### Column not displaying
- Check `visible: true` in column config
- Verify field name matches data property
- Check if column is hidden via column selector

## Examples

See `grid-example.component.ts` for complete working examples:
- Static JSON data
- API endpoint loading
- Lazy loading with millions of records

## License

This component is part of the GridPortal project and uses PrimeNG (MIT License).
