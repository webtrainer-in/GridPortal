import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { MessageService } from 'primeng/api';
import { DrillDownService } from '../../../core/services/drill-down.service';

interface LinkConfig {
  enabled: boolean;
  routePath: string | null;
  openInNewTab: boolean;
  params: Array<{
    name: string;
    fields: string[];
    separator?: string;
  }>;
  drillDown?: {
    enabled: boolean;
    targetProcedure: string;
    filterParams: Array<{
      targetColumn: string;
      sourceFields: string[];
      separator?: string;
    }>;
    breadcrumbLabel: string;
    allowMultipleLevels: boolean;
    maxDepth: number;
  };
}

@Component({
  selector: 'app-link-cell-renderer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <a *ngIf="isLinkEnabled" 
       [routerLink]="routePath" 
       [queryParams]="queryParams"
       [target]="target"
       [attr.rel]="target === '_blank' ? 'noopener noreferrer' : null"
       class="grid-link"
       (click)="onClick($event)">
      {{ displayValue }}
    </a>
    <span *ngIf="!isLinkEnabled" class="grid-text">
      {{ displayValue }}
    </span>
  `,
  styles: [`
    .grid-link {
      color: #1976d2;
      text-decoration: underline;
      cursor: pointer;
      font-weight: 500;
    }
    
    .grid-link:hover {
      color: #1565c0;
      text-decoration: underline;
    }
    
    .grid-link:visited {
      color: #7b1fa2;
    }
    
    .grid-text {
      color: inherit;
    }
  `]
})
export class LinkCellRendererComponent implements ICellRendererAngularComp {
  private params!: ICellRendererParams & {
    linkConfig?: LinkConfig;
  };
  
  displayValue: any;
  isLinkEnabled: boolean = false;
  routePath: string = '';
  queryParams: Record<string, any> = {};
  target: string = '_self';

  constructor(
    private router: Router,
    private messageService: MessageService,
    private drillDownService: DrillDownService
  ) {}

  agInit(params: any): void {
    this.params = params;
    this.displayValue = params.value;
    this.processLinkConfig();
  }

  refresh(params: any): boolean {
    this.params = params;
    this.displayValue = params.value;
    this.processLinkConfig();
    return true;
  }

  private processLinkConfig(): void {
    const linkConfig = this.params.linkConfig;
    
    if (!linkConfig || !linkConfig.enabled) {
      this.isLinkEnabled = false;
      return;
    }

    // Check if drill-down mode (routePath is null)
    if (!linkConfig.routePath && linkConfig.drillDown?.enabled) {
      // Drill-down mode - link will be handled in onClick
      this.isLinkEnabled = true;
      this.routePath = '#';  // Placeholder for template
      return;
    }

    // Navigation mode - build query parameters
    this.queryParams = this.buildQueryParams(linkConfig);
    
    // Set route path and target
    this.routePath = linkConfig.routePath || '';
    this.target = linkConfig.openInNewTab ? '_blank' : '_self';
    this.isLinkEnabled = true;
  }

  private buildQueryParams(linkConfig: LinkConfig): Record<string, any> {
    const params: Record<string, any> = {};
    const rowData = this.params.data;

    for (const param of linkConfig.params) {
      const values: any[] = [];
      
      // Collect values from specified fields
      for (const field of param.fields) {
        const value = rowData[field];
        if (value !== null && value !== undefined) {
          values.push(value);
        }
      }

      // Skip parameter if no values (null param strategy)
      if (values.length === 0) {
        continue;
      }

      // Build parameter value
      if (values.length === 1) {
        params[param.name] = values[0];
      } else if (param.separator) {
        params[param.name] = values.join(param.separator);
      } else {
        params[param.name] = values.join('_'); // Default separator
      }
    }

    return params;
  }

  onClick(event: MouseEvent): void {
    try {
      const linkConfig = this.params.linkConfig;
      
      // Check if drill-down mode (routePath is null)
      if (linkConfig && linkConfig.drillDown?.enabled && !linkConfig.routePath) {
        event.preventDefault();
        this.handleDrillDown(linkConfig.drillDown, this.params.data);
        return;
      }

      // Support Ctrl/Cmd+Click to open in new tab (navigation mode)
      if (event.ctrlKey || event.metaKey) {
        const url = this.buildFullUrl();
        window.open(url, '_blank', 'noopener,noreferrer');
        event.preventDefault();
        return;
      }

      // Let Angular router handle normal navigation
      // Error handling will be done by router error handler
    } catch (error) {
      console.error('Link navigation error:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Navigation Error',
        detail: 'Unable to navigate to the requested page. Please contact your administrator.',
        life: 5000
      });
      event.preventDefault();
    }
  }

  private handleDrillDown(config: any, rowData: any): void {
    // Get current procedure name from params (passed from grid)
    const baseProcedure = (this.params as any).baseProcedure || 'sp_Grid_Buses';
    
    this.drillDownService.drillDown(config, rowData, baseProcedure);
  }

  private buildFullUrl(): string {
    const queryString = Object.entries(this.queryParams)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
    
    return `${this.routePath}${queryString ? '?' + queryString : ''}`;
  }
}
