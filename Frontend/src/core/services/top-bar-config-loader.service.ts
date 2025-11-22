import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

/**
 * Represents a top bar menu item configuration
 * Defines dropdown menu structure and ribbon items
 */
export interface TopBarMenuItem {
  id: string;
  label: string;
  icon?: string;
  children?: TopBarSubMenuItem[];
  ribbonItems?: TopBarRibbonItem[];
}

/**
 * Represents a submenu item in the top bar dropdown
 */
export interface TopBarSubMenuItem {
  id: string;
  label: string;
  icon?: string;
  action?: string;
  separator?: boolean;
}

/**
 * Represents a ribbon item in the top bar ribbon view
 */
export interface TopBarRibbonItem {
  id: string;
  label: string;
  icon: string;
  action?: string;
  type: 'button' | 'dropdown' | 'toggle';
  group?: string;
  size?: 'small' | 'large';
}

/**
 * Top bar configuration from JSON
 */
export interface TopBarConfig {
  menus: TopBarMenuItem[];
}

/**
 * Service that loads and manages top bar menu configuration
 * Loads configuration from menu-config.json
 * Caches the configuration to avoid multiple HTTP requests
 * 
 * Data flow:
 * 1. Loads menu-config.json via HTTP
 * 2. Extracts topBar configuration section
 * 3. Provides typed access to menu items
 * 4. Caches results using shareReplay for efficient subscriptions
 */
@Injectable({
  providedIn: 'root'
})
export class TopBarConfigLoaderService {
  private configCache$?: Observable<TopBarConfig>;

  constructor(private http: HttpClient) {}

  /**
   * Load top bar configuration from menu-config.json
   * Returns an Observable of the top bar configuration
   * Results are cached for subsequent calls
   */
  loadTopBarConfig(): Observable<TopBarConfig> {
    if (!this.configCache$) {
      this.configCache$ = this.http.get<any>('/assets/data/menu-config.json').pipe(
        map(config => {
          if (!config.topBar) {
            return { menus: [] };
          }
          return config.topBar as TopBarConfig;
        }),
        shareReplay(1)
      );
    }
    return this.configCache$;
  }

  /**
   * Get all top bar menus
   * Returns an Observable of the menu items array
   */
  getTopBarMenus(): Observable<TopBarMenuItem[]> {
    return this.loadTopBarConfig().pipe(
      map(config => config.menus || [])
    );
  }

  /**
   * Get a specific menu by ID
   * @param menuId The ID of the menu to retrieve
   * Returns an Observable of the menu item or undefined
   */
  getMenuById(menuId: string): Observable<TopBarMenuItem | undefined> {
    return this.getTopBarMenus().pipe(
      map(menus => menus.find(menu => menu.id === menuId))
    );
  }

  /**
   * Get children items for a specific menu
   * @param menuId The ID of the menu
   * Returns an Observable of the submenu items array
   */
  getMenuChildren(menuId: string): Observable<TopBarSubMenuItem[]> {
    return this.getMenuById(menuId).pipe(
      map(menu => menu?.children || [])
    );
  }

  /**
   * Get ribbon items for a specific menu
   * @param menuId The ID of the menu
   * Returns an Observable of the ribbon items array
   */
  getMenuRibbonItems(menuId: string): Observable<TopBarRibbonItem[]> {
    return this.getMenuById(menuId).pipe(
      map(menu => menu?.ribbonItems || [])
    );
  }
}
