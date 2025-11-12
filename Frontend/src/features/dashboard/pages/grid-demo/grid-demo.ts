import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DynamicGridComponent } from '../../../../app/shared/components/dynamic-grid/dynamic-grid';
import type { GridConfig, GridColumn } from '../../../../app/shared/components/dynamic-grid/dynamic-grid.model';

/**
 * Grid Demo Component
 * Demonstrates the dynamic grid component with real-world examples
 */
@Component({
  selector: 'app-grid-demo',
  standalone: true,
  imports: [CommonModule, DynamicGridComponent],
  templateUrl: './grid-demo.html',
  styleUrls: ['./grid-demo.scss']
})
export class GridDemoComponent implements OnInit {
  employeeGridConfig!: GridConfig;
  transactionGridConfig!: GridConfig;

  ngOnInit(): void {
    this.setupEmployeeGrid();
    this.setupTransactionGrid();
  }

  /**
   * Setup Employee Grid with sample data
   */
  private setupEmployeeGrid(): void {
    const columns: GridColumn[] = [
      { 
        field: 'id', 
        header: 'Employee ID', 
        width: '120px',
        align: 'center',
        sortable: true
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
        header: 'Email Address', 
        width: '250px',
        filterable: true
      },
      { 
        field: 'department', 
        header: 'Department', 
        width: '150px',
        filterable: true
      },
      { 
        field: 'position', 
        header: 'Position', 
        width: '180px'
      },
      { 
        field: 'salary', 
        header: 'Annual Salary', 
        width: '150px',
        dataType: 'number',
        align: 'right',
        format: (value: number) => `$${value.toLocaleString('en-US')}`,
        sortable: true
      },
      { 
        field: 'joinDate', 
        header: 'Join Date', 
        width: '150px',
        dataType: 'date',
        sortable: true
      },
      { 
        field: 'active', 
        header: 'Status', 
        width: '100px',
        dataType: 'boolean',
        align: 'center',
        format: (value: boolean) => value ? '✓ Active' : '✗ Inactive'
      },
      { 
        field: 'ssn', 
        header: 'SSN', 
        visible: false, // Hidden by default (sensitive data)
        width: '150px'
      },
      { 
        field: 'internalNotes', 
        header: 'Internal Notes', 
        visible: false, // Hidden by default
        width: '250px'
      }
    ];

    const employeeData = this.generateEmployeeData(150);

    this.employeeGridConfig = {
      columns: columns,
      data: employeeData,
      options: {
        paginator: true,
        rows: 25,
        rowsPerPageOptions: [10, 25, 50, 100],
        virtualScroll: false,
        selectable: true,
        selectionMode: 'single',
        globalFilter: true,
        exportCSV: true,
        resizableColumns: true,
        reorderableColumns: true,
        showGridlines: true,
        stripedRows: true,
        responsive: true
      }
    };
  }

  /**
   * Setup Transaction Grid with sample data
   */
  private setupTransactionGrid(): void {
    const columns: GridColumn[] = [
      { 
        field: 'transactionId', 
        header: 'Transaction ID', 
        width: '150px',
        align: 'center'
      },
      { 
        field: 'date', 
        header: 'Date', 
        width: '150px',
        dataType: 'date',
        sortable: true
      },
      { 
        field: 'customer', 
        header: 'Customer', 
        width: '200px',
        filterable: true
      },
      { 
        field: 'product', 
        header: 'Product', 
        width: '220px',
        filterable: true
      },
      { 
        field: 'quantity', 
        header: 'Quantity', 
        width: '100px',
        dataType: 'number',
        align: 'center'
      },
      { 
        field: 'unitPrice', 
        header: 'Unit Price', 
        width: '120px',
        dataType: 'number',
        align: 'right',
        format: (value: number) => `$${value.toFixed(2)}`
      },
      { 
        field: 'total', 
        header: 'Total Amount', 
        width: '140px',
        dataType: 'number',
        align: 'right',
        format: (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        sortable: true
      },
      { 
        field: 'status', 
        header: 'Status', 
        width: '120px',
        format: (value: string) => {
          const statusMap: any = {
            'completed': '✓ Completed',
            'pending': '⏳ Pending',
            'cancelled': '✗ Cancelled',
            'refunded': '↩ Refunded'
          };
          return statusMap[value] || value;
        }
      },
      { 
        field: 'paymentMethod', 
        header: 'Payment Method', 
        width: '150px'
      }
    ];

    const transactionData = this.generateTransactionData(200);

    this.transactionGridConfig = {
      columns: columns,
      data: transactionData,
      options: {
        paginator: true,
        rows: 50,
        rowsPerPageOptions: [25, 50, 100, 200],
        virtualScroll: true,
        virtualScrollItemSize: 50,
        selectable: true,
        selectionMode: 'multiple',
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
   * Generate sample employee data
   */
  private generateEmployeeData(count: number): any[] {
    const departments = ['IT', 'HR', 'Finance', 'Marketing', 'Sales', 'Operations', 'Engineering', 'Customer Service'];
    const positions = [
      'Senior Developer', 'Junior Developer', 'Team Lead', 'Manager', 'Director',
      'Analyst', 'Specialist', 'Coordinator', 'Executive', 'Consultant'
    ];
    const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa', 'William', 'Jessica', 
                        'James', 'Mary', 'Thomas', 'Patricia', 'Daniel', 'Jennifer', 'Matthew', 'Linda'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 
                       'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas'];
    
    return Array.from({ length: count }, (_, i) => {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const department = departments[Math.floor(Math.random() * departments.length)];
      
      return {
        id: `EMP-${String(i + 1001).padStart(5, '0')}`,
        name: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@gridportal.com`,
        department: department,
        position: positions[Math.floor(Math.random() * positions.length)],
        salary: Math.floor(Math.random() * 100000) + 40000,
        joinDate: new Date(2015 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        active: Math.random() > 0.15,
        ssn: `***-**-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`,
        internalNotes: `Internal notes for ${firstName} ${lastName}`
      };
    });
  }

  /**
   * Generate sample transaction data
   */
  private generateTransactionData(count: number): any[] {
    const customers = ['Acme Corp', 'Tech Solutions Inc', 'Global Industries', 'Innovation Labs', 'Digital Dynamics', 
                       'Future Systems', 'Smart Enterprises', 'Prime Services', 'Elite Technologies', 'Nexus Group'];
    const products = ['Software License', 'Cloud Storage', 'Consulting Services', 'Support Package', 
                      'Training Session', 'Hardware Equipment', 'Integration Service', 'Maintenance Contract'];
    const statuses = ['completed', 'pending', 'cancelled', 'refunded'];
    const paymentMethods = ['Credit Card', 'Bank Transfer', 'PayPal', 'Invoice', 'Cash'];
    
    return Array.from({ length: count }, (_, i) => {
      const quantity = Math.floor(Math.random() * 10) + 1;
      const unitPrice = Math.floor(Math.random() * 5000) + 100;
      const total = quantity * unitPrice;
      
      return {
        transactionId: `TXN-${String(i + 10001).padStart(6, '0')}`,
        date: new Date(2024 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        customer: customers[Math.floor(Math.random() * customers.length)],
        product: products[Math.floor(Math.random() * products.length)],
        quantity: quantity,
        unitPrice: unitPrice,
        total: total,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)]
      };
    });
  }

  /**
   * Handle employee selection
   */
  handleEmployeeSelect(employee: any): void {
    console.log('Selected Employee:', employee);
    // You can add logic here to open a detail dialog, navigate to detail page, etc.
  }

  /**
   * Handle transaction selection
   */
  handleTransactionSelect(transaction: any): void {
    console.log('Selected Transaction:', transaction);
    // You can add logic here to view transaction details
  }
}
