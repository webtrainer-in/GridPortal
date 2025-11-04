import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { PanelMenuModule } from 'primeng/panelmenu';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonModule,
    MenuModule,
    PanelMenuModule
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss'
})
export class SidebarComponent {
  @Input() isOpen = true;
  @Output() toggleSidebar = new EventEmitter<void>();

  menuItems: MenuItem[] = [
    {
      label: 'Dashboard',
      icon: 'pi pi-home',
      routerLink: '/dashboard',
      command: () => this.onMenuItemClick()
    },
    {
      label: 'Users',
      icon: 'pi pi-users',
      routerLink: '/users',
      command: () => this.onMenuItemClick()
    },
    {
      label: 'Settings',
      icon: 'pi pi-cog',
      routerLink: '/settings',
      command: () => this.onMenuItemClick()
    },
    {
      label: 'Analytics',
      icon: 'pi pi-chart-bar',
      routerLink: '/analytics',
      command: () => this.onMenuItemClick()
    },
    {
      label: 'Reports',
      icon: 'pi pi-file-pdf',
      routerLink: '/reports',
      command: () => this.onMenuItemClick()
    }
  ];

  onMenuItemClick() {
    // Close sidebar on mobile when menu item is clicked
    if (window.innerWidth <= 768) {
      this.toggleSidebar.emit();
    }
  }
}