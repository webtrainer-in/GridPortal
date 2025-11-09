import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges, ElementRef, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PanelDragService, PanelPosition } from '../../core/services/panel-drag.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-secondary-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './secondary-panel.html',
  styleUrl: './secondary-panel.scss'
})
export class SecondaryPanelComponent implements OnInit, OnDestroy, OnChanges {
  @Input() isOpen = false;
  @Input() selectedMenuItem: string | null = null;
  @Output() panelClose = new EventEmitter<void>();
  @Output() widthChange = new EventEmitter<number>();
  
  panelPosition: PanelPosition = 'next-to-sidebar';
  activeTab = 'main'; // Default to main tab
  panelWidth = 280; // Default width
  minWidth = 200;
  maxWidth = 600;
  isResizing = false;

  private subscription = new Subscription();
  private boundAdjustForScreenSize = this.adjustForScreenSize.bind(this);
  
  constructor(private panelDragService: PanelDragService, private router: Router) {}
  
  ngOnInit(): void {
    this.loadSavedWidth();
    this.adjustForScreenSize();
    this.widthChange.emit(this.panelWidth);
    
    this.subscription.add(
      this.panelDragService.position$.subscribe(position => {
        this.panelPosition = position;
      })
    );
    
    // Listen for window resize to adjust panel width on mobile
    window.addEventListener('resize', this.boundAdjustForScreenSize);
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Reset to main tab when selectedMenuItem changes
    if (changes['selectedMenuItem']) {
      this.activeTab = 'main';
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Reset to main tab when selectedMenuItem changes
    if (changes['selectedMenuItem']) {
      this.activeTab = 'main';
    }
  }
  
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    window.removeEventListener('resize', this.boundAdjustForScreenSize);
  }
  
  togglePosition(): void {
    this.panelDragService.togglePosition();
  }
  
  closePanel(): void {
    this.panelClose.emit();
  }

  onMenuItemClick(item: any): void {
    // Handle navigation for specific items
    if (this.selectedMenuItem === 'settings' && item.label === 'Backup') {
      this.router.navigate(['/settings/backup']);
      //this.closePanel(); // Close panel after navigation
    }
    // Add more navigation cases as needed
  }

  onResizeStart(event: MouseEvent): void {
    this.isResizing = true;
    event.preventDefault();
    
    const startX = event.clientX;
    const startWidth = this.panelWidth;
    
    const onMouseMove = (e: MouseEvent) => {
      if (!this.isResizing) return;
      
      let newWidth: number;
      if (this.panelPosition === 'far-right') {
        // For far-right position, dragging left increases width
        newWidth = startWidth + (startX - e.clientX);
      } else {
        // For next-to-sidebar position, dragging right increases width
        newWidth = startWidth + (e.clientX - startX);
      }
      
      // Clamp width between min and max
      newWidth = Math.max(this.minWidth, Math.min(this.maxWidth, newWidth));
      this.panelWidth = newWidth;
      this.widthChange.emit(this.panelWidth);
    };
    
    const onMouseUp = () => {
      this.isResizing = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      
      // Save width to localStorage
      localStorage.setItem('secondary-panel-width', this.panelWidth.toString());
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  loadSavedWidth(): void {
    const savedWidth = localStorage.getItem('secondary-panel-width');
    if (savedWidth) {
      const width = parseInt(savedWidth, 10);
      if (width >= this.minWidth && width <= this.maxWidth) {
        this.panelWidth = width;
      }
    }
  }

  adjustForScreenSize(): void {
    const screenWidth = window.innerWidth;
    
    if (screenWidth <= 768) {
      // Mobile: limit panel width to 80% of screen width
      const maxMobileWidth = Math.floor(screenWidth * 0.8);
      if (this.panelWidth > maxMobileWidth) {
        this.panelWidth = Math.max(this.minWidth, maxMobileWidth);
        this.widthChange.emit(this.panelWidth);
      }
    }
  }

  setActiveTab(tabId: string): void {
    this.activeTab = tabId;
  }

  shouldShowTabs(): boolean {
    return this.selectedMenuItem === 'users' || this.selectedMenuItem === 'reports';
  }

  getTabs(): any[] {
    if (this.selectedMenuItem === 'users') {
      return [
        { id: 'main', label: 'User Management', icon: 'pi pi-users' },
        { id: 'user-info', label: 'User Info', icon: 'pi pi-info-circle' },
        { id: 'permission', label: 'User Permission', icon: 'pi pi-key' }
      ];
    }

    if (this.selectedMenuItem === 'reports') {
      return [
        { id: 'main', label: 'Report Management', icon: 'pi pi-file-edit' },
        { id: 'user-info', label: 'Report Info', icon: 'pi pi-info-circle' },
        { id: 'permission', label: 'Report Permission', icon: 'pi pi-key' }
      ];
    }    
    return [];
  }

  getMenuTitle(): string {
    switch (this.selectedMenuItem) {
      case 'dashboard':
        return 'Dashboard Explorer';
      case 'users':
        return 'User Management';
      case 'settings':
        return 'Settings Panel';
      case 'analytics':
        return 'Analytics Tools';
      case 'reports':
        return 'Reports Explorer';
      default:
        return 'Explorer';
    }
  }

  getMenuContent(): any[] {
    switch (this.selectedMenuItem) {
      case 'dashboard':
        return [
          { label: 'Overview', icon: 'pi pi-chart-line', type: 'item' },
          { label: 'Widgets', icon: 'pi pi-th-large', type: 'folder', children: [
            { label: 'Chart Widgets', icon: 'pi pi-chart-bar' },
            { label: 'Data Widgets', icon: 'pi pi-table' },
            { label: 'Custom Widgets', icon: 'pi pi-cog' }
          ]},
          { label: 'Dashboards', icon: 'pi pi-desktop', type: 'folder', children: [
            { label: 'Main Dashboard', icon: 'pi pi-home' },
            { label: 'Sales Dashboard', icon: 'pi pi-shopping-cart' },
            { label: 'Analytics Dashboard', icon: 'pi pi-chart-pie' }
          ]},
          { label: 'Recent Items', icon: 'pi pi-clock', type: 'item' }
        ];
      case 'users':
        return [
          { label: 'All Users', icon: 'pi pi-users', type: 'item' },
          { label: 'User Groups', icon: 'pi pi-users', type: 'folder', children: [
            { label: 'Administrators', icon: 'pi pi-shield' },
            { label: 'Moderators', icon: 'pi pi-user-edit' },
            { label: 'Regular Users', icon: 'pi pi-user' }
          ]},
          { label: 'Permissions', icon: 'pi pi-key', type: 'folder', children: [
            { label: 'Role Management', icon: 'pi pi-cog' },
            { label: 'Access Control', icon: 'pi pi-lock' }
          ]},
          { label: 'User Activity', icon: 'pi pi-chart-line', type: 'item' }
        ];
      case 'settings':
        return [
          { label: 'General', icon: 'pi pi-cog', type: 'item' },
          { label: 'System', icon: 'pi pi-desktop', type: 'folder', children: [
            { label: 'Performance', icon: 'pi pi-gauge' },
            { label: 'Security', icon: 'pi pi-shield' },
            { label: 'Backup', icon: 'pi pi-cloud' }
          ]},
          { label: 'User Preferences', icon: 'pi pi-user-edit', type: 'item' },
          { label: 'Appearance', icon: 'pi pi-palette', type: 'item' }
        ];
      case 'analytics':
        return [
          { label: 'Reports', icon: 'pi pi-chart-bar', type: 'item' },
          { label: 'Data Sources', icon: 'pi pi-database', type: 'folder', children: [
            { label: 'SQL Databases', icon: 'pi pi-server' },
            { label: 'APIs', icon: 'pi pi-globe' },
            { label: 'Files', icon: 'pi pi-file' }
          ]},
          { label: 'Visualizations', icon: 'pi pi-chart-pie', type: 'item' },
          { label: 'Exports', icon: 'pi pi-download', type: 'item' }
        ];
      case 'reports':
        return [
          { label: 'Recent Reports', icon: 'pi pi-clock', type: 'item' },
          { label: 'Templates', icon: 'pi pi-file-edit', type: 'folder', children: [
            { label: 'Standard Templates', icon: 'pi pi-file' },
            { label: 'Custom Templates', icon: 'pi pi-file-edit' }
          ]},
          { label: 'Scheduled Reports', icon: 'pi pi-calendar', type: 'item' },
          { label: 'Archives', icon: 'pi pi-folder', type: 'item' }
        ];
      default:
        return [];
    }
  }

  getUserInfoContent(): any[] {
    if (this.selectedMenuItem === 'users') {
      return [
        { label: 'User Profile', icon: 'pi pi-user', type: 'item' },
        { label: 'Personal Details', icon: 'pi pi-id-card', type: 'folder', children: [
          { label: 'Basic Information', icon: 'pi pi-info' },
          { label: 'Contact Details', icon: 'pi pi-phone' },
          { label: 'Address', icon: 'pi pi-map-marker' }
        ]},
        { label: 'Account Settings', icon: 'pi pi-cog', type: 'folder', children: [
          { label: 'Login Credentials', icon: 'pi pi-key' },
          { label: 'Security Settings', icon: 'pi pi-shield' },
          { label: 'Preferences', icon: 'pi pi-sliders-h' }
        ]},
        { label: 'Activity Log', icon: 'pi pi-history', type: 'item' },
        { label: 'Session Management', icon: 'pi pi-clock', type: 'item' }
      ];
    }

    if (this.selectedMenuItem === 'reports') {
      return [
        { label: 'Report Details', icon: 'pi pi-file-edit', type: 'item' },
        { label: 'Metadata', icon: 'pi pi-tags', type: 'folder', children: [
          { label: 'Creation Date', icon: 'pi pi-calendar' },
          { label: 'Author', icon: 'pi pi-user' },
          { label: 'Version', icon: 'pi pi-code' }
        ]},
        { label: 'Data Sources', icon: 'pi pi-database', type: 'folder', children: [
          { label: 'Primary Sources', icon: 'pi pi-server' },
          { label: 'Secondary Sources', icon: 'pi pi-cloud' },
          { label: 'External APIs', icon: 'pi pi-globe' }
        ]},
        { label: 'Execution History', icon: 'pi pi-history', type: 'item' },
        { label: 'Performance Metrics', icon: 'pi pi-chart-line', type: 'item' }
      ];
    }

    return [];
  }

  getPermissionContent(): any[] {
    if (this.selectedMenuItem === 'users') {
      return [
        { label: 'Role Assignment', icon: 'pi pi-users', type: 'item' },
        { label: 'Access Rights', icon: 'pi pi-key', type: 'folder', children: [
          { label: 'Read Permissions', icon: 'pi pi-eye' },
          { label: 'Write Permissions', icon: 'pi pi-pencil' },
          { label: 'Delete Permissions', icon: 'pi pi-trash' }
        ]},
        { label: 'Module Access', icon: 'pi pi-th-large', type: 'folder', children: [
          { label: 'Dashboard Access', icon: 'pi pi-home' },
          { label: 'Reports Access', icon: 'pi pi-chart-bar' },
          { label: 'Settings Access', icon: 'pi pi-cog' },
          { label: 'User Management', icon: 'pi pi-users' }
        ]},
        { label: 'API Permissions', icon: 'pi pi-globe', type: 'folder', children: [
          { label: 'REST API Access', icon: 'pi pi-cloud' },
          { label: 'GraphQL Access', icon: 'pi pi-code' },
          { label: 'Webhook Access', icon: 'pi pi-send' }
        ]},
        { label: 'Time-based Access', icon: 'pi pi-clock', type: 'item' },
        { label: 'IP Restrictions', icon: 'pi pi-shield', type: 'item' }
      ];
    }

    if (this.selectedMenuItem === 'reports') {
      return [
        { label: 'Report Permissions', icon: 'pi pi-file-edit', type: 'item' },
        { label: 'Access Control', icon: 'pi pi-lock', type: 'folder', children: [
          { label: 'View Permissions', icon: 'pi pi-eye' },
          { label: 'Edit Permissions', icon: 'pi pi-pencil' },
          { label: 'Share Permissions', icon: 'pi pi-share-alt' }
        ]},
        { label: 'Data Access', icon: 'pi pi-database', type: 'folder', children: [
          { label: 'Read Data Sources', icon: 'pi pi-server' },
          { label: 'Write Data Sources', icon: 'pi pi-upload' },
          { label: 'Execute Queries', icon: 'pi pi-play' }
        ]},
        { label: 'Export Permissions', icon: 'pi pi-download', type: 'folder', children: [
          { label: 'PDF Export', icon: 'pi pi-file-pdf' },
          { label: 'Excel Export', icon: 'pi pi-file-excel' },
          { label: 'CSV Export', icon: 'pi pi-file' }
        ]},
        { label: 'Scheduling Rights', icon: 'pi pi-calendar', type: 'item' },
        { label: 'Distribution List', icon: 'pi pi-send', type: 'item' }
      ];
    }

    return [];
  }
}