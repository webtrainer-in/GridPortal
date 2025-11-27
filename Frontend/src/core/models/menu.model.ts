// ============================================================================
// TAB & MENU CONFIGURATION INTERFACES
// ============================================================================

/**
 * Represents a tab in the tab bar
 * Stores all metadata and state information for a single tab
 * Used by: TabService, TabContainerComponent
 */
export interface Tab {
  id: string;
  title: string;
  route: string;
  icon?: string;
  isActive: boolean;
  canClose: boolean;
  isUndocked?: boolean; // Whether tab is undocked/maximized
  data?: any; // Additional data to pass to the component
}

/**
 * Data structure passed when opening menu items as new tabs
 * Contains information needed to create a new tab from a menu item
 * Used by: SecondaryPanelComponent, TabService
 */
export interface TabMenuData {
  menuType: string;
  itemLabel: string;
  route: string;
  icon?: string;
  isPrimary?: boolean; // Whether the source menu is a primary menu
  isNewTab?: boolean; // Whether this tab was opened via Ctrl+click (always closable)
  parentPath?: string; // Full path of parent items for nested menus (e.g., "Widgets > Chart Widgets")
}

/**
 * Represents a menu item in the secondary panel menu structure
 * Supports nested children for hierarchical menus
 * Used by: MenuDataService, SecondaryPanelComponent
 * 
 * @property label - Display name of the menu item
 * @property icon - Icon class (primeicons, fontawesome, or image path)
 * @property iconType - Type of icon being used
 * @property type - Whether this is a leaf item or folder with children
 * @property route - Navigation route for this menu item
 * @property children - Nested menu items (for folders)
 */
export interface MenuItem {
  label: string;
  icon: string;
  iconType?: 'primeicons' | 'fontawesome' | 'image'; // Type of icon
  type?: 'item' | 'folder';
  route?: string; // The route to navigate to when clicked
  children?: MenuItem[];
}

/**
 * Represents a main sidebar menu item
 * These are the top-level navigation items displayed in the sidebar
 * Used by: MenuDataService, SidebarComponent
 * 
 * @property id - Unique identifier for the menu item
 * @property label - Display name in the sidebar
 * @property icon - Icon class for visual representation
 * @property routerLink - Navigation route for this menu
 * @property children - Submenu items (collapsible)
 * @property isExpanded - State tracking for expanded/collapsed submenus
 * @property isPrimary - Whether this is a primary menu (non-closable tab). Defaults to false
 */
export interface SidebarMenuItem {
  id: string;
  label: string;
  icon: string;
  routerLink?: string;
  children?: SidebarMenuItem[];
  isExpanded?: boolean;
  isPrimary?: boolean; // If true, tabs opened from this menu cannot be closed
}

/**
 * Configuration for tabs that appear in the secondary panel
 * Defines which tabs to show for each menu section
 * Used by: MenuDataService, SecondaryPanelComponent
 * 
 * @property id - Tab identifier
 * @property label - Display label for the tab
 * @property icon - Icon class for the tab
 */
export interface TabConfig {
  id: string;
  label: string;
  icon: string;
}

/**
 * Complete configuration for a menu panel
 * Defines menu display properties, whether it has tabs, and tab configurations
 * Used by: MenuDataService, SecondaryPanelComponent
 * 
 * @property id - Unique menu identifier
 * @property label - Menu label (internal use)
 * @property displayTitle - Title shown in the secondary panel header
 * @property icon - Icon for the menu
 * @property hasTabs - Whether this menu should display tabs
 * @property tabs - Tab configurations if hasTabs is true
 * @property routerLink - Navigation route for this menu
 */
export interface MenuPanelConfig {
  id: string;
  label: string;
  displayTitle: string;
  icon: string;
  hasTabs: boolean;
  tabs?: TabConfig[];
  routerLink?: string;
}
