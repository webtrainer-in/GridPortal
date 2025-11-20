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
   * Initialize the service by loading menu configuration
   * Should be called during app initialization
   */
  initialize(): Observable<void> {
    return this.configLoader.loadMenuConfig().pipe(
      map(() => {
        // Initialization complete
      })
    );
  }

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
   * Get complete menu panel configuration for a specific menu
   * Returns the full MenuPanelConfig object or null if not found
   */
  getMenuPanelConfig(menuId: string): MenuPanelConfig | null {
    const menu = this.configLoader.getMenuById(menuId);
    if (!menu) {
      return null;
    }

    return {
      id: menu.id,
      label: menu.label,
      displayTitle: menu.displayTitle,
      icon: menu.icon,
      hasTabs: menu.hasTabs,
      tabs: this.getTabsForMenu(menuId),
      routerLink: menu.routerLink
    } as MenuPanelConfig;
  }

  /**
   * Get menu content for a specific menu type (main tab)
   * Returns the content items for the main tab of a menu
   */
  getMenuContent(menuType: string): Observable<MenuItem[]> {
    const menu = this.configLoader.getMenuById(menuType);
    if (!menu?.tabs) {
      return of([]);
    }

    const mainTab = menu.tabs.find((t: any) => t.id === 'main');
    return of(mainTab?.content || []);
  }

  /**
   * Get user info tab content
   * Returns content items for the user-info tab of a menu
   */
  getUserInfoContent(menuType: string): Observable<MenuItem[]> {
    const content = this.configLoader.getTabContent(menuType, 'user-info');
    return of(content);
  }

  /**
   * Get permission tab content
   * Returns content items for the permission tab of a menu
   */
  getPermissionContent(menuType: string): Observable<MenuItem[]> {
    const content = this.configLoader.getTabContent(menuType, 'permission');
    return of(content);
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