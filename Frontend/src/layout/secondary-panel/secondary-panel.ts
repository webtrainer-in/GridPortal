import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PanelDragService, PanelPosition } from '../../core/services/panel-drag.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-secondary-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './secondary-panel.html',
  styleUrl: './secondary-panel.scss'
})
export class SecondaryPanelComponent implements OnInit, OnDestroy {
  @Input() isOpen = false;
  @Input() selectedMenuItem: string | null = null;
  
  panelPosition: PanelPosition = 'next-to-sidebar';
  private subscription = new Subscription();
  
  constructor(private panelDragService: PanelDragService) {}
  
  ngOnInit(): void {
    this.subscription.add(
      this.panelDragService.position$.subscribe(position => {
        this.panelPosition = position;
      })
    );
  }
  
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
  
  togglePosition(): void {
    this.panelDragService.togglePosition();
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
}