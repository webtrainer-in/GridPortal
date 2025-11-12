/**
 * Integration Example: Using Dynamic Grid in Your Existing Components
 * 
 * This file shows how to integrate the dynamic grid into your existing
 * Dashboard, Users, Settings, or any other component.
 */

// ============================================================================
// Example 1: Dashboard Page - Show Recent Activity
// ============================================================================

/*
// File: src/features/dashboard/pages/dashboard/dashboard.ts

import { Component, OnInit } from '@angular/core';
import { DynamicGridComponent } from '../../../../shared/components/dynamic-grid/dynamic-grid';
import type { GridConfig, GridColumn } from '../../../../shared/components/dynamic-grid/dynamic-grid.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DynamicGridComponent],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent implements OnInit {
  activityGridConfig!: GridConfig;

  ngOnInit() {
    // Configure grid for dashboard activity
    const columns: GridColumn[] = [
      { field: 'timestamp', header: 'Time', width: '150px', dataType: 'date' },
      { field: 'user', header: 'User', width: '150px' },
      { field: 'action', header: 'Action', width: '200px' },
      { field: 'status', header: 'Status', width: '100px' }
    ];

    this.activityGridConfig = {
      columns: columns,
      apiEndpoint: '/api/dashboard/activity',
      options: {
        paginator: true,
        rows: 10,
        showGridlines: true,
        exportCSV: false,
        globalFilter: true
      }
    };
  }
}

// In dashboard.html, add:
// <app-dynamic-grid [config]="activityGridConfig"></app-dynamic-grid>
*/

// ============================================================================
// Example 2: Users Page - Full User Management
// ============================================================================

/*
// File: src/features/users/pages/users/users.ts

import { Component, OnInit } from '@angular/core';
import { DynamicGridComponent } from '../../../../shared/components/dynamic-grid/dynamic-grid';
import type { GridConfig, GridColumn } from '../../../../shared/components/dynamic-grid/dynamic-grid.model';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [DynamicGridComponent],
  templateUrl: './users.html',
  styleUrls: ['./users.scss']
})
export class UsersComponent implements OnInit {
  usersGridConfig!: GridConfig;

  ngOnInit() {
    const columns: GridColumn[] = [
      { field: 'id', header: 'ID', width: '80px', align: 'center' },
      { field: 'username', header: 'Username', width: '150px' },
      { field: 'email', header: 'Email', width: '250px' },
      { field: 'firstName', header: 'First Name', width: '150px' },
      { field: 'lastName', header: 'Last Name', width: '150px' },
      { field: 'role', header: 'Role', width: '120px' },
      { field: 'department', header: 'Department', width: '150px' },
      { 
        field: 'active', 
        header: 'Status', 
        width: '100px',
        dataType: 'boolean',
        format: (value: boolean) => value ? '✓ Active' : '✗ Inactive'
      },
      { field: 'lastLogin', header: 'Last Login', width: '150px', dataType: 'date' },
      { field: 'createdAt', header: 'Created', width: '150px', dataType: 'date' },
      { field: 'ssn', header: 'SSN', visible: false }, // Hidden sensitive field
      { field: 'internalNotes', header: 'Notes', visible: false } // Hidden
    ];

    this.usersGridConfig = {
      columns: columns,
      apiEndpoint: '/api/users',
      options: {
        paginator: true,
        rows: 50,
        rowsPerPageOptions: [25, 50, 100, 500],
        selectable: true,
        selectionMode: 'single',
        globalFilter: true,
        exportCSV: true,
        resizableColumns: true,
        reorderableColumns: true
      }
    };
  }

  handleUserSelect(user: any) {
    console.log('Selected user:', user);
    // Navigate to user detail or open edit dialog
  }
}

// In users.html, add:
// <app-dynamic-grid 
//   [config]="usersGridConfig"
//   (onRowSelect)="handleUserSelect($event)">
// </app-dynamic-grid>
*/

// ============================================================================
// Example 3: Backup History - Large Dataset with Lazy Loading
// ============================================================================

/*
// File: src/features/settings/pages/backup-history/backup-history.ts

import { Component, OnInit } from '@angular/core';
import { DynamicGridComponent } from '../../../../shared/components/dynamic-grid/dynamic-grid';
import type { GridConfig, GridColumn, GridLazyLoadEvent } from '../../../../shared/components/dynamic-grid/dynamic-grid.model';

@Component({
  selector: 'app-backup-history',
  standalone: true,
  imports: [DynamicGridComponent],
  templateUrl: './backup-history.html',
  styleUrls: ['./backup-history.scss']
})
export class BackupHistoryComponent implements OnInit {
  backupGridConfig!: GridConfig;

  ngOnInit() {
    const columns: GridColumn[] = [
      { field: 'id', header: 'Backup ID', width: '100px' },
      { field: 'timestamp', header: 'Date/Time', width: '180px', dataType: 'date' },
      { field: 'type', header: 'Type', width: '120px' },
      { 
        field: 'size', 
        header: 'Size', 
        width: '120px',
        format: (value: number) => `${(value / 1024 / 1024).toFixed(2)} MB`
      },
      { field: 'status', header: 'Status', width: '100px' },
      { field: 'location', header: 'Location', width: '250px' },
      { field: 'initiatedBy', header: 'User', width: '150px' },
      { field: 'duration', header: 'Duration', width: '100px' }
    ];

    this.backupGridConfig = {
      columns: columns,
      apiEndpoint: '/api/backups/history',
      totalRecords: 1000000, // Assume millions of backup records
      options: {
        paginator: true,
        rows: 100,
        rowsPerPageOptions: [50, 100, 200, 500],
        lazy: true, // Enable lazy loading for large dataset
        virtualScroll: true,
        virtualScrollItemSize: 50,
        selectable: false,
        globalFilter: false, // Use server-side search
        exportCSV: false // Export from server instead
      }
    };
  }

  handleLazyLoad(event: GridLazyLoadEvent) {
    console.log('Loading page:', event.first, 'rows:', event.rows);
    // The component automatically fetches data from the API
  }
}

// In backup-history.html, add:
// <app-dynamic-grid 
//   [config]="backupGridConfig"
//   (onLazyLoad)="handleLazyLoad($event)">
// </app-dynamic-grid>
*/

// ============================================================================
// Example 4: Settings Page - Configuration Table
// ============================================================================

/*
// File: src/features/settings/pages/settings/settings.ts

import { Component, OnInit } from '@angular/core';
import { DynamicGridComponent } from '../../../../shared/components/dynamic-grid/dynamic-grid';
import type { GridConfig, GridColumn } from '../../../../shared/components/dynamic-grid/dynamic-grid.model';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [DynamicGridComponent],
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss']
})
export class SettingsComponent implements OnInit {
  settingsGridConfig!: GridConfig;

  ngOnInit() {
    const columns: GridColumn[] = [
      { field: 'key', header: 'Setting', width: '250px' },
      { field: 'value', header: 'Value', width: '300px' },
      { field: 'category', header: 'Category', width: '150px' },
      { field: 'description', header: 'Description', width: '300px' },
      { field: 'lastModified', header: 'Last Modified', width: '150px', dataType: 'date' },
      { field: 'modifiedBy', header: 'Modified By', width: '150px' }
    ];

    this.settingsGridConfig = {
      columns: columns,
      apiEndpoint: '/api/settings',
      options: {
        paginator: true,
        rows: 25,
        selectable: true,
        selectionMode: 'single',
        globalFilter: true,
        exportCSV: true
      }
    };
  }

  handleSettingSelect(setting: any) {
    console.log('Selected setting:', setting);
    // Open edit dialog
  }
}
*/

// ============================================================================
// Example 5: Generic Service Integration
// ============================================================================

/*
// Create a reusable service for grid data

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GridDataService {
  constructor(private http: HttpClient) {}

  // For lazy loading with server-side pagination
  getLazyData(
    endpoint: string,
    first: number,
    rows: number,
    sortField?: string,
    sortOrder?: number,
    filters?: any
  ): Observable<any> {
    let params = new HttpParams()
      .set('first', first.toString())
      .set('rows', rows.toString());

    if (sortField) {
      params = params.set('sortField', sortField);
      params = params.set('sortOrder', sortOrder?.toString() || '1');
    }

    if (filters) {
      params = params.set('filters', JSON.stringify(filters));
    }

    return this.http.get(endpoint, { params });
  }

  // For loading all data at once
  getAllData(endpoint: string): Observable<any[]> {
    return this.http.get<any[]>(endpoint);
  }

  // Export data
  exportToCSV(endpoint: string): Observable<Blob> {
    return this.http.get(`${endpoint}/export`, { responseType: 'blob' });
  }
}
*/

// ============================================================================
// Tips for Your Project
// ============================================================================

/*
1. For Dashboard: Use small grids (10-25 rows) with no virtual scroll
2. For User Management: Use medium config (50-100 rows) with selection
3. For History/Logs: Use lazy loading with virtual scroll for millions of records
4. For Settings: Use small datasets with inline editing capability

Remember:
- Always hide sensitive fields using visible: false
- Use lazy loading for datasets > 10,000 records
- Use virtual scrolling for datasets > 1,000 records
- Enable exportCSV for data analysis
- Use selectable for row actions (edit, delete, view)
*/

export {};
