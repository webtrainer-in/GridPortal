import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { SidebarMenuItem } from '../../core/models/menu.model';

/**
 * Recursive Sidebar Menu Component
 * Renders menu items with unlimited nesting levels
 * Each item can be a leaf node or a folder with children
 * Supports expand/collapse state management for items with children
 */
@Component({
  selector: 'app-recursive-sidebar-menu',
  standalone: true,
  imports: [CommonModule, RouterModule, RecursiveSidebarMenuComponent],
  templateUrl: './recursive-sidebar-menu.html',
  styleUrl: './recursive-sidebar-menu.scss'
})
export class RecursiveSidebarMenuComponent implements OnInit {
  @Input() items: SidebarMenuItem[] = [];
  @Input() level: number = 0; // Track nesting level for styling
  @Input() isOpen: boolean = true; // Is sidebar expanded
  @Input() expandedItems: Set<string> = new Set(); // Track which items are expanded
  @Input() selectedMenuItem: string | null = null; // Currently selected menu item
  
  @Output() itemSelect = new EventEmitter<{menuId: string, event: Event}>();
  @Output() toggleExpand = new EventEmitter<SidebarMenuItem>();
  @Output() selectionChange = new EventEmitter<{menuId: string, isOpen: boolean}>();
  
  // Map to track expanded state by item ID
  private expandedMap: Map<string, boolean> = new Map();
  
  constructor(private router: Router) {}
  
  ngOnInit(): void {
    this.updateExpandedMap();
  }
  
  ngOnChanges(): void {
    this.updateExpandedMap();
  }
  
  private updateExpandedMap(): void {
    this.items.forEach(item => {
      if (this.expandedItems.has(item.id)) {
        this.expandedMap.set(item.id, true);
      }
    });
  }
  
  /**
   * Check if an item is expanded
   */
  isExpanded(item: SidebarMenuItem): boolean {
    return this.expandedMap.get(item.id) ?? (item.isExpanded ?? false);
  }
  
  /**
   * Handle item click
   * If item has children, expand it and notify parent to open sidebar if collapsed
   * If item has no children, navigate or emit selection
   */
  onItemClick(item: SidebarMenuItem, event: Event): void {
    event.preventDefault();
    
    // If item has children, expand it
    if (this.hasChildren(item)) {
      // Expand the menu item if not already expanded
      if (!this.isExpanded(item)) {
        this.expandedMap.set(item.id, true);
        item.isExpanded = true;
        this.toggleExpand.emit(item);
      }
      
      // If item also has a route, navigate to it
      if (item.routerLink) {
        this.router.navigate([item.routerLink]);
      }
      
      // Emit item selection for tab/secondary panel handling
      this.itemSelect.emit({ menuId: item.id, event });
      this.selectionChange.emit({ menuId: item.id, isOpen: true });
      return;
    }
    
    // For items without children, navigate if route exists
    if (item.routerLink) {
      this.router.navigate([item.routerLink]);
    }
    
    // Emit item selection
    this.itemSelect.emit({ menuId: item.id, event });
    
    // Emit selection change for parent component
    this.selectionChange.emit({ menuId: item.id, isOpen: true });
  }
  
  /**
   * Handle expand/collapse toggle
   */
  onToggleExpand(item: SidebarMenuItem, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    if (this.hasChildren(item)) {
      const currentState = this.expandedMap.get(item.id) ?? (item.isExpanded ?? false);
      this.expandedMap.set(item.id, !currentState);
      item.isExpanded = !currentState;
      this.toggleExpand.emit(item);
    }
  }
  
  /**
   * Check if item has children
   */
  hasChildren(item: SidebarMenuItem): boolean {
    return !!item.children && item.children.length > 0;
  }
  
  /**
   * Get nesting level for next recursive level
   */
  getNextLevel(): number {
    return this.level + 1;
  }
  
  /**
   * Track by function for ngFor optimization
   */
  trackById(index: number, item: SidebarMenuItem): string {
    return item.id;
  }
}
