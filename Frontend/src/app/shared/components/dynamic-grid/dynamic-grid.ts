import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { TooltipModule } from 'primeng/tooltip';
import { FormsModule } from '@angular/forms';
import { GridConfig, GridColumn, GridOptions, GridLazyLoadEvent } from './dynamic-grid.model';

/**
 * Dynamic Grid Component
 * 
 * A reusable, high-performance grid component that supports:
 * - Static JSON data or API endpoint
 * - Virtual scrolling for millions of records
 * - Dynamic column configuration
 * - Show/hide columns
 * - Sorting, filtering, pagination
 * - CSV export
 * 
 * @example
 * <app-dynamic-grid 
 *   [config]="gridConfig"
 *   (onRowSelect)="handleRowSelect($event)"
 *   (onLazyLoad)="loadData($event)">
 * </app-dynamic-grid>
 */
@Component({
  selector: 'app-dynamic-grid',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    MultiSelectModule,
    TooltipModule,
    FormsModule
  ],
  templateUrl: './dynamic-grid.html',
  styleUrls: ['./dynamic-grid.scss']
})
export class DynamicGridComponent implements OnInit, OnChanges {
  @Input() config!: GridConfig;
  @Output() onRowSelect = new EventEmitter<any>();
  @Output() onLazyLoad = new EventEmitter<GridLazyLoadEvent>();
  @Output() onDataChange = new EventEmitter<any[]>();

  // Internal state
  displayData: any[] = [];
  visibleColumns: GridColumn[] = [];
  allColumns: GridColumn[] = [];
  selectedRows: any[] | any = null;
  totalRecords: number = 0;
  loading: boolean = false;
  globalFilterValue: string = '';
  
  // Default options
  defaultOptions: GridOptions = {
    paginator: true,
    rows: 50,
    rowsPerPageOptions: [25, 50, 100, 500],
    virtualScroll: true,
    virtualScrollItemSize: 50,
    globalFilter: true,
    selectable: false,
    selectionMode: 'single',
    lazy: false,
    loading: false,
    resizableColumns: true,
    reorderableColumns: true,
    showGridlines: true,
    stripedRows: true,
    exportCSV: true,
    responsive: true,
    styleClass: 'p-datatable-sm'
  };

  options: GridOptions = {};

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.initializeGrid();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config'] && !changes['config'].firstChange) {
      this.initializeGrid();
    }
  }

  private initializeGrid(): void {
    if (!this.config) {
      console.error('Grid config is required');
      return;
    }

    // Merge default options with provided options
    this.options = { ...this.defaultOptions, ...this.config.options };

    // Setup columns
    this.allColumns = this.config.columns || [];
    this.updateVisibleColumns();
    
    console.log('All Columns:', this.allColumns);
    console.log('Visible Columns:', this.visibleColumns);

    // Load data
    if (this.config.data) {
      // Static data mode
      this.displayData = this.config.data;
      this.totalRecords = this.config.data.length;
      this.options.lazy = false;
    } else if (this.config.apiEndpoint && this.options.lazy) {
      // Lazy loading mode (load on demand)
      this.totalRecords = this.config.totalRecords || 0;
      this.options.lazy = true;
    } else if (this.config.apiEndpoint) {
      // Load all data from API at once
      this.loadAllDataFromApi();
    }
  }

  private updateVisibleColumns(): void {
    this.visibleColumns = this.allColumns.filter(col => col.visible !== false);
  }

  /**
   * Load all data from API endpoint at once (not lazy)
   */
  private loadAllDataFromApi(): void {
    if (!this.config.apiEndpoint) return;

    this.loading = true;
    this.http.get<any>(this.config.apiEndpoint).subscribe({
      next: (response) => {
        // Handle different response formats
        if (Array.isArray(response)) {
          this.displayData = response;
          this.totalRecords = response.length;
        } else if (response.data && Array.isArray(response.data)) {
          this.displayData = response.data;
          this.totalRecords = response.total || response.data.length;
        } else {
          console.error('Unexpected API response format', response);
        }
        this.loading = false;
        this.onDataChange.emit(this.displayData);
      },
      error: (error) => {
        console.error('Error loading data from API:', error);
        this.loading = false;
      }
    });
  }

  /**
   * Handle lazy loading events (pagination, sorting, filtering)
   */
  onLazyLoadData(event: any): void {
    if (!this.options.lazy || !this.config.apiEndpoint) return;

    this.loading = true;

    // Build query parameters
    let params = new HttpParams()
      .set('first', event.first.toString())
      .set('rows', event.rows.toString());

    if (event.sortField) {
      params = params.set('sortField', event.sortField);
      params = params.set('sortOrder', event.sortOrder.toString());
    }

    if (event.globalFilter) {
      params = params.set('globalFilter', event.globalFilter);
    }

    if (event.filters) {
      params = params.set('filters', JSON.stringify(event.filters));
    }

    // Load data from API
    this.http.get<any>(this.config.apiEndpoint!, { params }).subscribe({
      next: (response) => {
        if (Array.isArray(response)) {
          this.displayData = response;
        } else if (response.data && Array.isArray(response.data)) {
          this.displayData = response.data;
          this.totalRecords = response.total || this.totalRecords;
        }
        this.loading = false;
        this.onDataChange.emit(this.displayData);
        
        // Emit lazy load event to parent
        this.onLazyLoad.emit({
          first: event.first,
          rows: event.rows,
          sortField: event.sortField,
          sortOrder: event.sortOrder,
          filters: event.filters,
          globalFilter: event.globalFilter
        });
      },
      error: (error) => {
        console.error('Error loading lazy data:', error);
        this.loading = false;
      }
    });
  }

  /**
   * Handle row selection
   */
  onRowSelectHandler(event: any): void {
    this.onRowSelect.emit(event.data);
  }

  /**
   * Get formatted cell value
   */
  getCellValue(rowData: any, column: GridColumn): string {
    const value = this.getNestedValue(rowData, column.field);
    
    if (column.format) {
      return column.format(value, rowData);
    }

    if (value === null || value === undefined) {
      return '';
    }

    // Apply default formatting based on data type
    switch (column.dataType) {
      case 'date':
        return value ? new Date(value).toLocaleDateString() : '';
      case 'boolean':
        return value ? 'Yes' : 'No';
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : value;
      default:
        return value.toString();
    }
  }

  /**
   * Get nested object value by path (e.g., 'user.address.city')
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Handle column visibility change
   */
  onColumnToggle(event: any): void {
    this.visibleColumns = event.value;
  }

  /**
   * Debug: Handle multiselect click
   */
  onMultiSelectClick(): void {
    console.log('MultiSelect clicked - dropdown should open');
  }

  /**
   * Export to CSV
   */
  exportToCSV(dt: any): void {
    dt.exportCSV();
  }

  /**
   * Clear all filters
   */
  clearFilters(dt: any): void {
    dt.clear();
    this.globalFilterValue = '';
  }

  /**
   * Apply global filter
   */
  applyGlobalFilter(dt: any, value: string): void {
    dt.filterGlobal(value, 'contains');
  }

  /**
   * Refresh data (reload from API or reset static data)
   */
  refresh(): void {
    if (this.config.apiEndpoint && !this.options.lazy) {
      this.loadAllDataFromApi();
    } else if (this.config.data) {
      this.displayData = [...this.config.data];
      this.totalRecords = this.config.data.length;
    }
  }

  /**
   * Get selected rows
   */
  getSelectedRows(): any[] | any {
    return this.selectedRows;
  }

  /**
   * Clear selection
   */
  clearSelection(): void {
    this.selectedRows = this.options.selectionMode === 'multiple' ? [] : null;
  }
}
