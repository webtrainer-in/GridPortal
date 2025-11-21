import { DynamicTableColumn, DynamicTableConfig } from '../models/dynamic-table.model';

/**
 * Utility service for dynamically generating table configurations from data
 */
export class DynamicTableConfigGenerator {
  /**
   * Generate table columns dynamically from a data object
   * Infers data types and creates appropriate column configurations
   */
  static generateColumnsFromData(data: any[]): DynamicTableColumn[] {
    if (!data || data.length === 0) {
      return [];
    }

    const firstRow = data[0];
    const columns: DynamicTableColumn[] = [];
    const fieldOrder: string[] = Object.keys(firstRow);

    fieldOrder.forEach((field, index) => {
      const value = firstRow[field];
      const dataType = this.inferDataType(value);
      const header = this.formatHeader(field);

      const column: DynamicTableColumn = {
        field,
        header,
        dataType,
        sortable: true,
        filterable: dataType !== 'boolean',
        width: this.getDefaultWidth(dataType),
        align: this.getAlignment(dataType)
      };

      columns.push(column);
    });

    return columns;
  }

  /**
   * Infer data type from a sample value
   */
  private static inferDataType(value: any): 'string' | 'number' | 'date' | 'boolean' | 'currency' {
    if (typeof value === 'boolean') {
      return 'boolean';
    }

    if (typeof value === 'number') {
      // Check if it looks like a currency (based on field name heuristics)
      // This is a simple heuristic - adjust as needed
      return 'number';
    }

    if (value instanceof Date || this.isDateString(value)) {
      return 'date';
    }

    return 'string';
  }

  /**
   * Check if a string looks like a date (ISO format or common date patterns)
   */
  private static isDateString(value: string): boolean {
    if (typeof value !== 'string') return false;
    // Match ISO date format (YYYY-MM-DD) or similar
    const datePattern = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/;
    return datePattern.test(value);
  }

  /**
   * Format field name to header (e.g., 'firstName' -> 'First Name')
   */
  private static formatHeader(field: string): string {
    // Convert camelCase to Title Case
    const formatted = field
      .replace(/([A-Z])/g, ' $1') // Add space before capitals
      .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
      .trim();

    return formatted;
  }

  /**
   * Get default column width based on data type
   */
  private static getDefaultWidth(dataType: string): string {
    const widths: Record<string, string> = {
      'boolean': '100px',
      'number': '120px',
      'date': '130px',
      'currency': '140px',
      'string': '200px'
    };

    return widths[dataType] || '200px';
  }

  /**
   * Get text alignment based on data type
   */
  private static getAlignment(dataType: string): 'left' | 'center' | 'right' {
    switch (dataType) {
      case 'number':
      case 'currency':
        return 'right';
      case 'boolean':
      case 'date':
        return 'center';
      default:
        return 'left';
    }
  }

  /**
   * Generate a complete table config from data
   */
  static generateTableConfig(data: any[], customConfig?: Partial<DynamicTableConfig>): DynamicTableConfig {
    const columns = this.generateColumnsFromData(data);

    return {
      columns,
      dataKey: 'id',
      rowsPerPage: 10,
      paginator: true,
      globalFilterFields: this.getSearchableFields(columns),
      showGridlines: true,
      striped: true,
      scrollable: false,
      resizableColumns: true,
      reorderableColumns: true,
      ...customConfig
    };
  }

  /**
   * Get all searchable field names (exclude boolean and currency for search)
   */
  private static getSearchableFields(columns: DynamicTableColumn[]): string[] {
    return columns
      .filter(col => col.dataType !== 'boolean' && col.dataType !== 'currency')
      .map(col => col.field);
  }
}
