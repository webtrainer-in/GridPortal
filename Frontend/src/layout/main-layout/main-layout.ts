import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header/header';
import { SidebarComponent } from '../sidebar/sidebar';
import { FooterComponent } from '../footer/footer';
import { TopMenuComponent } from '../top-menu/top-menu';
import { SecondaryPanelComponent } from '../secondary-panel/secondary-panel';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    HeaderComponent,
    SidebarComponent,
    FooterComponent,
    TopMenuComponent,
    SecondaryPanelComponent
  ],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss'
})
export class MainLayoutComponent {
  isSidebarOpen = true;
  isSecondaryPanelOpen = false;
  selectedMenuItem: string | null = null;
  secondaryPanelWidth = 280;

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  onSidebarToggle() {
    this.toggleSidebar();
  }

  onSecondaryPanelToggle(event: {isOpen: boolean, menuId: string | null}) {
    this.isSecondaryPanelOpen = event.isOpen;
    this.selectedMenuItem = event.menuId;
  }
  
  onSecondaryPanelClose() {
    this.isSecondaryPanelOpen = false;
    this.selectedMenuItem = null;
  }

  onSecondaryPanelWidthChange(width: number) {
    this.secondaryPanelWidth = width;
  }
}