import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { MenuItem, SidebarMenuItem, TabConfig, MenuPanelConfig } from '../models/menu.model';
import { MenuConfigLoaderService } from './menu-config-loader.service';

/**
 * Service that provides menu data to the application
 * Loads configuration from JSON file via MenuConfigLoaderService
 * Maintains same public API as previous implementation for backward compatibility
 * 
 * Data flow:
 * 1. MenuConfigLoaderService loads menu-config.json
 * 2. MenuDataService transforms JSON data into typed objects
 * 3. Components consume through public methods (getMenuItems, getTabsForMenu, etc.)
 */
@Injectable({
  providedIn: 'root'
})
export class MenuDataService {

  constructor(private configLoader: MenuConfigLoaderService) {}

  /**
   * Get custom menu items for sidebar
   * Loads sidebar menu items from JSON configuration
   * Returns an Observable of the custom menu items array
   */
  getMenuItems(): Observable<SidebarMenuItem[]> {
    return this.configLoader.loadMenuConfig().pipe(
      map(config => {
        return config.menus
          .filter((menu: any) => !menu.tabs || menu.tabs.length > 0 || !menu.hasTabs)
          .map((menu: any) => this.mapMenuItem(menu)) as SidebarMenuItem[];
      })
    );
  }

  /**
   * Recursively map menu items to ensure all properties including roleAccess are preserved
   */
  private mapMenuItem(menu: any): SidebarMenuItem {
    const item: SidebarMenuItem = {
      id: menu.id,
      label: menu.label,
      icon: menu.icon,
      routerLink: menu.routerLink,
      isExpanded: menu.isExpanded,
      isPrimary: menu.isPrimary || false,
      roleAccess: menu.roleAccess // Fine-grained role access configuration
    };

    // Recursively map children if they exist
    if (menu.children && Array.isArray(menu.children)) {
      item.children = menu.children.map((child: any) => this.mapMenuItem(child));
    }

    return item;
  }

  /**
   * Get tabs configuration for a specific menu
   * Returns an array of TabConfig for the given menu ID
   * Transforms tab data from JSON to TabConfig interface
   */
  getTabsForMenu(menuId: string): TabConfig[] {
    const tabs = this.configLoader.getTabsForMenu(menuId);
    return tabs.map((tab: any) => ({
      id: tab.id,
      label: tab.label,
      icon: tab.icon
    })) as TabConfig[];
  }

  /**
   * Check if a specific menu has tabs
   * Returns boolean indicating if the menu should display tabs
   */
  hasTabsForMenu(menuId: string): boolean {
    return this.configLoader.hasTabsForMenu(menuId);
  }

  /**
   * Get the display title for a specific menu
   * Returns the title to be displayed in the secondary panel
   */
  getMenuDisplayTitle(menuId: string): string {
    const menu = this.configLoader.getMenuById(menuId);
    return menu?.displayTitle || 'Explorer';
  }

  /**
   * Get tab-specific menu content
   * Routes to appropriate tab content based on tabType parameter
   * 
   * @param menuType - The menu ID (e.g., 'users', 'dashboard')
   * @param tabType - The tab ID (e.g., 'main', 'user-info', 'permission')
   * @returns Observable with menu items for the specified tab
   */
  getTabContent(menuType: string, tabType: string): Observable<MenuItem[]> {
    const content = this.configLoader.getTabContent(menuType, tabType);
    return of(content);
  }

  /**
   * Detect and return ambiguous item names that appear multiple times across different menu contexts
   * An item name is considered ambiguous if it appears in multiple different menu locations
   * This allows automatic detection without hardcoding
   * 
   * @returns Observable<string[]> - Array of ambiguous item labels
   */
  getAmbiguousItemNames(): Observable<string[]> {
    return this.configLoader.loadMenuConfig().pipe(
      map(config => {
        // Collect all item labels from all menus, with their occurrences count
        const labelOccurrences: { [label: string]: number } = {};
        
        // Recursively scan all menu items
        const scanMenuItems = (items: any[]): void => {
          items.forEach(item => {
            if (item.label) {
              labelOccurrences[item.label] = (labelOccurrences[item.label] || 0) + 1;
            }
            // Also scan tab contents
            if (item.tabs && Array.isArray(item.tabs)) {
              item.tabs.forEach((tab: any) => {
                if (tab.content && Array.isArray(tab.content)) {
                  scanMenuItems(tab.content);
                }
              });
            }
            // Recursively scan children
            if (item.children && Array.isArray(item.children)) {
              scanMenuItems(item.children);
            }
          });
        };
        
        // Start scanning from root menus
        if (config.menus && Array.isArray(config.menus)) {
          scanMenuItems(config.menus);
        }
        
        // Return only labels that appear more than once (ambiguous)
        return Object.entries(labelOccurrences)
          .filter(([label, count]) => count > 1)
          .map(([label]) => label);
      })
    );
  }
}