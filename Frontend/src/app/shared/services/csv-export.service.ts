import { Injectable } from '@angular/core';
import { DynamicTableColumn } from '../models/dynamic-table.model';

@Injectable({
  providedIn: 'root'
})
export class CsvExportService {
  /**
   * Export table data to CSV format
   * @param data - Array of data objects
   * @param columns - Column configuration
   * @param fileName - Name of the exported file (without extension)
   */
  exportToCSV(data: any[], columns: DynamicTableColumn[], fileName: string = 'export'): void {
    if (!data || data.length === 0) {
      console.warn('No data to export');
      return;
    }

    // Get visible columns
    const visibleColumns = columns.filter(col => col.visible !== false);

    // Create CSV header
    const headers = visibleColumns.map(col => this.escapeCSV(col.header)).join(',');

    // Create CSV rows
    const rows = data.map(row =>
      visibleColumns.map(col => this.formatCellValue(row[col.field], col)).join(',')
    );

    // Combine header and rows
    const csv = [headers, ...rows].join('\n');

    // Create blob and download
    this.downloadCSV(csv, `${fileName}.csv`);
  }

  /**
   * Export table data to Excel format (XLSX)
   * Note: Requires external library like xlsx. This is a basic CSV approach.
   * For true Excel support, install: npm install xlsx
   */
  exportToExcel(data: any[], columns: DynamicTableColumn[], fileName: string = 'export'): void {
    // For now, export as CSV with .xlsx extension
    // For true Excel support, you would need to use a library like 'xlsx'
    this.exportToCSV(data, columns, fileName);
  }

  /**
   * Escape CSV special characters
   */
  private escapeCSV(value: string | undefined | null): string {
    if (!value) return '';
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  }

  /**
   * Format cell value based on column data type
   */
  private formatCellValue(value: any, column: DynamicTableColumn): string {
    if (value === null || value === undefined) return '';

    switch (column.dataType) {
      case 'date':
        return value instanceof Date ? value.toLocaleDateString() : String(value);
      case 'currency':
        return typeof value === 'number' ? value.toFixed(2) : String(value);
      case 'boolean':
        return value ? 'Yes' : 'No';
      case 'number':
        return String(value);
      default:
        return this.escapeCSV(String(value));
    }
  }

  /**
   * Download CSV file
   */
  private downloadCSV(csv: string, fileName: string): void {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    URL.revokeObjectURL(url);
  }
}
