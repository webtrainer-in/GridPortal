import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { TopBarConfigLoaderService, TopBarMenuItem } from './top-bar-config-loader.service';

export type TopBarMode = 'dropdown' | 'ribbon';

/**
 * Service that manages top bar mode (dropdown/ribbon) and loads menu configuration
 * 
 * Responsibilities:
 * 1. Manage top bar display mode (dropdown or ribbon)
 * 2. Persist mode preference to localStorage
 * 3. Load menu items from configuration via TopBarConfigLoaderService
 * 4. Provide reactive streams for mode changes
 */
@Injectable({
  providedIn: 'root'
})
export class TopBarModeService {
  private readonly STORAGE_KEY = 'top-bar-mode';
  private modeSubject = new BehaviorSubject<TopBarMode>('dropdown');
  
  public mode$ = this.modeSubject.asObservable();
  
  constructor(private configLoader: TopBarConfigLoaderService) {
    // Load saved mode from localStorage
    const savedMode = localStorage.getItem(this.STORAGE_KEY) as TopBarMode;
    if (savedMode && (savedMode === 'dropdown' || savedMode === 'ribbon')) {
      this.modeSubject.next(savedMode);
    }
  }
  
  setMode(mode: TopBarMode): void {
    this.modeSubject.next(mode);
    localStorage.setItem(this.STORAGE_KEY, mode);
  }
  
  getCurrentMode(): TopBarMode {
    return this.modeSubject.value;
  }
  
  toggleMode(): void {
    const currentMode = this.getCurrentMode();
    const newMode: TopBarMode = currentMode === 'dropdown' ? 'ribbon' : 'dropdown';
    this.setMode(newMode);
  }
  
  /**
   * Load menu items from configuration
   * Returns an Observable of the menu items array
   * Data is loaded from menu-config.json via TopBarConfigLoaderService
   */
  getMenuItems(): Observable<TopBarMenuItem[]> {
    return this.configLoader.getTopBarMenus();
  }
}
