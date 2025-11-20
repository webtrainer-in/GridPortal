import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TabService } from '../../core/services/tab.service';
import { MenuDataService } from '../../core/services/menu-data.service';
import { SidebarMenuItem } from '../../core/models/menu.model';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonModule
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent implements OnInit {
  @Input() isOpen = true;
  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() secondaryPanelToggle = new EventEmitter<{isOpen: boolean, menuId: string | null}>();

  selectedMenuItem: string | null = null;
  menuItems: SidebarMenuItem[] = [];

  constructor(
    private tabService: TabService,
    private menuDataService: MenuDataService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadMenuItems();
  }

  loadMenuItems(): void {
    this.menuDataService.getMenuItems().subscribe(items => {
      this.menuItems = items;
      this.cdr.markForCheck();
    });
  }

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
    
    // Check if this is a different menu from currently selected
    const isDifferentMenu = this.selectedMenuItem !== null && this.selectedMenuItem !== menuId;
    const isCurrentlySelected = this.selectedMenuItem === menuId;
    
    // Clear all tabs only when switching to a completely different main menu
    if (isDifferentMenu) {
      this.tabService.clearAllTabs();
    }
    
    // For any menu item with a route, create a tab
    if (menuItem && menuItem.routerLink) {
      // Create tab data
      const tabData = {
        menuType: menuId,
        itemLabel: menuItem.label,
        route: menuItem.routerLink,
        icon: menuItem.icon
      };
      
      // Check if Ctrl/Cmd key is pressed for new tab
      const mouseEvent = event as MouseEvent;
      if (mouseEvent.ctrlKey || mouseEvent.metaKey) {
        this.tabService.openMenuItemInNewTab(tabData);
      } else {
        this.tabService.openMenuItem(tabData);
      }
    }
    
    // Toggle secondary panel
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

  findMenuItem(id: string): SidebarMenuItem | undefined {
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