import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, shareReplay } from 'rxjs/operators';

export interface MenuConfig {
  version: string;
  menus: any[];
}

/**
 * Service to load and cache menu configuration from JSON file
 * Provides centralized access to menu data across the application
 * 
 * Usage:
 * - Inject MenuConfigLoaderService into components
 * - Call loadMenuConfig() to load the JSON file
 * - Use getMenuConfig() to access the loaded configuration
 * 
 * Features:
 * - Lazy loads menu configuration on first request
 * - Caches the configuration to avoid multiple HTTP requests
 * - Handles errors gracefully with fallback to empty config
 */
@Injectable({
  providedIn: 'root'
})
export class MenuConfigLoaderService {

  private menuConfigPath = 'assets/data/menu-config.json';
  private menuConfig$: Observable<MenuConfig> | null = null;
  private cachedConfig: MenuConfig | null = null;

  constructor(private http: HttpClient) {}

  /**
   * Load menu configuration from JSON file
   * Uses caching and shareReplay to ensure only one HTTP request is made
   * 
   * @returns Observable<MenuConfig> - The loaded menu configuration
   */
  loadMenuConfig(): Observable<MenuConfig> {
    if (this.cachedConfig) {
      return of(this.cachedConfig);
    }

    if (!this.menuConfig$) {
      this.menuConfig$ = this.http.get<MenuConfig>(this.menuConfigPath).pipe(
        tap(config => {
          this.cachedConfig = config;
        }),
        shareReplay(1)
      );
    }

    return this.menuConfig$;
  }

  /**
   * Get cached menu configuration synchronously if available
   * Returns null if configuration hasn't been loaded yet
   * 
   * @returns MenuConfig | null - The cached configuration or null
   */
  getMenuConfig(): MenuConfig | null {
    return this.cachedConfig;
  }

  /**
   * Get all menu definitions from the configuration
   * 
   * @returns any[] - Array of menu definitions
   */
  getMenus(): any[] {
    return this.cachedConfig?.menus || [];
  }

  /**
   * Find a specific menu by ID
   * Searches top-level menus first, then recursively searches in children arrays
   * This allows second-level menu items (like submenu items) to be found and configured
   * 
   * @param menuId - The ID of the menu to find
   * @returns any - The menu definition or undefined
   */
  getMenuById(menuId: string): any {
    // Search top-level menus first
    let menu = this.cachedConfig?.menus.find((m: any) => m.id === menuId);
    
    // If not found, search recursively in children (second-level items)
    if (!menu) {
      for (let topMenu of this.cachedConfig?.menus || []) {
        if (topMenu.children && topMenu.children.length > 0) {
          menu = topMenu.children.find((child: any) => child.id === menuId);
          if (menu) break;
        }
      }
    }
    
    return menu;
  }

  /**
   * Get tabs for a specific menu
   * 
   * @param menuId - The ID of the menu
   * @returns any[] - Array of tab configurations for the menu
   */
  getTabsForMenu(menuId: string): any[] {
    const menu = this.getMenuById(menuId);
    return menu?.tabs || [];
  }

  /**
   * Check if a menu has tabs configured
   * 
   * @param menuId - The ID of the menu
   * @returns boolean - True if menu has tabs, false otherwise
   */
  hasTabsForMenu(menuId: string): boolean {
    const menu = this.getMenuById(menuId);
    return menu?.hasTabs || false;
  }

  /**
   * Get tab content for a specific menu and tab
   * 
   * @param menuId - The ID of the menu
   * @param tabId - The ID of the tab
   * @returns any[] - Array of menu items for the tab, or empty array if not found
   */
  getTabContent(menuId: string, tabId: string): any[] {
    const menu = this.getMenuById(menuId);
    if (!menu?.tabs) {
      return [];
    }

    const tab = menu.tabs.find((t: any) => t.id === tabId);
    return tab?.content || [];
  }

  /**
   * Clear the cached configuration
   * Useful for testing or forcing a fresh load
   */
  clearCache(): void {
    this.cachedConfig = null;
    this.menuConfig$ = null;
  }
}
