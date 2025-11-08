import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';

interface CustomMenuItem {
  label: string;
  icon: string;
  routerLink?: string;
  id: string;
  children?: CustomMenuItem[];
  isExpanded?: boolean;
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
    const menuItem = this.findMenuItem(menuId);
    
    // If menu has children, toggle expansion and prevent navigation
    if (menuItem && menuItem.children && menuItem.children.length > 0) {
      event.preventDefault();
      this.toggleSubmenu(menuId);
      return;
    }
    
    // For regular menu items without children
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

  toggleSubmenu(menuId: string) {
    const menuItem = this.findMenuItem(menuId);
    if (menuItem) {
      menuItem.isExpanded = !menuItem.isExpanded;
    }
  }

  findMenuItem(id: string): CustomMenuItem | undefined {
    return this.menuItems.find(item => item.id === id);
  }

  onSubmenuItemSelect(menuId: string, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    
    // Toggle secondary panel for submenu items
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