import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuModule } from 'primeng/menu';
import { MenubarModule } from 'primeng/menubar';
import { ButtonModule } from 'primeng/button';
import { TopBarModeService, TopBarMode, MenuItem } from '../../core/services/top-bar-mode.service';
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
  menuItems: MenuItem[] = [];
  private subscription = new Subscription();
  
  constructor(private topBarModeService: TopBarModeService) {}
  
  ngOnInit(): void {
    this.menuItems = this.topBarModeService.getMenuItems();
    
    this.subscription.add(
      this.topBarModeService.mode$.subscribe(mode => {
        this.currentMode = mode;
        // Close any open menus when switching modes
        this.selectedMenu = null;
        
        // Open File menu by default when switching to ribbon mode
        if (mode === 'ribbon') {
          setTimeout(() => {
            this.selectedMenu = 'file';
          }, 100);
        }
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
    if (this.currentMode === 'ribbon') {
      // In ribbon mode, toggle the selected menu
      this.selectedMenu = this.selectedMenu === menuId ? null : menuId;
    } else {
      // In dropdown mode, handle dropdown behavior
      this.selectedMenu = this.selectedMenu === menuId ? null : menuId;
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