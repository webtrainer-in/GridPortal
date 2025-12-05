# Dynamic Grid Component

A reusable Dynamic Grid component for displaying tabular data with built-in sorting, filtering, and pagination.

## Features

- ✅ Reusable across multiple components
- ✅ Built-in sorting and filtering
- ✅ Pagination support
- ✅ Responsive column sizing
- ✅ Auto-generates columns from data (optional)
- ✅ Customizable styling
- ✅ TypeScript support with interfaces

## Installation

AG Grid packages are already installed:
```bash
npm install ag-grid-angular ag-grid-community
```

## Usage

### Basic Usage

```typescript
import { DynamicGrid } from '@shared/components/ag-grid/ag-grid.component';
import { ColDef } from 'ag-grid-community';

@Component({
  selector: 'app-my-component',
  standalone: true,
  imports: [DynamicGrid],
  template: `
    <app-dynamic-grid
      [columnDefs]="columns"
      [rowData]="data"
    ></app-dynamic-grid>
  `
})
export class MyComponent {
  columns: ColDef[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Name', flex: 1 },
    { field: 'email', headerName: 'Email', flex: 1 }
  ];

  data = [
    { id: 1, name: 'John', email: 'john@example.com' },
    { id: 2, name: 'Jane', email: 'jane@example.com' }
  ];
}
```

### With Pagination

```typescript
<app-dynamic-grid
  [columnDefs]="columns"
  [rowData]="data"
  [pagination]="true"
  [paginationPageSize]="20"
></app-dynamic-grid>
```

### Auto-Height Layout

```typescript
<app-dynamic-grid
  [columnDefs]="columns"
  [rowData]="data"
  [domLayout]="'autoHeight'"
></app-dynamic-grid>
```

## Component Inputs

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `columnDefs` | `ColDef[]` | `[]` | Column definitions from AG Grid |
| `rowData` | `GridRow[]` | `[]` | Array of data rows |
| `defaultColDef` | `ColDef` | See below | Default properties for all columns |
| `pagination` | `boolean` | `true` | Enable/disable pagination |
| `paginationPageSize` | `number` | `10` | Number of rows per page |
| `domLayout` | `'normal' \| 'autoHeight' \| 'print'` | `'normal'` | Grid layout mode |

### Default Column Definition

```typescript
{
  flex: 1,
  minWidth: 100,
  resizable: true,
  sortable: true,
  filter: true
}
```

## Demo Component

A demo component is included at:
```
src/shared/components/ag-grid/ag-grid-demo.component.ts
```

Import and use the `AgGridDemoComponent` to see a working example with 15 sample employee records.

## Styling

The component uses the AG Grid Quartz theme. You can customize styling in `ag-grid.component.scss`.

### Available AG Grid Themes

- `ag-theme-quartz` (default)
- `ag-theme-alpine`
- `ag-theme-balham`
- `ag-theme-material`

Change the theme class in the template to use different themes.

### Advanced Usage

### Custom Cell Renderers

```typescript
import { DynamicGrid } from '@shared/components/ag-grid/ag-grid.component';

columns: ColDef[] = [
  {
    field: 'status',
    headerName: 'Status',
    cellRenderer: (params) => {
      const status = params.value;
      const color = status === 'Active' ? 'green' : 'red';
      return `<span style="color: ${color}">${status}</span>`;
    }
  }
];
```

### Dynamic Data Updates

```typescript
export class MyComponent {
  @ViewChild(DynamicGrid) gridComponent!: DynamicGrid;

  updateData(newData: GridRow[]) {
    this.data = newData;
  }
}
```

## Files

- `ag-grid.component.ts` - Main component logic
- `ag-grid.component.html` - Component template
- `ag-grid.component.scss` - Component styles
- `ag-grid-demo.component.ts` - Demo component with sample data

## Next Steps

1. Use the demo component to test the grid in your application
2. Customize column definitions based on your data model
3. Integrate with your services to fetch real data
4. Add custom cell renderers for specific columns as needed
