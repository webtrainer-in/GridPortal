import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { DropdownOption } from '../../../core/services/dynamic-grid.service';

@Component({
  selector: 'app-editable-cell-renderer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isEditing) {
      @if (isDropdown) {
        <!-- Dropdown Editor -->
        <select 
          class="cell-select"
          [(ngModel)]="value"
          (ngModelChange)="onDropdownChange()"
          (blur)="onValueChange()"
        >
          @if (isLoadingDropdown) {
            <option value="">Loading...</option>
          } @else if (dropdownOptions.length === 0) {
            <option value="">No options available</option>
          } @else {
            <option value="">-- Select --</option>
            @for (option of dropdownOptions; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          }
        </select>
      } @else {
        <!-- Text/Number/Date Input -->
        <input 
          class="cell-input"
          [type]="inputType"
          [(ngModel)]="value"
          (ngModelChange)="onValueChange()"
          (blur)="onValueChange()"
          (keydown.enter)="onValueChange()"
          (keydown.tab)="onValueChange()"
        />
      }
    } @else {
      <!-- Display Mode -->
      @if (hasLink) {
        <!-- Show as clickable link -->
        <a class="cell-link" [href]="linkUrl" (click)="onLinkClick($event)">{{ displayValue }}</a>
      } @else {
        <!-- Show as plain text -->
        <span class="cell-value">{{ displayValue }}</span>
      }
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    
    .cell-input, .cell-select {
      width: 100%;
      height: 100%;
      border: 1px solid #4CAF50;
      border-radius: 4px;
      padding: 8px;
      font-size: 14px;
      font-family: inherit;
      box-sizing: border-box;
      background: white;
      margin: 0;
    }
    
    .cell-input:focus, .cell-select:focus {
      outline: none;
      border-color: #45a049;
      box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
    }
    
    .cell-select:disabled {
      background-color: #f5f5f5;
      cursor: not-allowed;
    }
    
    .cell-value {
      display: block;
      padding: 8px;
      font-size: 14px;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
    }
    
    .cell-link {
      display: block;
      padding: 8px;
      font-size: 14px;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      color: #2196F3;
      text-decoration: none;
      cursor: pointer;
    }
    
    .cell-link:hover {
      text-decoration: underline;
      color: #1976D2;
    }
  `]
})
export class EditableCellRendererComponent implements ICellRendererAngularComp {
  private params!: ICellRendererParams & {
    isEditing: (rowData: any) => boolean;
    columnType?: string;
    linkConfig?: any;
    dropdownConfig?: any;
    loadDropdownValues?: (field: string, rowContext: any) => Promise<DropdownOption[]>;
    onCascadingChange?: (field: string, value: any, rowData: any) => void;
  };
  
  value: any;
  isEditing: boolean = false;
  inputType: string = 'text';
  displayValue: any;
  
  // Link-specific properties
  hasLink: boolean = false;
  linkUrl: string = '#';
  
  // Dropdown-specific properties
  isDropdown: boolean = false;
  dropdownOptions: DropdownOption[] = [];
  isLoadingDropdown: boolean = false;

  constructor(private cdr: ChangeDetectorRef) {}

  agInit(params: any): void {
    this.params = params;
    this.value = params.value;
    this.isEditing = this.params.isEditing(this.params.data);
    this.isDropdown = !!this.params.dropdownConfig;
    this.hasLink = !this.isEditing && !!this.params.linkConfig;
    
    if (this.isDropdown && this.isEditing) {
      this.loadDropdownOptions();
    } else {
      this.updateInputType();
    }
    
    if (this.hasLink) {
      this.buildLinkUrl();
    }
    
    this.updateDisplayValue();
  }

  refresh(params: any): boolean {
    const wasEditing = this.isEditing;
    this.params = params;
    this.value = params.value;
    this.isEditing = this.params.isEditing(this.params.data);
    this.isDropdown = !!this.params.dropdownConfig;
    this.hasLink = !this.isEditing && !!this.params.linkConfig;
    
    // Reload dropdown options if entering edit mode
    if (this.isDropdown && this.isEditing && !wasEditing) {
      this.loadDropdownOptions();
    } else if (!this.isDropdown) {
      this.updateInputType();
    }
    
    if (this.hasLink) {
      this.buildLinkUrl();
    }
    
    this.updateDisplayValue();
    return true;
  }

  private async loadDropdownOptions(): Promise<void> {
    if (!this.params.dropdownConfig) return;

    const config = this.params.dropdownConfig;

    // Handle static dropdowns
    if (config.type === 'static' && config.staticValues) {
      this.dropdownOptions = config.staticValues;
      return;
    }

    // Handle dynamic dropdowns
    if (config.type === 'dynamic' && this.params.loadDropdownValues) {
      this.isLoadingDropdown = true;
      this.cdr.detectChanges(); // Force update to show "Loading..."
      
      try {
        const field = this.params.colDef?.field || '';
        const rowContext = { ...this.params.data };
        this.dropdownOptions = await this.params.loadDropdownValues(field, rowContext);
      } catch (error) {
        console.error('Error loading dropdown options:', error);
        this.dropdownOptions = [];
      } finally {
        this.isLoadingDropdown = false;
        this.cdr.detectChanges(); // Force update to show options
      }
    }
  }

  private updateInputType(): void {
    const columnType = this.params.columnType || this.params.colDef?.type;
    const fieldName = this.params.colDef?.field?.toLowerCase() || '';
    
    if (columnType === 'date' || fieldName.includes('date')) {
      this.inputType = 'date';
    } else if (columnType === 'number' || fieldName.includes('salary') || fieldName.includes('rating') || fieldName.includes('experience')) {
      this.inputType = 'number';
    } else if (fieldName.includes('email')) {
      this.inputType = 'email';
    } else {
      this.inputType = 'text';
    }
  }

  private updateDisplayValue(): void {
    // For dropdowns, show the label instead of value
    if (this.isDropdown && this.params.dropdownConfig) {
      const config = this.params.dropdownConfig;
      
      // For static dropdowns
      if (config.type === 'static' && config.staticValues) {
        const option = config.staticValues.find((opt: DropdownOption) => opt.value === this.value);
        this.displayValue = option ? option.label : this.value;
        return;
      }
      
      // For dynamic dropdowns, try to find in loaded options
      if (this.dropdownOptions.length > 0) {
        const option = this.dropdownOptions.find(opt => opt.value === this.value);
        this.displayValue = option ? option.label : this.value;
        return;
      }
    }
    
    this.displayValue = this.value;
  }

  onValueChange(): void {
    if (this.params?.colDef?.field) {
      this.params.data[this.params.colDef.field] = this.value;
    }
  }

  onDropdownChange(): void {
    this.onValueChange();
    
    // Trigger cascading dropdown updates
    if (this.params.onCascadingChange && this.params.colDef?.field) {
      this.params.onCascadingChange(
        this.params.colDef.field,
        this.value,
        this.params.data
      );
    }
    
    this.updateDisplayValue();
  }
  
  private buildLinkUrl(): void {
    if (!this.params.linkConfig) {
      this.linkUrl = '#';
      return;
    }
    
    const config = this.params.linkConfig;
    const rowData = this.params.data;
    
    // Build query parameters from config
    const queryParams: string[] = [];
    if (config.params && Array.isArray(config.params)) {
      config.params.forEach((param: any) => {
        if (param.fields && Array.isArray(param.fields)) {
          const values = param.fields.map((field: string) => rowData[field] || '');
          const paramValue = param.separator ? values.join(param.separator) : values[0];
          queryParams.push(`${param.name}=${encodeURIComponent(paramValue)}`);
        }
      });
    }
    
    // Build the URL
    const queryString = queryParams.length > 0 ? '?' + queryParams.join('&') : '';
    this.linkUrl = `${config.routePath || '#'}${queryString}`;
  }
  
  onLinkClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    if (!this.params.linkConfig) return;
    
    const config = this.params.linkConfig;
    
    // Handle drill-down if configured
    if (config.drillDown) {
      // Emit drill-down event through AG Grid API
      const drillDownEvent: any = {
        type: 'drillDown',
        targetProcedure: config.drillDown.targetProcedure,
        filterParams: {} as Record<string, any>,
        rowData: this.params.data
      };
      
      // Build filter params from drill-down config
      if (config.drillDown.filterParams && Array.isArray(config.drillDown.filterParams)) {
        config.drillDown.filterParams.forEach((param: any) => {
          drillDownEvent.filterParams[param.targetField] = this.params.data[param.sourceField];
        });
      }
      
      // Dispatch custom event that the grid component can listen to
      this.params.api?.dispatchEvent(drillDownEvent);
    } else if (config.openInNewTab) {
      window.open(this.linkUrl, '_blank');
    } else {
      window.location.href = this.linkUrl;
    }
  }
}
