/**
 * Configuration for dynamic table column
 */
export interface DynamicTableColumn {
  field: string;
  header: string;
  width?: string;
  dataType?: 'string' | 'number' | 'date' | 'boolean' | 'currency';
  sortable?: boolean;
  filterable?: boolean;
  format?: string; // for dates (e.g., 'MM/dd/yyyy') or currency
  visible?: boolean;
  align?: 'left' | 'center' | 'right';
}

/**
 * Configuration for dynamic table
 */
export interface DynamicTableConfig {
  columns: DynamicTableColumn[];
  dataKey?: string;
  rowsPerPage?: number;
  paginator?: boolean;
  globalFilterFields?: string[];
  showGridlines?: boolean;
  striped?: boolean;
  scrollable?: boolean;
  scrollHeight?: string;
  resizableColumns?: boolean;
  reorderableColumns?: boolean;
}

/**
 * Response structure for table data
 */
export interface TableDataResponse<T = any> {
  data: T[];
  totalRecords?: number;
  message?: string;
  success?: boolean;
}
