import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

@Component({
  selector: 'app-action-buttons-renderer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="action-buttons">
      @if (!isEditing) {
        <button 
          class="btn-edit" 
          (click)="onEditClick()"
          title="Edit row">
          ✏️ Edit
        </button>
        <button 
          class="btn-delete" 
          (click)="onDeleteClick()"
          title="Delete row">
          🗑️ Delete
        </button>
      } @else {
        <button 
          class="btn-save" 
          (click)="onSaveClick()"
          title="Save changes">
          ✅ Save
        </button>
        <button 
          class="btn-cancel" 
          (click)="onCancelClick()"
          title="Cancel editing">
          ❌
        </button>
      }
    </div>
  `,
  styles: [`
    .action-buttons {
      display: flex;
      gap: 5px;
      padding: 5px;
      height: 100%;
      align-items: center;
    }
    
    button {
      padding: 4px 8px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
      font-weight: 500;
    }
    
    .btn-edit {
      background: #007bff;
      color: white;
    }
    
    .btn-edit:hover {
      background: #0056b3;
    }
    
    .btn-delete {
      background: #dc3545;
      color: white;
    }
    
    .btn-delete:hover {
      background: #c82333;
    }
    
    .btn-save {
      background: #28a745;
      color: white;
    }
    
    .btn-save:hover {
      background: #218838;
    }
    
    .btn-cancel {
      background: #6c757d;
      color: white;
      padding: 4px 6px;
    }
    
    .btn-cancel:hover {
      background: #5a6268;
    }
  `]
})
export class ActionButtonsRendererComponent implements ICellRendererAngularComp {
  private params!: ICellRendererParams & {
    onEdit: (rowData: any) => void;
    onSave: (rowData: any) => void;
    onCancel: (rowData: any) => void;
    onDelete: (rowData: any) => void;
    isEditing: (rowData: any) => boolean;
  };
  
  isEditing: boolean = false;

  agInit(params: any): void {
    this.params = params;
    this.isEditing = this.params.isEditing(this.params.data);
  }

  refresh(params: any): boolean {
    this.params = params;
    this.isEditing = this.params.isEditing(this.params.data);
    return true;
  }

  onEditClick(): void {
    this.params.onEdit(this.params.data);
  }

  onSaveClick(): void {
    this.params.onSave(this.params.data);
  }

  onCancelClick(): void {
    this.params.onCancel(this.params.data);
  }
  
  onDeleteClick(): void {
    if (confirm('Are you sure you want to delete this row?')) {
      this.params.onDelete(this.params.data);
    }
  }
}
