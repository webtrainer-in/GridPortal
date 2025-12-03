import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { AuthService } from './auth.service';

/**
 * Role-specific access configuration
 * Allows defining different access behaviors for different roles
 */
export interface RoleAccess {
  role: string;
  accessType: 'allow' | 'disable' | 'hide';
}

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
  roleAccess?: RoleAccess[]; // Fine-grained role-based access control
  isDisabled?: boolean; // Runtime flag indicating if menu item is disabled due to role restrictions
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
  roleAccess?: RoleAccess[]; // Fine-grained role-based access control
  isDisabled?: boolean; // Runtime flag indicating if menu item is disabled due to role restrictions
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
  roleAccess?: RoleAccess[]; // Fine-grained role-based access control
  isDisabled?: boolean; // Runtime flag indicating if ribbon item is disabled due to role restrictions
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
 * Filters menus based on user roles
 * 
 * Data flow:
 * 1. Loads menu-config.json via HTTP
 * 2. Extracts topBar configuration section
 * 3. Filters menus based on current user's roles
 * 4. Provides typed access to menu items
 * 5. Caches results using shareReplay for efficient subscriptions
 */
@Injectable({
  providedIn: 'root'
})
export class TopBarConfigLoaderService {
  private configCache$?: Observable<TopBarConfig>;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

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
   * Filter menu items based on user roles
   * Recursively filters both parent and child menu items, as well as ribbon items
   * Uses roleAccess configuration to determine if menu should be visible, disabled, or hidden
   */
  private filterMenuItemsByRole(items: TopBarMenuItem[]): TopBarMenuItem[] {
    const currentUser = this.authService.getCurrentUser();
    const userRoles = currentUser?.roles || [];
    
    return items.map(item => {
      // Create a copy to avoid mutating the original
      const processedItem = { ...item };
      
      // Check roleAccess configuration
      if (processedItem.roleAccess && processedItem.roleAccess.length > 0) {
        const accessConfig = this.evaluateRoleAccess(processedItem.roleAccess, userRoles);
        
        if (accessConfig === 'hide') {
          return null; // Hidden - remove from menu
        } else if (accessConfig === 'disable') {
          processedItem.isDisabled = true; // Visible but disabled
        }
        // 'allow' - no action needed, item is accessible
      }
      // No roleAccess configuration - accessible to all users
      
      // Recursively filter children if they exist (for dropdown mode)
      if (processedItem.children && processedItem.children.length > 0) {
        processedItem.children = processedItem.children.map(child => {
          const processedChild = { ...child };
          
          if (processedChild.roleAccess && processedChild.roleAccess.length > 0) {
            const childAccessConfig = this.evaluateRoleAccess(processedChild.roleAccess, userRoles);
            
            if (childAccessConfig === 'hide') {
              return null;
            } else if (childAccessConfig === 'disable') {
              processedChild.isDisabled = true;
            }
          }
          
          return processedChild;
        }).filter((child): child is TopBarSubMenuItem => child !== null);
      }
      
      // Filter ribbon items if they exist (for ribbon mode)
      if (processedItem.ribbonItems && processedItem.ribbonItems.length > 0) {
        processedItem.ribbonItems = processedItem.ribbonItems.map(ribbonItem => {
          const processedRibbonItem = { ...ribbonItem };
          
          if (processedRibbonItem.roleAccess && processedRibbonItem.roleAccess.length > 0) {
            const ribbonAccessConfig = this.evaluateRoleAccess(processedRibbonItem.roleAccess, userRoles);
            
            if (ribbonAccessConfig === 'hide') {
              return null;
            } else if (ribbonAccessConfig === 'disable') {
              processedRibbonItem.isDisabled = true;
            }
          }
          
          return processedRibbonItem;
        }).filter((ribbonItem): ribbonItem is TopBarRibbonItem => ribbonItem !== null);
      }
      
      return processedItem;
    }).filter((item): item is TopBarMenuItem => item !== null);
  }

  /**
   * Evaluate role-based access configuration for the current user
   * Returns the most permissive access level that matches any of the user's roles
   * Priority: allow > disable > hide
   * If no matching role found, defaults to 'hide'
   */
  private evaluateRoleAccess(roleAccessConfig: RoleAccess[], userRoles: string[]): 'allow' | 'disable' | 'hide' {
    let matchedAccess: 'allow' | 'disable' | 'hide' = 'hide'; // Default to most restrictive
    
    // Check each user role against the access configuration
    for (const userRole of userRoles) {
      const roleConfig = roleAccessConfig.find(
        (config: RoleAccess) => config.role.toLowerCase() === userRole.toLowerCase()
      );
      
      if (roleConfig) {
        const accessType = roleConfig.accessType;
        
        // If we find 'allow', that's the most permissive - return immediately
        if (accessType === 'allow') {
          return 'allow';
        }
        // If we find 'disable' and current is 'hide', upgrade to 'disable'
        else if (accessType === 'disable' && matchedAccess === 'hide') {
          matchedAccess = 'disable';
        }
        // 'hide' is already the default, no need to downgrade
      }
    }
    
    return matchedAccess;
  }

  /**
   * Get all top bar menus filtered by user roles
   * Returns an Observable of the filtered menu items array
   */
  getTopBarMenus(): Observable<TopBarMenuItem[]> {
    return this.loadTopBarConfig().pipe(
      map(config => this.filterMenuItemsByRole(config.menus || []))
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
