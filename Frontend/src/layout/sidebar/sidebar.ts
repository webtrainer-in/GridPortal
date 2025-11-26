import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TabService } from '../../core/services/tab.service';
import { MenuDataService } from '../../core/services/menu-data.service';
import { SidebarMenuItem } from '../../core/models/menu.model';
import { RecursiveSidebarMenuComponent } from './recursive-sidebar-menu';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonModule,
    RecursiveSidebarMenuComponent
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
  expandedMenuItems: Set<string> = new Set(); // Track expanded menu items

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
    const menuItem = this.findMenuItemRecursive(menuId, this.menuItems);
    
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

  /**
   * Handle toggle expand for menu items (recursive support)
   */
  onToggleMenuExpand(item: SidebarMenuItem): void {
    this.expandedMenuItems.add(item.id);
    this.cdr.markForCheck();
  }

  /**
   * Handle menu selection change from recursive component
   */
  onMenuSelectionChange(menuId: string, isOpen: boolean): void {
    this.selectedMenuItem = isOpen ? menuId : null;
    
    this.secondaryPanelToggle.emit({
      isOpen: isOpen,
      menuId: this.selectedMenuItem
    });

    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
      this.toggleSidebar.emit();
    }
  }

  /**
   * Find menu item recursively (supports n-level nesting)
   */
  private findMenuItemRecursive(id: string, items: SidebarMenuItem[]): SidebarMenuItem | undefined {
    for (const item of items) {
      if (item.id === id) {
        return item;
      }
      if (item.children && item.children.length > 0) {
        const found = this.findMenuItemRecursive(id, item.children);
        if (found) {
          return found;
        }
      }
    }
    return undefined;
  }

  toggleSubmenu(menuId: string) {
    const menuItem = this.findMenuItemRecursive(menuId, this.menuItems);
    if (menuItem) {
      menuItem.isExpanded = !menuItem.isExpanded;
    }
  }

  findMenuItem(id: string): SidebarMenuItem | undefined {
    return this.findMenuItemRecursive(id, this.menuItems);
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