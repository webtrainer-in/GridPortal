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
          .map((menu: any) => ({
            id: menu.id,
            label: menu.label,
            icon: menu.icon,
            routerLink: menu.routerLink,
            isExpanded: menu.isExpanded,
            isPrimary: menu.isPrimary || false, // Add isPrimary flag from config, default to false
            children: menu.children
          })) as SidebarMenuItem[];
      })
    );
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
}