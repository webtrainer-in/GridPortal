import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MenuItem } from '../../core/models/menu.model';

/**
 * Recursive Menu Tree Component
 * Renders menu items with unlimited nesting levels
 * Each item can be a leaf node or a folder containing children
 * Supports expand/collapse state management for folders
 */
@Component({
  selector: 'app-recursive-menu-tree',
  standalone: true,
  imports: [CommonModule, RecursiveMenuTreeComponent],
  templateUrl: './recursive-menu-tree.html',
  styleUrl: './recursive-menu-tree.scss'
})
export class RecursiveMenuTreeComponent implements OnInit {
  @Input() items: MenuItem[] = [];
  @Input() level: number = 0; // Track nesting level for styling
  @Input() expandedItems: Set<string> = new Set(); // Track which items are expanded
  
  @Output() itemClick = new EventEmitter<{item: MenuItem, event?: MouseEvent}>();
  @Output() toggleExpand = new EventEmitter<MenuItem>();
  
  // Map to track expanded state by item label (using label as unique identifier)
  private expandedMap: Map<string, boolean> = new Map();
  
  ngOnInit(): void {
    // Initialize expanded items from input
    this.updateExpandedMap();
  }
  
  ngOnChanges(): void {
    this.updateExpandedMap();
  }
  
  private updateExpandedMap(): void {
    this.items.forEach(item => {
      const key = this.getItemKey(item);
      if (this.expandedItems.has(key)) {
        this.expandedMap.set(key, true);
      }
    });
  }
  
  /**
   * Generate unique key for menu item
   * Using label as it should be unique within context
   */
  getItemKey(item: MenuItem): string {
    return `${this.level}-${item.label}`;
  }
  
  /**
   * Check if an item is expanded
   */
  isExpanded(item: MenuItem): boolean {
    const key = this.getItemKey(item);
    return this.expandedMap.get(key) ?? false;
  }
  
  /**
   * Handle item click - emit to parent
   */
  onItemClick(item: MenuItem, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.itemClick.emit({item, event});
  }
  
  /**
   * Handle folder expand/collapse toggle
   */
  onToggleExpand(item: MenuItem, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    
    if (item.type === 'folder' && item.children && item.children.length > 0) {
      const key = this.getItemKey(item);
      const currentState = this.expandedMap.get(key) ?? false;
      this.expandedMap.set(key, !currentState);
      this.toggleExpand.emit(item);
    }
  }
  
  /**
   * Check if item has children
   */
  hasChildren(item: MenuItem): boolean {
    return item.type === 'folder' && !!item.children && item.children.length > 0;
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
  trackByLabel(index: number, item: MenuItem): string {
    return item.label;
  }
}
