import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { ConfirmationService } from 'primeng/api';

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
          ✏️
        </button>
        <button 
          class="btn-delete" 
          (click)="onDeleteClick()"
          title="Delete row">
          🗑️
        </button>
      } @else {
        <button 
          class="btn-save" 
          (click)="onSaveClick()"
          title="Save changes">
          ✅
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
      gap: 4px;
      padding: 5px;
      height: 100%;
      align-items: center;
      justify-content: center;
    }
    
    button {
      padding: 6px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      transition: all 0.2s;
      font-weight: 500;
      min-width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .btn-edit {
      background: #007bff;
      color: white;
    }
    
    .btn-edit:hover {
      background: #0056b3;
      transform: scale(1.1);
    }
    
    .btn-delete {
      background: #dc3545;
      color: white;
    }
    
    .btn-delete:hover {
      background: #c82333;
      transform: scale(1.1);
    }
    
    .btn-save {
      background: #28a745;
      color: white;
    }
    
    .btn-save:hover {
      background: #218838;
      transform: scale(1.1);
    }
    
    .btn-cancel {
      background: #6c757d;
      color: white;
    }
    
    .btn-cancel:hover {
      background: #5a6268;
      transform: scale(1.1);
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
    confirmationService: ConfirmationService;
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
    this.params.confirmationService.confirm({
      message: 'Are you sure you want to delete this row?',
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.params.onDelete(this.params.data);
      }
    });
  }
}
