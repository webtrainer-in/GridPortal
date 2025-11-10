import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges, ElementRef, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PanelDragService, PanelPosition } from '../../core/services/panel-drag.service';
import { TabService } from '../../core/services/tab.service';
import { MenuDataService } from '../../core/services/menu-data.service';
import { TabMenuData, MenuItem } from '../../core/models/tab.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-secondary-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './secondary-panel.html',
  styleUrl: './secondary-panel.scss'
})
export class SecondaryPanelComponent implements OnInit, OnDestroy, OnChanges {
  @Input() isOpen = false;
  @Input() selectedMenuItem: string | null = null;
  @Output() panelClose = new EventEmitter<void>();
  @Output() widthChange = new EventEmitter<number>();
  
  panelPosition: PanelPosition = 'next-to-sidebar';
  activeTab = 'main'; // Default to main tab
  panelWidth = 280; // Default width
  minWidth = 200;
  maxWidth = 600;
  isResizing = false;
  isCtrlPressed = false;

  private subscription = new Subscription();
  private boundAdjustForScreenSize = this.adjustForScreenSize.bind(this);
  private boundHandleKeyDown = this.handleKeyDown.bind(this);
  private boundHandleKeyUp = this.handleKeyUp.bind(this);
  
  // Cache for menu data
  private menuContentCache: MenuItem[] = [];
  private userInfoContentCache: MenuItem[] = [];
  private permissionContentCache: MenuItem[] = [];
  
  constructor(
    private panelDragService: PanelDragService, 
    private router: Router, 
    private tabService: TabService,
    private menuDataService: MenuDataService
  ) {}
  
  ngOnInit(): void {
    this.loadSavedWidth();
    this.adjustForScreenSize();
    this.widthChange.emit(this.panelWidth);
    
    this.subscription.add(
      this.panelDragService.position$.subscribe(position => {
        this.panelPosition = position;
      })
    );
    
    // Listen for window resize to adjust panel width on mobile
    window.addEventListener('resize', this.boundAdjustForScreenSize);
    
    // Listen for Ctrl key events
    window.addEventListener('keydown', this.boundHandleKeyDown);
    window.addEventListener('keyup', this.boundHandleKeyUp);
    
    // Load initial menu data
    this.loadMenuData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedMenuItem'] && !changes['selectedMenuItem'].firstChange) {
      // Reset to main tab when selectedMenuItem changes
      this.activeTab = 'main';
      // Reload menu data for new selected menu item
      this.loadMenuData();
    }
  }
  
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    window.removeEventListener('resize', this.boundAdjustForScreenSize);
    window.removeEventListener('keydown', this.boundHandleKeyDown);
    window.removeEventListener('keyup', this.boundHandleKeyUp);
  }
  
  private loadMenuData(): void {
    if (!this.selectedMenuItem) {
      this.menuContentCache = [];
      this.userInfoContentCache = [];
      this.permissionContentCache = [];
      return;
    }

    // Load main menu content
    this.subscription.add(
      this.menuDataService.getMenuContent(this.selectedMenuItem).subscribe(data => {
        this.menuContentCache = data;
      })
    );

    // Load user info content
    this.subscription.add(
      this.menuDataService.getUserInfoContent(this.selectedMenuItem).subscribe(data => {
        this.userInfoContentCache = data;
      })
    );

    // Load permission content
    this.subscription.add(
      this.menuDataService.getPermissionContent(this.selectedMenuItem).subscribe(data => {
        this.permissionContentCache = data;
      })
    );
  }
  
  togglePosition(): void {
    this.panelDragService.togglePosition();
  }
  
  closePanel(): void {
    this.panelClose.emit();
  }

  onMenuItemClick(item: MenuItem, event?: MouseEvent): void {
    // Handle Ctrl+click to create tabs
    if (event && (event.ctrlKey || event.metaKey)) {
      // First, check if we need to initialize the main menu tab
      const currentTabs = this.tabService.getAllTabs();
      if (currentTabs.length === 0 && this.selectedMenuItem) {
        // Initialize the main menu tab based on the currently selected sidebar menu
        const mainMenuData = this.getMainMenuTabData();
        if (mainMenuData) {
          this.tabService.initializeMainMenuTab(
            mainMenuData.id,
            mainMenuData.label,
            mainMenuData.route,
            mainMenuData.icon
          );
        }
      }

      // Then create the tab for the clicked item
      const menuData: TabMenuData = {
        menuType: this.selectedMenuItem || 'general',
        itemLabel: item.label,
        route: item.route || '/dashboard',
        icon: item.icon
      };
      this.tabService.openMenuItemInNewTab(menuData);
      return;
    }

    // Regular click: Navigate in same panel without creating tabs
    const route = item.route;
    if (route) {
      console.log('Navigating to route:', route);
      const menuData: TabMenuData = {
        menuType: this.selectedMenuItem || 'general',
        itemLabel: item.label,
        route: route,
        icon: item.icon
      };
      this.tabService.openMenuItemInSamePanel(menuData);
    }
  }

  private getMainMenuTabData(): { id: string; label: string; route: string; icon: string } | null {
    // Map of main menu items with their data
    const mainMenuMap: { [key: string]: { id: string; label: string; route: string; icon: string } } = {
      'dashboard': { id: 'dashboard', label: 'Dashboard', route: '/dashboard', icon: 'pi pi-home' },
      'users': { id: 'users', label: 'Users', route: '/users', icon: 'pi pi-users' },
      'settings': { id: 'settings', label: 'Settings', route: '/settings', icon: 'pi pi-cog' },
      'analytics': { id: 'analytics', label: 'Analytics', route: '/analytics', icon: 'pi pi-chart-bar' },
      'reports': { id: 'reports', label: 'Reports', route: '/reports', icon: 'pi pi-file-pdf' }
    };

    return this.selectedMenuItem ? mainMenuMap[this.selectedMenuItem] || null : null;
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.ctrlKey) {
      this.isCtrlPressed = true;
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    if (!event.ctrlKey) {
      this.isCtrlPressed = false;
    }
  }

  onResizeStart(event: MouseEvent): void {
    this.isResizing = true;
    event.preventDefault();
    
    const startX = event.clientX;
    const startWidth = this.panelWidth;
    
    const onMouseMove = (e: MouseEvent) => {
      if (!this.isResizing) return;
      
      let newWidth: number;
      if (this.panelPosition === 'far-right') {
        // For far-right position, dragging left increases width
        newWidth = startWidth + (startX - e.clientX);
      } else {
        // For next-to-sidebar position, dragging right increases width
        newWidth = startWidth + (e.clientX - startX);
      }
      
      // Clamp width between min and max
      newWidth = Math.max(this.minWidth, Math.min(this.maxWidth, newWidth));
      this.panelWidth = newWidth;
      this.widthChange.emit(this.panelWidth);
    };
    
    const onMouseUp = () => {
      this.isResizing = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      
      // Save width to localStorage
      localStorage.setItem('secondary-panel-width', this.panelWidth.toString());
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  loadSavedWidth(): void {
    const savedWidth = localStorage.getItem('secondary-panel-width');
    if (savedWidth) {
      const width = parseInt(savedWidth, 10);
      if (width >= this.minWidth && width <= this.maxWidth) {
        this.panelWidth = width;
      }
    }
  }

  adjustForScreenSize(): void {
    const screenWidth = window.innerWidth;
    
    if (screenWidth <= 768) {
      // Mobile: limit panel width to 80% of screen width
      const maxMobileWidth = Math.floor(screenWidth * 0.8);
      if (this.panelWidth > maxMobileWidth) {
        this.panelWidth = Math.max(this.minWidth, maxMobileWidth);
        this.widthChange.emit(this.panelWidth);
      }
    }
  }

  setActiveTab(tabId: string): void {
    this.activeTab = tabId;
  }

  shouldShowTabs(): boolean {
    return this.selectedMenuItem === 'users' || this.selectedMenuItem === 'reports';
  }

  getTabs(): any[] {
    if (this.selectedMenuItem === 'users') {
      return [
        { id: 'main', label: 'User Management', icon: 'pi pi-users' },
        { id: 'user-info', label: 'User Info', icon: 'pi pi-info-circle' },
        { id: 'permission', label: 'User Permission', icon: 'pi pi-key' }
      ];
    }

    if (this.selectedMenuItem === 'reports') {
      return [
        { id: 'main', label: 'Report Management', icon: 'pi pi-file-edit' },
        { id: 'user-info', label: 'Report Info', icon: 'pi pi-info-circle' },
        { id: 'permission', label: 'Report Permission', icon: 'pi pi-key' }
      ];
    }    
    return [];
  }

  getMenuTitle(): string {
    switch (this.selectedMenuItem) {
      case 'dashboard':
        return 'Dashboard Explorer';
      case 'users':
        return 'User Management';
      case 'settings':
        return 'Settings Panel';
      case 'analytics':
        return 'Analytics Tools';
      case 'reports':
        return 'Reports Explorer';
      default:
        return 'Explorer';
    }
  }

  getMenuContent(): MenuItem[] {
    return this.menuContentCache;
  }

  getUserInfoContent(): MenuItem[] {
    return this.userInfoContentCache;
  }

  getPermissionContent(): MenuItem[] {
    return this.permissionContentCache;
  }
}