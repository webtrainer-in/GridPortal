/**
 * Configuration model for the Dynamic Grid Component
 */

/**
 * Column configuration interface
 */
export interface GridColumn {
  /** Unique field name from the data object */
  field: string;
  
  /** Display header text for the column */
  header: string;
  
  /** Whether to show this column (default: true) */
  visible?: boolean;
  
  /** Column width (e.g., '200px', '10%', 'auto') */
  width?: string;
  
  /** Whether column is sortable (default: true) */
  sortable?: boolean;
  
  /** Whether column is filterable (default: true) */
  filterable?: boolean;
  
  /** Data type for proper formatting and filtering */
  dataType?: 'text' | 'number' | 'date' | 'boolean';
  
  /** Custom format function for cell value */
  format?: (value: any, rowData: any) => string;
  
  /** Custom CSS class for the column */
  styleClass?: string;
  
  /** Align content: left, center, right */
  align?: 'left' | 'center' | 'right';
}

/**
 * Grid configuration options
 */
export interface GridOptions {
  /** Enable pagination (default: true) */
  paginator?: boolean;
  
  /** Number of rows per page (default: 50) */
  rows?: number;
  
  /** Available rows per page options */
  rowsPerPageOptions?: number[];
  
  /** Enable virtual scrolling for large datasets (default: true) */
  virtualScroll?: boolean;
  
  /** Height of each row for virtual scrolling (default: 50) */
  virtualScrollItemSize?: number;
  
  /** Enable global search/filter (default: true) */
  globalFilter?: boolean;
  
  /** Enable row selection (default: false) */
  selectable?: boolean;
  
  /** Selection mode: single or multiple */
  selectionMode?: 'single' | 'multiple';
  
  /** Enable lazy loading for API data (default: false) */
  lazy?: boolean;
  
  /** Show loading indicator (default: false) */
  loading?: boolean;
  
  /** Enable column resizing (default: true) */
  resizableColumns?: boolean;
  
  /** Enable column reordering (default: true) */
  reorderableColumns?: boolean;
  
  /** Show grid lines (default: true) */
  showGridlines?: boolean;
  
  /** Striped rows (default: true) */
  stripedRows?: boolean;
  
  /** Enable export to CSV (default: true) */
  exportCSV?: boolean;
  
  /** Custom CSS class for the table */
  styleClass?: string;
  
  /** Responsive layout (default: true) */
  responsive?: boolean;
}

/**
 * Event emitted on lazy load
 */
export interface GridLazyLoadEvent {
  first: number;
  rows: number;
  sortField?: string;
  sortOrder?: number;
  filters?: any;
  globalFilter?: string;
}

/**
 * Complete grid configuration
 */
export interface GridConfig {
  /** Array of column configurations */
  columns: GridColumn[];
  
  /** Grid options */
  options?: GridOptions;
  
  /** Static JSON data (alternative to API) */
  data?: any[];
  
  /** API endpoint URL for lazy loading */
  apiEndpoint?: string;
  
  /** Total records count (for lazy loading) */
  totalRecords?: number;
}
