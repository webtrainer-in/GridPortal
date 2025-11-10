import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Tab, TabMenuData } from '../models/tab.model';
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
      this.router.navigate([activeTab.route]);
    }
  }

  openMenuItemInNewTab(menuData: TabMenuData): void {
    const tabId = this.generateTabId(menuData.route, menuData.itemLabel, menuData.menuType);
    const tabTitle = this.generateTabTitle(menuData.itemLabel, menuData.menuType);
    
    const tab: Tab = {
      id: tabId,
      title: tabTitle,
      route: menuData.route,
      icon: menuData.icon || 'pi pi-file',
      isActive: true,
      canClose: true,
      data: menuData
    };
    
    this.addTab(tab);
  }

  openMenuItemInSamePanel(menuData: TabMenuData): void {
    // Just navigate to the route without creating a new tab
    this.router.navigate([menuData.route]);
  }

  initializeMainMenuTab(menuId: string, label: string, route: string, icon: string): void {
    // Initialize or activate main menu tab (non-closable)
    const tab: Tab = {
      id: menuId,
      title: label,
      route: route,
      icon: icon,
      isActive: true,
      canClose: false
    };
    
    this.addTab(tab);
  }

  private generateTabId(route: string, label: string, menuType?: string): string {
    // Include menu context to make tab IDs unique across different menu contexts
    const contextPrefix = menuType ? `${menuType}-` : '';
    const routePart = route.replace(/\//g, '-');
    const labelPart = label.replace(/\s+/g, '-').toLowerCase();
    
    return `${contextPrefix}${routePart}-${labelPart}`;
  }

  private generateTabTitle(itemLabel: string, menuType?: string): string {
    // For certain common item names, include context to avoid confusion
    const ambiguousNames = ['Overview', 'General', 'Reports', 'Settings', 'Permissions', 'Access Control'];
    
    if (ambiguousNames.includes(itemLabel) && menuType) {
      const contextMap: { [key: string]: string } = {
        'dashboard': 'Dashboard',
        'users': 'User',
        'settings': 'System',
        'analytics': 'Analytics',
        'reports': 'Report'
      };
      
      const contextName = contextMap[menuType] || menuType;
      return `${contextName} ${itemLabel}`;
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
}