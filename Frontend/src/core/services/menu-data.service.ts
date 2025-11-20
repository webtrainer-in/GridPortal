import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { MenuItem } from '../models/tab.model';

export interface SidebarMenuItem {
  label: string;
  icon: string;
  routerLink?: string;
  id: string;
  children?: SidebarMenuItem[];
  isExpanded?: boolean;
}

// This service simulates how the menu data would come from an API
@Injectable({
  providedIn: 'root'
})
export class MenuDataService {

  // Sidebar menu items
  private customMenuItems: SidebarMenuItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'pi pi-home',
      routerLink: '/dashboard'
    },
    {
      id: 'users',
      label: 'Users',
      icon: 'pi pi-users',
      routerLink: '/users'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: 'pi pi-cog',
      routerLink: '/settings',
      isExpanded: false,
      children: [
        {
          id: 'general-settings',
          label: 'General',
          icon: 'pi pi-sliders-h',
          routerLink: '/settings/general'
        },
        {
          id: 'backup-history',
          label: 'Backup History',
          icon: 'pi pi-history',
          routerLink: '/settings/backup-history'
        }
      ]
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: 'pi pi-chart-bar',
      routerLink: '/analytics'
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: 'pi pi-file-pdf',
      routerLink: '/reports'
    }
  ];

  // Simulate API response structure
  private menuData = {
    dashboard: [
      { label: 'Overview', icon: 'pi pi-chart-line', type: 'item', route: '/users' },
      { 
        label: 'Widgets', 
        icon: 'pi pi-th-large', 
        type: 'folder', 
        children: [
          { label: 'Chart Widgets', icon: 'fa-solid fa-chart-line', iconType: 'fontawesome', route: '/users' },
          { label: 'Data Widgets', icon: 'assets/icons/data-widget.svg', iconType: 'image', route: '/users' },
          { label: 'Custom Widgets', icon: 'pi pi-cog', route: '/dashboard/widgets/custom' }
        ]
      },
      { 
        label: 'Dashboards', 
        icon: 'pi pi-desktop', 
        type: 'folder', 
        children: [
          { label: 'Main Dashboard', icon: 'pi pi-home', route: '/dashboard' },
          { label: 'Sales Dashboard', icon: 'pi pi-shopping-cart', route: '/dashboard/sales' },
          { label: 'Analytics Dashboard', icon: 'pi pi-chart-pie', route: '/analytics' }
        ]
      },
      { label: 'Recent Items', icon: 'pi pi-clock', type: 'item', route: '/dashboard' }
    ],
    users: [
      { label: 'All Users', icon: 'pi pi-users', type: 'item', route: '/users' },
      { 
        label: 'User Groups', 
        icon: 'pi pi-users', 
        type: 'folder', 
        children: [
          { label: 'Administrators', icon: 'pi pi-shield', route: '/users/admins' },
          { label: 'Moderators', icon: 'pi pi-user-edit', route: '/users/moderators' },
          { label: 'Regular Users', icon: 'pi pi-user', route: '/users/regular' }
        ]
      },
      { 
        label: 'Permissions', 
        icon: 'pi pi-key', 
        type: 'folder', 
        children: [
          { label: 'Role Management', icon: 'pi pi-cog', route: '/users/roles' },
          { label: 'Access Control', icon: 'pi pi-lock', route: '/users/access' }
        ]
      },
      { label: 'User Activity', icon: 'pi pi-chart-line', type: 'item', route: '/users/activity' }
    ],
    settings: [
      { label: 'General', icon: 'pi pi-cog', type: 'item', route: '/settings' },
      { 
        label: 'System', 
        icon: 'pi pi-desktop', 
        type: 'folder', 
        children: [
          { label: 'Performance', icon: 'pi pi-gauge', route: '/settings/performance' },
          { label: 'Security', icon: 'pi pi-shield', route: '/settings/security' },
          { label: 'Backup', icon: 'pi pi-cloud', route: '/settings/backup' }
        ]
      },
      { label: 'User Preferences', icon: 'pi pi-user-edit', type: 'item', route: '/settings/preferences' },
      { label: 'Appearance', icon: 'pi pi-palette', type: 'item', route: '/settings/appearance' }
    ],
    analytics: [
      { label: 'Reports', icon: 'pi pi-chart-bar', type: 'item', route: '/reports' },
      { 
        label: 'Data Sources', 
        icon: 'pi pi-database', 
        type: 'folder', 
        children: [
          { label: 'SQL Databases', icon: 'pi pi-server', route: '/analytics/datasources/sql' },
          { label: 'APIs', icon: 'pi pi-globe', route: '/analytics/datasources/api' },
          { label: 'Files', icon: 'pi pi-file', route: '/analytics/datasources/files' }
        ]
      },
      { label: 'Visualizations', icon: 'pi pi-chart-pie', type: 'item', route: '/analytics/visualizations' },
      { label: 'Exports', icon: 'pi pi-download', type: 'item', route: '/analytics/exports' }
    ],
    reports: [
      { label: 'Recent Reports', icon: 'pi pi-clock', type: 'item', route: '/reports' },
      { 
        label: 'Templates', 
        icon: 'pi pi-file-edit', 
        type: 'folder', 
        children: [
          { label: 'Standard Templates', icon: 'pi pi-file', route: '/reports/templates/standard' },
          { label: 'Custom Templates', icon: 'pi pi-file-edit', route: '/reports/templates/custom' }
        ]
      },
      { label: 'Scheduled Reports', icon: 'pi pi-calendar', type: 'item', route: '/reports/scheduled' },
      { label: 'Archives', icon: 'pi pi-folder', type: 'item', route: '/reports/archives' }
    ]
  };

  // User Info tab data
  private userInfoData = {
    users: [
      { label: 'User Profile', icon: 'pi pi-user', type: 'item', route: '/users/profile' },
      { 
        label: 'Personal Details', 
        icon: 'pi pi-id-card', 
        type: 'folder', 
        children: [
          { label: 'Basic Information', icon: 'pi pi-info', route: '/users/profile/basic' },
          { label: 'Contact Details', icon: 'pi pi-phone', route: '/users/profile/contact' },
          { label: 'Address', icon: 'pi pi-map-marker', route: '/users/profile/address' }
        ]
      },
      { 
        label: 'Account Settings', 
        icon: 'pi pi-cog', 
        type: 'folder', 
        children: [
          { label: 'Login Credentials', icon: 'pi pi-key', route: '/users/account/credentials' },
          { label: 'Security Settings', icon: 'pi pi-shield', route: '/users/account/security' },
          { label: 'Preferences', icon: 'pi pi-sliders-h', route: '/users/account/preferences' }
        ]
      },
      { label: 'Activity Log', icon: 'pi pi-history', type: 'item', route: '/users/activity' },
      { label: 'Session Management', icon: 'pi pi-clock', type: 'item', route: '/users/sessions' }
    ],

    dashboard: [
      { label: 'User Profile', icon: 'pi pi-user', type: 'item', route: '/users/profile' },
      { 
        label: 'Personal Details', 
        icon: 'pi pi-id-card', 
        type: 'folder', 
        children: [
          { label: 'Basic Information', icon: 'pi pi-info', route: '/users/profile/basic' },
          { label: 'Contact Details', icon: 'pi pi-phone', route: '/users/profile/contact' },
          { label: 'Address', icon: 'pi pi-map-marker', route: '/users/profile/address' }
        ]
      },
      { 
        label: 'Account Settings', 
        icon: 'pi pi-cog', 
        type: 'folder', 
        children: [
          { label: 'Login Credentials', icon: 'pi pi-key', route: '/users/account/credentials' },
          { label: 'Security Settings', icon: 'pi pi-shield', route: '/users/account/security' },
          { label: 'Preferences', icon: 'pi pi-sliders-h', route: '/users/account/preferences' }
        ]
      },
      { label: 'Activity Log', icon: 'pi pi-history', type: 'item', route: '/users/activity' },
      { label: 'Session Management', icon: 'pi pi-clock', type: 'item', route: '/users/sessions' }
    ],    

    reports: [
      { label: 'Report Details', icon: 'pi pi-file-edit', type: 'item', route: '/reports/details' },
      { 
        label: 'Metadata', 
        icon: 'pi pi-tags', 
        type: 'folder', 
        children: [
          { label: 'Creation Date', icon: 'pi pi-calendar', route: '/reports/metadata/date' },
          { label: 'Author', icon: 'pi pi-user', route: '/reports/metadata/author' },
          { label: 'Version', icon: 'pi pi-code', route: '/reports/metadata/version' }
        ]
      },
      { 
        label: 'Data Sources', 
        icon: 'pi pi-database', 
        type: 'folder', 
        children: [
          { label: 'Primary Sources', icon: 'pi pi-server', route: '/reports/datasources/primary' },
          { label: 'Secondary Sources', icon: 'pi pi-cloud', route: '/reports/datasources/secondary' },
          { label: 'External APIs', icon: 'pi pi-globe', route: '/reports/datasources/external' }
        ]
      },
      { label: 'Execution History', icon: 'pi pi-history', type: 'item', route: '/reports/history' },
      { label: 'Performance Metrics', icon: 'pi pi-chart-line', type: 'item', route: '/reports/metrics' }
    ]
  };

  // Permission tab data
  private permissionData = {
    users: [
      { label: 'Role Assignment', icon: 'pi pi-users', type: 'item', route: '/users/roles/assign' },
      { 
        label: 'Access Rights', 
        icon: 'pi pi-key', 
        type: 'folder', 
        children: [
          { label: 'Read Permissions', icon: 'pi pi-eye', route: '/users/permissions/read' },
          { label: 'Write Permissions', icon: 'pi pi-pencil', route: '/users/permissions/write' },
          { label: 'Delete Permissions', icon: 'pi pi-trash', route: '/users/permissions/delete' }
        ]
      },
      { 
        label: 'Module Access', 
        icon: 'pi pi-th-large', 
        type: 'folder', 
        children: [
          { label: 'Dashboard Access', icon: 'pi pi-home', route: '/users/permissions/dashboard' },
          { label: 'Reports Access', icon: 'pi pi-chart-bar', route: '/users/permissions/reports' },
          { label: 'Settings Access', icon: 'pi pi-cog', route: '/users/permissions/settings' },
          { label: 'User Management', icon: 'pi pi-users', route: '/users/permissions/user-mgmt' }
        ]
      },
      { 
        label: 'API Permissions', 
        icon: 'pi pi-globe', 
        type: 'folder', 
        children: [
          { label: 'REST API Access', icon: 'pi pi-cloud', route: '/users/permissions/api-rest' },
          { label: 'GraphQL Access', icon: 'pi pi-code', route: '/users/permissions/api-graphql' },
          { label: 'Webhook Access', icon: 'pi pi-send', route: '/users/permissions/api-webhook' }
        ]
      },
      { label: 'Time-based Access', icon: 'pi pi-clock', type: 'item', route: '/users/permissions/time-based' },
      { label: 'IP Restrictions', icon: 'pi pi-shield', type: 'item', route: '/users/permissions/ip-restrictions' }
    ],
    reports: [
      { label: 'Report Permissions', icon: 'pi pi-file-edit', type: 'item', route: '/reports/permissions' },
      { 
        label: 'Access Control', 
        icon: 'pi pi-lock', 
        type: 'folder', 
        children: [
          { label: 'View Permissions', icon: 'pi pi-eye', route: '/reports/permissions/view' },
          { label: 'Edit Permissions', icon: 'pi pi-pencil', route: '/reports/permissions/edit' },
          { label: 'Share Permissions', icon: 'pi pi-share-alt', route: '/reports/permissions/share' }
        ]
      },
      { 
        label: 'Data Access', 
        icon: 'pi pi-database', 
        type: 'folder', 
        children: [
          { label: 'Read Data Sources', icon: 'pi pi-server', route: '/reports/data-access/read' },
          { label: 'Write Data Sources', icon: 'pi pi-upload', route: '/reports/data-access/write' },
          { label: 'Execute Queries', icon: 'pi pi-play', route: '/reports/data-access/execute' }
        ]
      },
      { 
        label: 'Export Permissions', 
        icon: 'pi pi-download', 
        type: 'folder', 
        children: [
          { label: 'PDF Export', icon: 'pi pi-file-pdf', route: '/reports/export/pdf' },
          { label: 'Excel Export', icon: 'pi pi-file-excel', route: '/reports/export/excel' },
          { label: 'CSV Export', icon: 'pi pi-file', route: '/reports/export/csv' }
        ]
      },
      { label: 'Scheduling Rights', icon: 'pi pi-calendar', type: 'item', route: '/reports/permissions/scheduling' },
      { label: 'Distribution List', icon: 'pi pi-send', type: 'item', route: '/reports/permissions/distribution' }
    ]
  };

  constructor() {}

  /**
   * Get custom menu items for sidebar
   * Returns an Observable of the custom menu items array
   */
  getMenuItems(): Observable<SidebarMenuItem[]> {
    return of(this.customMenuItems);
  }

  /**
   * Get menu content for a specific menu type
   * In a real application, this would make an HTTP call to your backend API
   */
  getMenuContent(menuType: string): Observable<MenuItem[]> {
    const menuContent = (this.menuData as any)[menuType] || [];
    return of(menuContent);
  }

  /**
   * Get user info tab content
   * In a real application, this would make an HTTP call to your backend API
   */
  getUserInfoContent(menuType: string): Observable<MenuItem[]> {
    const content = (this.userInfoData as any)[menuType] || [];
    return of(content);
  }

  /**
   * Get permission tab content
   * In a real application, this would make an HTTP call to your backend API
   */
  getPermissionContent(menuType: string): Observable<MenuItem[]> {
    const content = (this.permissionData as any)[menuType] || [];
    return of(content);
  }

  /**
   * Get tab-specific menu content (e.g., user-info, permissions)
   * This would also come from your API with proper routes defined
   */
  getTabContent(menuType: string, tabType: string): Observable<MenuItem[]> {
    // In real implementation, this would be an API call like:
    // return this.http.get<MenuItem[]>(`/api/menu/${menuType}/${tabType}`);
    
    switch (tabType) {
      case 'user-info':
        return this.getUserInfoContent(menuType);
      case 'permission':
        return this.getPermissionContent(menuType);
      default:
        return this.getMenuContent(menuType);
    }
  }
}