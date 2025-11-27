import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Tab, TabMenuData } from '../models/menu.model';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class TabService {
  private tabs$ = new BehaviorSubject<Tab[]>([]);
  private activeTabId$ = new BehaviorSubject<string>('');

  constructor(private router: Router) {
    // Tab will be initialized when user selects a menu item from sidebar
  }

  getTabs(): Observable<Tab[]> {
    return this.tabs$.asObservable();
  }

  getActiveTabId(): Observable<string> {
    return this.activeTabId$.asObservable();
  }

  addTab(tab: Tab): void {
    const currentTabs = this.tabs$.value;
    const existingTab = currentTabs.find(t => t.id === tab.id);
    
    if (existingTab) {
      // Tab already exists, just activate it
      this.setActiveTab(tab.id);
      return;
    }

    // Set all other tabs as inactive
    const updatedTabs = currentTabs.map(t => ({ ...t, isActive: false }));
    
    // Add new tab
    const newTab = { ...tab, isActive: true };
    updatedTabs.push(newTab);
    
    this.tabs$.next(updatedTabs);
    this.setActiveTab(tab.id);
  }

  removeTab(tabId: string): void {
    const currentTabs = this.tabs$.value;
    const tabToRemove = currentTabs.find(t => t.id === tabId);
    
    if (!tabToRemove || !tabToRemove.canClose) {
      return; // Can't close non-closable tabs
    }

    const filteredTabs = currentTabs.filter(t => t.id !== tabId);
    
    // If we're removing the active tab, activate another tab
    if (tabToRemove.isActive && filteredTabs.length > 0) {
      // Activate the last tab or dashboard if no other tabs
      const newActiveTab = filteredTabs[filteredTabs.length - 1] || filteredTabs.find(t => t.id === 'dashboard');
      if (newActiveTab) {
        filteredTabs.forEach(t => t.isActive = t.id === newActiveTab.id);
        this.setActiveTab(newActiveTab.id);
      }
    }
    
    this.tabs$.next(filteredTabs);
  }

  setActiveTab(tabId: string): void {
    const currentTabs = this.tabs$.value;
    const updatedTabs = currentTabs.map(tab => ({
      ...tab,
      isActive: tab.id === tabId
    }));
    
    this.tabs$.next(updatedTabs);
    this.activeTabId$.next(tabId);
    
    // Navigate to the tab's route
    const activeTab = updatedTabs.find(t => t.id === tabId);
    if (activeTab) {
      // Preserve existing query parameters during navigation
      this.router.navigate([activeTab.route], { queryParamsHandling: 'preserve' });
    }
  }

  openMenuItemInNewTab(menuData: TabMenuData): void {
    // Generate base tab ID
    let tabId = this.generateTabId(menuData.route, menuData.itemLabel, menuData.menuType, menuData.parentPath);
    
    // Check if tab already exists
    const currentTabs = this.tabs$.value;
    let existingTab = currentTabs.find(t => t.id === tabId);
    
    if (existingTab) {
      // Tab already exists, just activate it instead of creating a duplicate
      this.setActiveTab(tabId);
      return;
    }
    
    // Check if there are other tabs with the same label (but different route/context)
    // If yes, add a counter to make the display title unique
    const tabsWithSameLabel = currentTabs.filter(t => 
      t.title === this.generateTabTitle(menuData.itemLabel, menuData.menuType, menuData.parentPath)
    );
    
    let tabTitle = this.generateTabTitle(menuData.itemLabel, menuData.menuType, menuData.parentPath);
    if (tabsWithSameLabel.length > 0) {
      // Add sequence number to differentiate tabs with same name from different contexts
      tabTitle = `${tabTitle} (${tabsWithSameLabel.length + 1})`;
      tabId = `${tabId}-${tabsWithSameLabel.length + 1}`;
    }
    
    // When opened via Ctrl+click (isNewTab=true), always allow closing
    // Otherwise respect the isPrimary flag
    const canClose = menuData.isNewTab === true || menuData.isPrimary !== true;
    
    const tab: Tab = {
      id: tabId,
      title: tabTitle,
      route: menuData.route,
      icon: menuData.icon || 'pi pi-file',
      isActive: true,
      canClose: canClose,
      data: menuData
    };
    
    this.addTab(tab);
  }

  openMenuItem(menuData: TabMenuData): void {
    // Open menu item in existing tab (replace current tab or activate existing)
    const tabId = this.generateTabId(menuData.route, menuData.itemLabel, menuData.menuType, menuData.parentPath);
    
    // Use the isPrimary flag from the menu data to determine if tab can be closed
    // Primary menus should not be closable
    const tabTitle = this.generateTabTitle(menuData.itemLabel, menuData.menuType, menuData.parentPath);
    const canClose = menuData.isPrimary !== true;
    
    const tab: Tab = {
      id: tabId,
      title: tabTitle,
      route: menuData.route,
      icon: menuData.icon || 'pi pi-file',
      isActive: true,
      canClose: canClose,
      data: menuData
    };
    
    this.addTab(tab);
  }

  initializeMainMenuTab(menuId: string, label: string, route: string, icon: string, isPrimary: boolean = true): void {
    // Initialize or activate main menu tab
    // Primary menus (isPrimary = true) cannot be closed
    const tab: Tab = {
      id: menuId,
      title: label,
      route: route,
      icon: icon,
      isActive: true,
      canClose: !isPrimary
    };
    
    this.addTab(tab);
  }

  private generateTabId(route: string, label: string, menuType?: string, parentPath?: string): string {
    // Include menu context to make tab IDs unique across different menu contexts
    const contextPrefix = menuType ? `${menuType}-` : '';
    const routePart = route.replace(/\//g, '-');
    const labelPart = label.replace(/\s+/g, '-').toLowerCase();
    // Include parent path in ID to distinguish tabs from different nested contexts
    const parentPart = parentPath ? parentPath.replace(/\s+/g, '-').replace(/>/g, '').toLowerCase() : '';
    
    return `${contextPrefix}${routePart}-${labelPart}${parentPart ? '-' + parentPart : ''}`;
  }

  private generateTabTitle(itemLabel: string, menuType?: string, parentPath?: string): string {
    // For certain common item names, include context to avoid confusion
    const ambiguousNames = ['Overview', 'General', 'Reports', 'Settings', 'Permissions', 'Access Control', 'Chart Widgets', 'Data Widgets'];
    
    if (ambiguousNames.includes(itemLabel)) {
      // First priority: use parent path if available (for nested menu items)
      if (parentPath) {
        return `${parentPath} ${itemLabel}`;
      }
      // Second priority: use menu type context
      if (menuType) {
        const contextMap: { [key: string]: string } = {
          'dashboard': 'Dashboard',
          'users': 'User',
          'settings': 'System',
          'analytics': 'Analytics',
          'reports': 'Report',
          'home': 'Home',
          'projects': 'Project',
          'engineering': 'Engineering',
          'planning': 'Planning'
        };
        
        const contextName = contextMap[menuType] || menuType;
        return `${contextName} ${itemLabel}`;
      }
    }
    
    return itemLabel;
  }

  getCurrentActiveTab(): Tab | null {
    const currentTabs = this.tabs$.value;
    return currentTabs.find(t => t.isActive) || null;
  }

  getAllTabs(): Tab[] {
    return this.tabs$.value;
  }

  clearAllTabs(): void {
    this.tabs$.next([]);
    this.activeTabId$.next('');
  }
}