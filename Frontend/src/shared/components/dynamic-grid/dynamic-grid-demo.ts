import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DynamicGrid, GridRow } from './dynamic-grid';
import { ColDef } from 'ag-grid-community';

@Component({
  selector: 'app-dynamic-grid-demo',
  standalone: true,
  imports: [CommonModule, DynamicGrid],
  template: `
    <div class="demo-container">
      <h2>AG Grid Demo - Sample Data</h2>
      <app-dynamic-grid
        [columnDefs]="columnDefs"
        [rowData]="rowData"
        [paginationPageSize]="15"
      ></app-dynamic-grid>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    .demo-container {
      padding: 20px;
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 10px;
      box-sizing: border-box;

      h2 {
        margin: 0;
        flex-shrink: 0;
      }

      app-dynamic-grid {
        height: 600px;
        display: block;
      }
    }
  `]
})
export class DynamicGridDemoComponent implements OnInit {
  columnDefs: ColDef[] = [];
  rowData: GridRow[] = [];

  constructor() {
    // Initialize data in constructor instead of ngOnInit to ensure it's available
    // before the child component initializes
    this.initializeGrid();
  }

  ngOnInit(): void {
    this.initializeGrid();
  }

  private initializeGrid(): void {
    // Define columns
    this.columnDefs = [
      {
        field: 'id',
        headerName: 'ID',
        width: 70,
        sortable: true,
        filter: true
      },
      {
        field: 'name',
        headerName: 'Name',
        flex: 1,
        minWidth: 150,
        sortable: true,
        filter: true
      },
      {
        field: 'email',
        headerName: 'Email',
        flex: 1,
        minWidth: 200,
        sortable: true,
        filter: true
      },
      {
        field: 'department',
        headerName: 'Department',
        flex: 1,
        minWidth: 150,
        sortable: true,
        filter: true
      },
      {
        field: 'salary',
        headerName: 'Salary',
        flex: 1,
        minWidth: 120,
        sortable: true,
        filter: true,
        type: 'numericColumn'
      },
      {
        field: 'joinDate',
        headerName: 'Join Date',
        flex: 1,
        minWidth: 130,
        sortable: true,
        filter: true
      },
      {
        field: 'status',
        headerName: 'Status',
        flex: 1,
        minWidth: 100,
        sortable: true,
        filter: true
      },
      {
        field: 'phone',
        headerName: 'Phone',
        flex: 1,
        minWidth: 140,
        sortable: true,
        filter: true
      },
      {
        field: 'location',
        headerName: 'Location',
        flex: 1,
        minWidth: 130,
        sortable: true,
        filter: true
      },
      {
        field: 'performanceRating',
        headerName: 'Performance',
        flex: 1,
        minWidth: 120,
        sortable: true,
        filter: true,
        type: 'numericColumn'
      },
      {
        field: 'yearsExperience',
        headerName: 'Experience (Yrs)',
        flex: 1,
        minWidth: 140,
        sortable: true,
        filter: true,
        type: 'numericColumn'
      },
      {
        field: 'reportingManager',
        headerName: 'Manager',
        flex: 1,
        minWidth: 150,
        sortable: true,
        filter: true
      }
    ];

    // Sample dummy data - generate 115 records
    const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'Robert', 'Emily', 'David', 'Lisa', 'James', 'Jennifer', 
                        'Christopher', 'Amanda', 'Kevin', 'Michelle', 'Daniel', 'Laura', 'Brian', 'Nicole', 'Ryan', 'Ashley',
                        'Matthew', 'Jessica', 'Andrew', 'Elizabeth', 'Joshua', 'Melissa', 'Steven', 'Stephanie', 'Thomas', 'Rebecca',
                        'Joseph', 'Rachel', 'Charles', 'Kimberly', 'William', 'Karen', 'Richard', 'Nancy', 'Paul', 'Betty'];
    
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson',
                       'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Garcia', 'Martinez', 'Robinson', 'Clark',
                       'Rodriguez', 'Lewis', 'Lee', 'Walker', 'Hall', 'Allen', 'Young', 'King', 'Wright', 'Lopez'];
    
    const departments = ['Engineering', 'Product', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Design', 'Support', 'Legal'];
    const statuses = ['Active', 'Active', 'Active', 'Active', 'Inactive']; // 80% active, 20% inactive
    const locations = ['New York', 'San Francisco', 'Austin', 'Seattle', 'Boston', 'Denver', 'Chicago', 'Los Angeles', 'Miami', 'Portland'];
    const managers = ['Alice Johnson', 'Bob Smith', 'Carol White', 'David Brown', 'Eve Davis', 'Frank Miller', 'Grace Lee', 'Henry Wilson'];

    this.rowData = [];
    for (let i = 1; i <= 115; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const name = `${firstName} ${lastName}`;
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;
      const department = departments[Math.floor(Math.random() * departments.length)];
      const salary = Math.floor(Math.random() * 60000) + 60000; // 60k to 120k
      const year = Math.floor(Math.random() * 3) + 2022; // 2022-2024
      const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
      const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
      const joinDate = `${year}-${month}-${day}`;
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const phone = `+1-${Math.floor(Math.random() * 900) + 200}-${Math.floor(Math.random() * 900) + 100}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
      const location = locations[Math.floor(Math.random() * locations.length)];
      const performanceRating = (Math.random() * 3 + 2).toFixed(1); // 2.0 to 5.0
      const yearsExperience = Math.floor(Math.random() * 20) + 1; // 1 to 20 years
      const reportingManager = managers[Math.floor(Math.random() * managers.length)];

      this.rowData.push({
        id: i,
        name,
        email,
        department,
        salary,
        joinDate,
        status,
        phone,
        location,
        performanceRating,
        yearsExperience,
        reportingManager
      });
    }
  }
}
