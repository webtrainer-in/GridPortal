import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { DynamicGridComponent } from './dynamic-grid';
import { GridConfig, GridColumn, GridLazyLoadEvent } from './dynamic-grid.model';

/**
 * Example component demonstrating the Dynamic Grid usage
 * 
 * This shows three different scenarios:
 * 1. Static JSON data
 * 2. Data from API endpoint (loaded at once)
 * 3. Lazy loading from API endpoint (for millions of records)
 */
@Component({
  selector: 'app-grid-example',
  standalone: true,
  imports: [CommonModule, DynamicGridComponent],
  template: `
    <div class="grid-examples">
      <h1>Dynamic Grid Examples</h1>

      <!-- Example 1: Static JSON Data -->
      <section class="example-section">
        <h2>Example 1: Static JSON Data</h2>
        <app-dynamic-grid 
          [config]="staticDataConfig"
          (onRowSelect)="handleRowSelect($event)">
        </app-dynamic-grid>
      </section>

      <!-- Example 2: API Endpoint (Load All) -->
      <section class="example-section">
        <h2>Example 2: API Endpoint (Load All Data)</h2>
        <app-dynamic-grid 
          [config]="apiDataConfig"
          (onDataChange)="handleDataChange($event)">
        </app-dynamic-grid>
      </section>

      <!-- Example 3: Lazy Loading (For Large Datasets) -->
      <section class="example-section">
        <h2>Example 3: Lazy Loading (Millions of Records)</h2>
        <app-dynamic-grid 
          [config]="lazyLoadConfig"
          (onLazyLoad)="handleLazyLoad($event)">
        </app-dynamic-grid>
      </section>
    </div>
  `,
  styles: [`
    .grid-examples {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    h1 {
      color: #333;
      margin-bottom: 2rem;
    }

    .example-section {
      margin-bottom: 3rem;
      padding: 1.5rem;
      background: #f8f9fa;
      border-radius: 8px;

      h2 {
        color: #007bff;
        margin-bottom: 1.5rem;
        font-size: 1.5rem;
      }
    }
  `]
})
export class GridExampleComponent implements OnInit {
  staticDataConfig!: GridConfig;
  apiDataConfig!: GridConfig;
  lazyLoadConfig!: GridConfig;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.setupStaticDataExample();
    this.setupApiDataExample();
    this.setupLazyLoadExample();
  }

  /**
   * Example 1: Static JSON Data
   */
  private setupStaticDataExample(): void {
    // Sample data
    const sampleData = this.generateSampleData(100);

    // Define columns
    const columns: GridColumn[] = [
      { 
        field: 'id', 
        header: 'ID', 
        width: '80px',
        dataType: 'number',
        align: 'center'
      },
      { 
        field: 'name', 
        header: 'Full Name', 
        width: '200px',
        sortable: true,
        filterable: true
      },
      { 
        field: 'email', 
        header: 'Email', 
        width: '250px'
      },
      { 
        field: 'department', 
        header: 'Department', 
        width: '150px'
      },
      { 
        field: 'salary', 
        header: 'Salary', 
        width: '150px',
        dataType: 'number',
        align: 'right',
        format: (value: number) => `$${value.toLocaleString()}`
      },
      { 
        field: 'joinDate', 
        header: 'Join Date', 
        width: '150px',
        dataType: 'date'
      },
      { 
        field: 'active', 
        header: 'Status', 
        width: '100px',
        dataType: 'boolean',
        align: 'center'
      },
      { 
        field: 'internalCode', 
        header: 'Internal Code', 
        visible: false, // Hidden by default
        width: '150px'
      }
    ];

    this.staticDataConfig = {
      columns: columns,
      data: sampleData,
      options: {
        paginator: true,
        rows: 25,
        rowsPerPageOptions: [10, 25, 50],
        virtualScroll: false, // Not needed for small datasets
        selectable: true,
        selectionMode: 'single',
        globalFilter: true,
        exportCSV: true,
        resizableColumns: true,
        reorderableColumns: true,
        showGridlines: true,
        stripedRows: true
      }
    };
  }

  /**
   * Example 2: API Endpoint (Load all at once)
   */
  private setupApiDataExample(): void {
    const columns: GridColumn[] = [
      { field: 'userId', header: 'User ID', width: '100px', align: 'center' },
      { field: 'id', header: 'Post ID', width: '100px', align: 'center' },
      { field: 'title', header: 'Title', width: '300px' },
      { field: 'body', header: 'Content', width: '400px' }
    ];

    this.apiDataConfig = {
      columns: columns,
      // Using JSONPlaceholder API as example
      apiEndpoint: 'https://jsonplaceholder.typicode.com/posts',
      options: {
        paginator: true,
        rows: 20,
        virtualScroll: false,
        lazy: false, // Load all data at once
        globalFilter: true,
        exportCSV: true
      }
    };
  }

  /**
   * Example 3: Lazy Loading (For millions of records)
   * 
   * Note: You'll need to implement server-side pagination/filtering
   * Your API should accept: first, rows, sortField, sortOrder, filters, globalFilter
   * And return: { data: [], total: number }
   */
  private setupLazyLoadExample(): void {
    const columns: GridColumn[] = [
      { field: 'id', header: 'ID', width: '80px', align: 'center' },
      { field: 'name', header: 'Name', width: '200px' },
      { field: 'username', header: 'Username', width: '150px' },
      { field: 'email', header: 'Email', width: '250px' },
      { field: 'phone', header: 'Phone', width: '150px' },
      { field: 'website', header: 'Website', width: '200px' },
      { field: 'company.name', header: 'Company', width: '200px' },
      { field: 'address.city', header: 'City', width: '150px' }
    ];

    this.lazyLoadConfig = {
      columns: columns,
      // Replace with your actual API endpoint
      apiEndpoint: 'https://jsonplaceholder.typicode.com/users',
      totalRecords: 10, // Set the total number of records (should come from API)
      options: {
        paginator: true,
        rows: 10,
        rowsPerPageOptions: [10, 25, 50, 100],
        virtualScroll: true,
        virtualScrollItemSize: 50,
        lazy: false, // Set to true when you have server-side pagination
        selectable: true,
        selectionMode: 'multiple',
        globalFilter: false, // Disable for lazy mode or implement server-side
        exportCSV: false // Usually disabled for lazy loading
      }
    };
  }

  /**
   * Generate sample data for demonstration
   */
  private generateSampleData(count: number): any[] {
    const departments = ['IT', 'HR', 'Finance', 'Marketing', 'Sales', 'Operations'];
    const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
    
    return Array.from({ length: count }, (_, i) => {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      
      return {
        id: i + 1,
        name: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@company.com`,
        department: departments[Math.floor(Math.random() * departments.length)],
        salary: Math.floor(Math.random() * 100000) + 40000,
        joinDate: new Date(2020 + Math.floor(Math.random() * 5), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        active: Math.random() > 0.2,
        internalCode: `EMP-${String(i + 1).padStart(6, '0')}`
      };
    });
  }

  /**
   * Handle row selection
   */
  handleRowSelect(rowData: any): void {
    console.log('Row selected:', rowData);
  }

  /**
   * Handle data changes
   */
  handleDataChange(data: any[]): void {
    console.log('Data loaded:', data.length, 'records');
  }

  /**
   * Handle lazy load events
   */
  handleLazyLoad(event: GridLazyLoadEvent): void {
    console.log('Lazy load event:', event);
    // Here you would typically make an API call with these parameters
    // this.http.get(`/api/data?first=${event.first}&rows=${event.rows}`).subscribe(...)
  }
}
