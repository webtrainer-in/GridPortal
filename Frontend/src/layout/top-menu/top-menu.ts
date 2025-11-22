import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuModule } from 'primeng/menu';
import { MenubarModule } from 'primeng/menubar';
import { ButtonModule } from 'primeng/button';
import { TopBarModeService, TopBarMode } from '../../core/services/top-bar-mode.service';
import { TopBarMenuItem } from '../../core/services/top-bar-config-loader.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-top-menu',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MenuModule,
    MenubarModule,
    ButtonModule
  ],
  templateUrl: './top-menu.html',
  styleUrl: './top-menu.scss'
})
export class TopMenuComponent implements OnInit, OnDestroy {
  currentMode: TopBarMode = 'dropdown';
  selectedMenu: string | null = null;
  menuItems: TopBarMenuItem[] = [];
  private subscription = new Subscription();
  
  constructor(private topBarModeService: TopBarModeService) {}
  
  ngOnInit(): void {
    // Load menu items from configuration
    this.subscription.add(
      this.topBarModeService.getMenuItems().subscribe(items => {
        this.menuItems = items;
      })
    );
    
    // Subscribe to mode changes
    this.subscription.add(
      this.topBarModeService.mode$.subscribe(mode => {
        console.log('Top bar mode changed to:', mode, 'Previous selected menu:', this.selectedMenu);
        this.currentMode = mode;
        // Close any open menus when switching modes
        this.selectedMenu = null;
        console.log('Reset selected menu to null');
      })
    );
  }
  
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
  
  toggleMode(): void {
    this.topBarModeService.toggleMode();
  }
  
  onMenuClick(menuId: string): void {
    console.log('Menu clicked:', menuId, 'Current mode:', this.currentMode, 'Currently selected:', this.selectedMenu);
    
    if (this.currentMode === 'ribbon') {
      // In ribbon mode, toggle the selected menu
      if (this.selectedMenu === menuId) {
        this.selectedMenu = null;
        console.log('Closing ribbon menu:', menuId);
      } else {
        this.selectedMenu = menuId;
        console.log('Opening ribbon menu:', menuId);
      }
    } else {
      // In dropdown mode, toggle the selected menu
      if (this.selectedMenu === menuId) {
        this.selectedMenu = null;
        console.log('Closing dropdown menu:', menuId);
      } else {
        this.selectedMenu = menuId;
        console.log('Opening dropdown menu:', menuId);
      }
    }
  }
  
  onMenuAction(action: string): void {
    console.log('Action triggered:', action);
    // Implement actual actions here
    
    // Close ribbon after action in ribbon mode
    if (this.currentMode === 'ribbon') {
      this.selectedMenu = null;
    }
  }
  
  onDropdownAction(action: string): void {
    console.log('Dropdown action triggered:', action);
    // Implement actual actions here
    
    // Close dropdown after action
    this.selectedMenu = null;
  }
}