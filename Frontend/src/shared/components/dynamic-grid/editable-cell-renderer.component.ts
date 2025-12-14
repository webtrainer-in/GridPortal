import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

@Component({
  selector: 'app-editable-cell-renderer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isEditing) {
      <input 
        class="cell-input"
        [type]="inputType"
        [(ngModel)]="value"
        (blur)="onValueChange()"
        (keydown.enter)="onValueChange()"
        (keydown.tab)="onValueChange()"
      />
    } @else {
      <span class="cell-value">{{ displayValue }}</span>
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    
    .cell-input {
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
    
    .cell-input:focus {
      outline: none;
      border-color: #45a049;
      box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
    }
    
    .cell-value {
      display: block;
      padding: 8px;
      font-size: 14px;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
    }
  `]
})
export class EditableCellRendererComponent implements ICellRendererAngularComp {
  private params!: ICellRendererParams & {
    isEditing: (rowData: any) => boolean;
    columnType?: string;
  };
  
  value: any;
  isEditing: boolean = false;
  inputType: string = 'text';
  displayValue: any;

  agInit(params: any): void {
    this.params = params;
    this.value = params.value;
    this.isEditing = this.params.isEditing(this.params.data);
    this.updateInputType();
    this.updateDisplayValue();
  }

  refresh(params: any): boolean {
    this.params = params;
    this.value = params.value;
    this.isEditing = this.params.isEditing(this.params.data);
    this.updateInputType();
    this.updateDisplayValue();
    return true;
  }

  private updateInputType(): void {
    // Determine input type based on column type or field name
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
    this.displayValue = this.value;
  }

  onValueChange(): void {
    // Update the data model
    if (this.params?.colDef?.field) {
      this.params.data[this.params.colDef.field] = this.value;
    }
  }
}
