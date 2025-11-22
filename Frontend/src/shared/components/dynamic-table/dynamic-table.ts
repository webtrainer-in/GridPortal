import { Component, Input, Output, EventEmitter, ViewChild, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import { PaginatorModule } from 'primeng/paginator';
import { DynamicTableColumn, DynamicTableConfig } from './models/dynamic-table.model';
import { CsvExportService } from './services/csv-export.service';

@Component({
  selector: 'app-dynamic-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    TooltipModule,
    ProgressBarModule,
    TagModule,
    PaginatorModule
  ],
  templateUrl: './dynamic-table.html',
  styleUrl: './dynamic-table.scss'
})
export class DynamicTableComponent implements OnInit, OnChanges {
  @ViewChild('dt') table!: Table;

  @Input() data: any[] = [];
  @Input() tableConfig!: DynamicTableConfig;
  @Input() loading: boolean = false;
  @Input() fileName: string = 'table-export';

  @Output() rowSelected = new EventEmitter<any>();
  @Output() rowDoubleClicked = new EventEmitter<any>();
  @Output() pageChange = new EventEmitter<any>();
  @Output() newEntry = new EventEmitter<void>();
  @Output() freeze = new EventEmitter<void>();

  visibleColumns: DynamicTableColumn[] = [];
  searchValue: string = '';
  selectedRows: any[] = [];

  // Default configuration
  private defaultConfig: DynamicTableConfig = {
    columns: [],
    dataKey: 'id',
    rowsPerPage: 10,
    paginator: true,
    globalFilterFields: [],
    showGridlines: true,
    striped: true,
    scrollable: false,
    resizableColumns: true,
    reorderableColumns: true
  };

  constructor(private csvExportService: CsvExportService) {}

  ngOnInit(): void {
    this.initializeTableConfig();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Re-initialize when tableConfig changes
    if (changes['tableConfig']) {
      this.initializeTableConfig();
    }
  }

  private initializeTableConfig(): void {
    // Merge provided config with defaults
    this.tableConfig = { ...this.defaultConfig, ...this.tableConfig };

    // Set visible columns (all columns visible by default)
    this.visibleColumns = this.tableConfig.columns.filter(
      (col: DynamicTableColumn) => col.visible !== false
    );

    // If no global filter fields provided, use all string/searchable fields
    if (!this.tableConfig.globalFilterFields || this.tableConfig.globalFilterFields.length === 0) {
      this.tableConfig.globalFilterFields = this.visibleColumns
        .filter((col: DynamicTableColumn) => col.dataType !== 'boolean' && col.dataType !== 'currency')
        .map((col: DynamicTableColumn) => col.field);
    }
  }

  /**
   * Search/filter handler
   */
  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchValue = value;
    if (this.table) {
      this.table.filterGlobal(value, 'contains');
    }
  }

  /**
   * Clear search
   */
  clearSearch(): void {
    this.searchValue = '';
    if (this.table) {
      this.table.clear();
    }
  }

  /**
   * Export to CSV
   */
  exportCSV(): void {
    this.csvExportService.exportToCSV(
      this.data,
      this.visibleColumns,
      this.fileName
    );
  }

  /**
   * Handle row selection
   */
  onRowSelect(event: any): void {
    this.rowSelected.emit(event.data);
  }

  /**
   * Handle row double click
   */
  onRowDblClick(row: any): void {
    this.rowDoubleClicked.emit(row);
  }

  /**
   * Handle pagination
   */
  onPageChange(event: any): void {
    this.pageChange.emit(event);
  }

  /**
   * Get value for template rendering based on data type
   */
  getFormattedValue(row: any, column: DynamicTableColumn): any {
    const value = row[column.field];

    if (value === null || value === undefined) {
      return '';
    }

    switch (column.dataType) {
      case 'date':
        return value instanceof Date
          ? value.toLocaleDateString()
          : new Date(value).toLocaleDateString();
      case 'currency':
        return typeof value === 'number'
          ? value.toLocaleString('en-US', {
              style: 'currency',
              currency: 'USD'
            })
          : value;
      case 'boolean':
        return value ? 'Yes' : 'No';
      default:
        return value;
    }
  }

  /**
   * Check if column is visible
   */
  isColumnVisible(column: DynamicTableColumn): boolean {
    return column.visible !== false;
  }

  /**
   * Get column header
   */
  getColumnHeader(column: DynamicTableColumn): string {
    return column.header || column.field;
  }

  /**
   * Get column width
   */
  getColumnWidth(column: DynamicTableColumn): string {
    return column.width || 'auto';
  }

  /**
   * Handle new entry button click
   */
  onNewEntry(): void {
    this.newEntry.emit();
  }

  /**
   * Handle freeze button click
   */
  onFreeze(): void {
    this.freeze.emit();
  }
}
