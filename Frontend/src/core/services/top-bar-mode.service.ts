import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type TopBarMode = 'dropdown' | 'ribbon';

export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  children?: SubMenuItem[];
  ribbonItems?: RibbonItem[];
}

export interface SubMenuItem {
  id: string;
  label: string;
  icon?: string;
  action?: string;
  separator?: boolean;
}

export interface RibbonItem {
  id: string;
  label: string;
  icon: string;
  action?: string;
  type: 'button' | 'dropdown' | 'toggle';
  group?: string;
  size?: 'small' | 'large';
}

@Injectable({
  providedIn: 'root'
})
export class TopBarModeService {
  private readonly STORAGE_KEY = 'top-bar-mode';
  private modeSubject = new BehaviorSubject<TopBarMode>('dropdown');
  
  public mode$ = this.modeSubject.asObservable();
  
  constructor() {
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
  
  getMenuItems(): MenuItem[] {
    return [
      {
        id: 'file',
        label: 'File',
        icon: 'pi pi-file',
        children: [
          { id: 'new', label: 'New', icon: 'pi pi-plus', action: 'new' },
          { id: 'open', label: 'Open', icon: 'pi pi-folder-open', action: 'open' },
          { id: 'save', label: 'Save', icon: 'pi pi-save', action: 'save' },
          { id: 'separator1', label: '', separator: true },
          { id: 'export', label: 'Export', icon: 'pi pi-download', action: 'export' }
        ],
        ribbonItems: [
          { id: 'new', label: 'New', icon: 'pi pi-plus', type: 'button', group: 'file', size: 'large' },
          { id: 'open', label: 'Open', icon: 'pi pi-folder-open', type: 'button', group: 'file', size: 'large' },
          { id: 'save', label: 'Save', icon: 'pi pi-save', type: 'button', group: 'file', size: 'large' },
          { id: 'export', label: 'Export', icon: 'pi pi-download', type: 'button', group: 'file', size: 'large' }
        ]
      },
      {
        id: 'edit',
        label: 'Edit',
        icon: 'pi pi-pencil',
        children: [
          { id: 'cut', label: 'Cut', icon: 'pi pi-times', action: 'cut' },
          { id: 'copy', label: 'Copy', icon: 'pi pi-copy', action: 'copy' },
          { id: 'paste', label: 'Paste', icon: 'pi pi-plus', action: 'paste' },
          { id: 'separator2', label: '', separator: true },
          { id: 'undo', label: 'Undo', icon: 'pi pi-undo', action: 'undo' },
          { id: 'redo', label: 'Redo', icon: 'pi pi-refresh', action: 'redo' }
        ],
        ribbonItems: [
          { id: 'cut', label: 'Cut', icon: 'pi pi-times', type: 'button', group: 'clipboard', size: 'small' },
          { id: 'copy', label: 'Copy', icon: 'pi pi-copy', type: 'button', group: 'clipboard', size: 'small' },
          { id: 'paste', label: 'Paste', icon: 'pi pi-plus', type: 'button', group: 'clipboard', size: 'small' },
          { id: 'undo', label: 'Undo', icon: 'pi pi-undo', type: 'button', group: 'history', size: 'small' },
          { id: 'redo', label: 'Redo', icon: 'pi pi-refresh', type: 'button', group: 'history', size: 'small' }
        ]
      },
      {
        id: 'view',
        label: 'View',
        icon: 'pi pi-eye',
        children: [
          { id: 'zoom-in', label: 'Zoom In', icon: 'pi pi-plus', action: 'zoom-in' },
          { id: 'zoom-out', label: 'Zoom Out', icon: 'pi pi-minus', action: 'zoom-out' },
          { id: 'fit-screen', label: 'Fit to Screen', icon: 'pi pi-expand', action: 'fit-screen' },
          { id: 'separator3', label: '', separator: true },
          { id: 'grid', label: 'Show Grid', icon: 'pi pi-th-large', action: 'toggle-grid' }
        ],
        ribbonItems: [
          { id: 'zoom-in', label: 'Zoom In', icon: 'pi pi-plus', type: 'button', group: 'zoom', size: 'small' },
          { id: 'zoom-out', label: 'Zoom Out', icon: 'pi pi-minus', type: 'button', group: 'zoom', size: 'small' },
          { id: 'fit-screen', label: 'Fit Screen', icon: 'pi pi-expand', type: 'button', group: 'zoom', size: 'small' },
          { id: 'grid', label: 'Grid', icon: 'pi pi-th-large', type: 'toggle', group: 'display', size: 'small' }
        ]
      },
      {
        id: 'tools',
        label: 'Tools',
        icon: 'pi pi-cog',
        children: [
          { id: 'settings', label: 'Settings', icon: 'pi pi-cog', action: 'settings' },
          { id: 'preferences', label: 'Preferences', icon: 'pi pi-sliders-h', action: 'preferences' },
          { id: 'plugins', label: 'Plugins', icon: 'pi pi-star', action: 'plugins' }
        ],
        ribbonItems: [
          { id: 'settings', label: 'Settings', icon: 'pi pi-cog', type: 'button', group: 'configure', size: 'large' },
          { id: 'preferences', label: 'Preferences', icon: 'pi pi-sliders-h', type: 'button', group: 'configure', size: 'small' },
          { id: 'plugins', label: 'Plugins', icon: 'pi pi-star', type: 'button', group: 'configure', size: 'small' }
        ]
      },
      {
        id: 'help',
        label: 'Help',
        icon: 'pi pi-question-circle',
        children: [
          { id: 'documentation', label: 'Documentation', icon: 'pi pi-file', action: 'docs' },
          { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: 'pi pi-key', action: 'shortcuts' },
          { id: 'about', label: 'About', icon: 'pi pi-info-circle', action: 'about' }
        ],
        ribbonItems: [
          { id: 'documentation', label: 'Docs', icon: 'pi pi-file', type: 'button', group: 'support', size: 'large' },
          { id: 'shortcuts', label: 'Shortcuts', icon: 'pi pi-key', type: 'button', group: 'support', size: 'small' },
          { id: 'about', label: 'About', icon: 'pi pi-info-circle', type: 'button', group: 'support', size: 'small' }
        ]
      }
    ];
  }
}