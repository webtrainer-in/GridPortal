import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
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
  @Output() widthChange = new EventEmitter<number>();

  selectedMenuItem: string | null = null;
  menuItems: SidebarMenuItem[] = [];
  expandedMenuItems: Set<string> = new Set(); // Track expanded menu items
  
  // Resize properties
  sidebarWidth = 300; // Default width - increased for better text visibility
  minWidth = 200; // Minimum width to show menu items properly
  maxWidth = 600; // Maximum width for large screens
  isResizing = false;

  constructor(
    private tabService: TabService,
    private menuDataService: MenuDataService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadMenuItems();
    this.loadSavedWidth();
  }

  loadMenuItems(): void {
    this.menuDataService.getMenuItems().subscribe(items => {
      this.menuItems = items;
      this.cdr.markForCheck();
    });
  }

  loadSavedWidth(): void {
    // First try to load the expanded width if saved
    const savedExpandedWidth = localStorage.getItem('sidebar-width-expanded');
    if (savedExpandedWidth) {
      const width = parseInt(savedExpandedWidth, 10);
      if (width >= this.minWidth && width <= this.maxWidth) {
        this.sidebarWidth = width;
        return;
      }
    }
    
    // Fallback to general sidebar-width for backward compatibility
    const savedWidth = localStorage.getItem('sidebar-width');
    if (savedWidth) {
      const width = parseInt(savedWidth, 10);
      if (width >= this.minWidth && width <= this.maxWidth) {
        this.sidebarWidth = width;
      } else {
        // Reset to default if saved width is outside bounds
        this.sidebarWidth = 300;
        localStorage.setItem('sidebar-width-expanded', '300');
      }
    } else {
      // No saved width, use default and save it
      localStorage.setItem('sidebar-width-expanded', '300');
    }
  }

  onResizeStart(event: MouseEvent): void {
    this.isResizing = true;
    event.preventDefault();
    
    const startX = event.clientX;
    const startWidth = this.sidebarWidth;
    
    const onMouseMove = (e: MouseEvent) => {
      if (!this.isResizing) return;
      
      // Calculate new width by dragging right
      const newWidth = startWidth + (e.clientX - startX);
      
      // Clamp width between min and max
      this.sidebarWidth = Math.max(this.minWidth, Math.min(this.maxWidth, newWidth));
      this.cdr.markForCheck();
    };
    
    const onMouseUp = () => {
      this.isResizing = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      
      // Save width to localStorage
      localStorage.setItem('sidebar-width', this.sidebarWidth.toString());
      this.widthChange.emit(this.sidebarWidth);
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
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

  /**
   * Handle sidebar collapse/expand and manage resizing state
   */
  onSidebarToggle(): void {
    this.isOpen = !this.isOpen;
    
    if (!this.isOpen) {
      // When collapsing, save current width and set to collapsed width
      localStorage.setItem('sidebar-width-expanded', this.sidebarWidth.toString());
      this.sidebarWidth = 60; // Collapsed width
    } else {
      // When expanding, restore previous width
      const savedExpandedWidth = localStorage.getItem('sidebar-width-expanded');
      if (savedExpandedWidth) {
        const width = parseInt(savedExpandedWidth, 10);
        if (width >= this.minWidth && width <= this.maxWidth) {
          this.sidebarWidth = width;
        }
      }
    }
    
    this.cdr.markForCheck();
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
      // Check if Ctrl/Cmd key is pressed for new tab
      const mouseEvent = event as MouseEvent;
      const isCtrlClick = mouseEvent.ctrlKey || mouseEvent.metaKey;
      
      // Create tab data
      const tabData = {
        menuType: menuId,
        itemLabel: menuItem.label,
        route: menuItem.routerLink,
        icon: menuItem.icon,
        isPrimary: menuItem.isPrimary || false,
        isNewTab: isCtrlClick // Mark Ctrl+click tabs as new tabs (always closable)
      };
      
      if (isCtrlClick) {
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