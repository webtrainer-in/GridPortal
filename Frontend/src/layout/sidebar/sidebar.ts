import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';

interface CustomMenuItem {
  label: string;
  icon: string;
  routerLink: string;
  id: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonModule
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss'
})
export class SidebarComponent {
  @Input() isOpen = true;
  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() secondaryPanelToggle = new EventEmitter<{isOpen: boolean, menuId: string | null}>();

  selectedMenuItem: string | null = null;

  menuItems: CustomMenuItem[] = [
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
      routerLink: '/settings'
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

  onMenuItemClick() {
    // Close sidebar on mobile when menu item is clicked
    if (window.innerWidth <= 768) {
      this.toggleSidebar.emit();
    }
  }

  onToggleSidebar() {
    this.toggleSidebar.emit();
  }

  onMenuItemSelect(menuId: string, event: Event) {
    event.preventDefault();
    
    // Toggle secondary panel
    const isCurrentlySelected = this.selectedMenuItem === menuId;
    this.selectedMenuItem = isCurrentlySelected ? null : menuId;
    
    // Emit event to parent component
    this.secondaryPanelToggle.emit({
      isOpen: !isCurrentlySelected,
      menuId: this.selectedMenuItem
    });

    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
      this.toggleSidebar.emit();
    }
  }
}