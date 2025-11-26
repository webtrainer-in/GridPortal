import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges, ElementRef, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PanelDragService, PanelPosition } from '../../core/services/panel-drag.service';
import { TabService } from '../../core/services/tab.service';
import { MenuDataService } from '../../core/services/menu-data.service';
import { TabMenuData, MenuItem, TabConfig } from '../../core/models/menu.model';
import { RecursiveMenuTreeComponent } from './recursive-menu-tree';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-secondary-panel',
  standalone: true,
  imports: [CommonModule, RecursiveMenuTreeComponent],
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
  expandedMenuItems: Set<string> = new Set(); // Track expanded menu items

  private subscription = new Subscription();
  private boundAdjustForScreenSize = this.adjustForScreenSize.bind(this);
  private boundHandleKeyDown = this.handleKeyDown.bind(this);
  private boundHandleKeyUp = this.handleKeyUp.bind(this);
  
  // Cache for ALL tab content (generic instead of hardcoded 3 tabs)
  private tabContentCache: { [tabId: string]: MenuItem[] } = {};
  
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
      this.tabContentCache = {};
      return;
    }

    // Clear cache before loading new menu data to prevent stale content
    this.tabContentCache = {};

    // Get all tabs for this menu
    const tabs = this.menuDataService.getTabsForMenu(this.selectedMenuItem);
    
    // Load content for each tab
    tabs.forEach(tab => {
      this.subscription.add(
        this.menuDataService.getTabContent(this.selectedMenuItem!, tab.id).subscribe(data => {
          this.tabContentCache[tab.id] = data;
        })
      );
    });
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
        // Get menu items to find the corresponding item with routing info
        this.menuDataService.getMenuItems().subscribe(menuItems => {
          const mainMenuItem = menuItems.find(item => item.id === this.selectedMenuItem);
          if (mainMenuItem && mainMenuItem.routerLink) {
            this.tabService.initializeMainMenuTab(
              mainMenuItem.id,
              mainMenuItem.label,
              mainMenuItem.routerLink,
              mainMenuItem.icon
            );
          }
        });
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

  /**
   * Handle toggle expand for menu items
   * Called when user clicks the expand/collapse button on a folder
   */
  onToggleMenuExpand(item: MenuItem): void {
    // Generate unique key for this item based on its label
    const itemKey = item.label;
    
    // Toggle expanded state
    if (this.expandedMenuItems.has(itemKey)) {
      this.expandedMenuItems.delete(itemKey);
    } else {
      this.expandedMenuItems.add(itemKey);
    }
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
    if (!this.selectedMenuItem) {
      return false;
    }
    return this.menuDataService.hasTabsForMenu(this.selectedMenuItem);
  }

  getTabs(): TabConfig[] {
    if (!this.selectedMenuItem) {
      return [];
    }
    return this.menuDataService.getTabsForMenu(this.selectedMenuItem);
  }

  getMenuTitle(): string {
    if (!this.selectedMenuItem) {
      return 'Explorer';
    }
    return this.menuDataService.getMenuDisplayTitle(this.selectedMenuItem);
  }

  /**
   * Get content for the active tab
   * This is generic and works for any tab ID
   */
  getActiveTabContent(): MenuItem[] {
    return this.tabContentCache[this.activeTab] || [];
  }

  /**
   * Get content for a specific tab by ID
   * This is generic and works for any tab ID
   */
  getTabContentById(tabId: string): MenuItem[] {
    return this.tabContentCache[tabId] || [];
  }
}