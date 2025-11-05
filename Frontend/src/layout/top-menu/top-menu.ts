import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuModule } from 'primeng/menu';
import { MenubarModule } from 'primeng/menubar';
import { ButtonModule } from 'primeng/button';
import { MenuItem } from 'primeng/api';

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
export class TopMenuComponent {
  selectedMenu: string | null = 'file'; // Default to 'file' menu being visible
  
  topMenuItems: any[] = [
    {
      id: 'file',
      label: 'File',
      icon: 'pi pi-file',
      subItems: [
        { label: 'New', icon: 'pi pi-plus', routerLink: '/new' },
        { label: 'Open', icon: 'pi pi-folder-open', routerLink: '/open' },
        { label: 'Save', icon: 'pi pi-save', routerLink: '/save' },
        { label: 'Export', icon: 'pi pi-download', routerLink: '/export' }
      ]
    },
    {
      id: 'edit',
      label: 'Edit',
      icon: 'pi pi-pencil',
      subItems: [
        { label: 'Copy', icon: 'pi pi-copy', routerLink: '/copy' },
        { label: 'Paste', icon: 'pi pi-clone', routerLink: '/paste' },
        { label: 'Delete', icon: 'pi pi-trash', routerLink: '/delete' },
        { label: 'Undo', icon: 'pi pi-undo', routerLink: '/undo' }
      ]
    },
    {
      id: 'view',
      label: 'View',
      icon: 'pi pi-eye',
      subItems: [
        { label: 'Grid View', icon: 'pi pi-th-large', routerLink: '/grid' },
        { label: 'List View', icon: 'pi pi-list', routerLink: '/list' },
        { label: 'Card View', icon: 'pi pi-id-card', routerLink: '/cards' },
        { label: 'Timeline', icon: 'pi pi-calendar', routerLink: '/timeline' }
      ]
    },
    {
      id: 'tools',
      label: 'Tools',
      icon: 'pi pi-wrench',
      subItems: [
        { label: 'Import Data', icon: 'pi pi-upload', routerLink: '/import' },
        { label: 'Export Data', icon: 'pi pi-download', routerLink: '/export-data' },
        { label: 'Backup', icon: 'pi pi-cloud', routerLink: '/backup' },
        { label: 'Settings', icon: 'pi pi-cog', routerLink: '/settings' }
      ]
    },
    {
      id: 'help',
      label: 'Help',
      icon: 'pi pi-question-circle',
      subItems: [
        { label: 'Documentation', icon: 'pi pi-book', routerLink: '/docs' },
        { label: 'Tutorials', icon: 'pi pi-video', routerLink: '/tutorials' },
        { label: 'Support', icon: 'pi pi-phone', routerLink: '/support' },
        { label: 'About', icon: 'pi pi-info-circle', routerLink: '/about' }
      ]
    }
  ];

  onMenuClick(menuId: string) {
    this.selectedMenu = this.selectedMenu === menuId ? null : menuId;
  }

  onSubItemClick() {
    // Keep ribbon open when sub-item is clicked - removed auto-close behavior
  }
}