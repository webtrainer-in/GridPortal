import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { TabService } from '../../../core/services/tab.service';
import { Tab } from '../../../core/models/menu.model';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-tab-container',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './tab-container.html',
  styleUrl: './tab-container.scss'
})
export class TabContainerComponent implements OnInit, OnDestroy {
  tabs: Tab[] = [];
  activeTabId: string = '';
  undockedTabId: string | null = null;
  undockedTabTitle: string = '';
  isUndocked: boolean = false;
  private subscription = new Subscription();

  constructor(
    private tabService: TabService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.subscription.add(
      this.tabService.getTabs().subscribe(tabs => {
        this.tabs = tabs;
        // Check if we should open in maximized mode from URL parameter
        this.checkMaximizedMode();
      })
    );

    this.subscription.add(
      this.tabService.getActiveTabId().subscribe(activeTabId => {
        this.activeTabId = activeTabId;
        // Check maximized mode when active tab changes
        setTimeout(() => this.checkMaximizedMode(), 200);
      })
    );

    // Listen to router events to detect when URL changes
    this.subscription.add(
      this.router.events.pipe(
        filter(event => event instanceof NavigationEnd)
      ).subscribe(() => {
        this.checkMaximizedMode();
      })
    );

    // Check for maximized parameter on init
    this.checkMaximizedMode();
  }

  private checkMaximizedMode(): void {
    // Check if URL has 'maximized' query parameter
    const urlTree = this.router.parseUrl(this.router.url);
    const maximized = urlTree.queryParams['maximized'];
    
    if (maximized === 'true' && !this.isUndocked) {
      // Get the current route from URL (without query params)
      const currentRoute = this.router.url.split('?')[0];
      
      // Find tab by matching the current route
      let tab = this.tabs.find(t => t.route === currentRoute);
      
      // If no tab exists, create one for this route (for direct URL access)
      if (!tab && currentRoute) {
        // Extract title from route (e.g., /dashboard -> Dashboard, /users -> Users)
        const routeParts = currentRoute.split('/').filter(p => p);
        const tabTitle = routeParts.length > 0 
          ? routeParts[routeParts.length - 1].charAt(0).toUpperCase() + routeParts[routeParts.length - 1].slice(1)
          : 'Page';
        
        // Create a virtual tab for maximized mode (won't be added to tab service)
        tab = {
          id: currentRoute.replace(/\//g, '-'),
          title: tabTitle,
          route: currentRoute,
          icon: 'pi pi-window-maximize',
          isActive: true,
          canClose: false
        };
      }
      
      if (tab) {
        this.undockedTabId = tab.id;
        this.undockedTabTitle = tab.title;
        this.isUndocked = true;
        
        // Also set it as active tab if not already
        if (this.activeTabId !== tab.id) {
          this.activeTabId = tab.id;
        }
        
        // Remove the query parameter from URL after reading it
        this.router.navigate([], {
          queryParams: { maximized: null },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
      }
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  onTabClick(tabId: string): void {
    this.tabService.setActiveTab(tabId);
  }

  onTabClose(event: Event, tabId: string): void {
    event.stopPropagation(); // Prevent tab activation
    this.tabService.removeTab(tabId);
  }

  onTabMiddleClick(event: MouseEvent, tabId: string): void {
    if (event.button === 1) { // Middle mouse button
      event.preventDefault();
      this.tabService.removeTab(tabId);
    }
  }

  onTabUndock(event: MouseEvent, tab: Tab): void {
    event.stopPropagation(); // Prevent tab activation
    event.preventDefault(); // Prevent default behavior
    
    // Get the current URL base
    const baseUrl = window.location.origin;
    const fullUrl = `${baseUrl}${tab.route}?maximized=true`;
    
    // Check for modifier keys
    if (event.ctrlKey || event.metaKey) {
      // Ctrl+Click (or Cmd+Click on Mac): Open in new browser tab
      window.open(fullUrl, '_blank');
    } else if (event.shiftKey) {
      // Shift+Click: Open in new browser window
      const width = 1200;
      const height = 800;
      const left = (screen.width - width) / 2;
      const top = (screen.height - height) / 2;
      const features = `width=${width},height=${height},left=${left},top=${top},toolbar=yes,location=yes,menubar=yes,status=yes,resizable=yes,scrollbars=yes`;
      window.open(fullUrl, '_blank', features);
    } else {
      // Regular click: Maximize tab in current view
      this.undockedTabId = tab.id;
      this.undockedTabTitle = tab.title;
      this.isUndocked = true;
      this.tabService.setActiveTab(tab.id);
    }
  }

  onUndockClose(): void {
    this.isUndocked = false;
    this.undockedTabId = null;
    this.undockedTabTitle = '';
  }

  getUndockedTab(): Tab | undefined {
    return this.tabs.find(t => t.id === this.undockedTabId);
  }
}