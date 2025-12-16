import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DynamicGrid } from './dynamic-grid';
import { DynamicGridService, StoredProcedureInfo } from '../../../core/services/dynamic-grid.service';

@Component({
  selector: 'app-dynamic-grid-demo',
  standalone: true,
  imports: [CommonModule, FormsModule, DynamicGrid],
  template: `
    <div class="demo-container">
      <div class="header">
        <h2>Dynamic Grid Demo</h2>
        <div class="controls">
          <label for="procedure-select">Select Grid:</label>
          <select 
            id="procedure-select" 
            [(ngModel)]="selectedProcedure" 
            (change)="onProcedureChange()"
            class="procedure-selector">
            <option value="">-- Select a grid --</option>
            @for (proc of availableProcedures; track proc.id) {
              <option [value]="proc.procedureName">
                {{ proc.displayName }} @if (proc.category) { ({{ proc.category }}) }
              </option>
            }
          </select>
          
          @if (selectedProcedure) {
            <button (click)="refreshGrid()" class="btn-refresh">
              🔄 Refresh
            </button>
          }
        </div>
      </div>
      
      @if (selectedProcedure) {
        @if (gridKey) {
          <app-dynamic-grid
            [procedureName]="selectedProcedure"
            [enableRowEditing]="true"
            [pageSize]="15"
            [paginationThreshold]="10"
            [defaultPaginationMode]="'infinite'"
            [infiniteScrollBatchSize]="1000"
            [infiniteScrollWindowSize]="10000"
            [infiniteScrollThreshold]="0.8"
          ></app-dynamic-grid>
        }
      } @else {
        <div class="empty-state">
          <p>👆 Please select a grid from the dropdown above</p>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    .demo-container {
      padding: 20px;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      gap: 15px;
      box-sizing: border-box;
      overflow: hidden;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
      
      h2 {
        margin: 0;
      }
    }
    
    .controls {
      display: flex;
      gap: 10px;
      align-items: center;
      
      label {
        font-weight: 500;
      }
      
      .procedure-selector {
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        min-width: 250px;
        cursor: pointer;
        
        &:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
        }
      }
      
      .btn-refresh {
        padding: 8px 16px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: background 0.2s;
        
        &:hover {
          background: #0056b3;
        }
      }
    }

    app-dynamic-grid {
      flex: 1;
      display: flex;
      width: 100%;
      min-height: 0;
      overflow: hidden;
    }
    
    .empty-state {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8f9fa;
      border: 2px dashed #dee2e6;
      border-radius: 8px;
      
      p {
        font-size: 18px;
        color: #6c757d;
        margin: 0;
      }
    }
  `]
})
export class DynamicGridDemoComponent implements OnInit {
  availableProcedures: StoredProcedureInfo[] = [];
  selectedProcedure: string = '';
  gridKey: number = 1;  // Start with 1 to ensure grid renders

  constructor(
    private gridService: DynamicGridService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAvailableProcedures();
  }

  loadAvailableProcedures(): void {
    this.gridService.getAvailableProcedures().subscribe({
      next: (procedures) => {
        this.availableProcedures = procedures;
        
        // Auto-select first procedure if available
        if (procedures.length > 0 && !this.selectedProcedure) {
          this.selectedProcedure = procedures[0].procedureName;
          this.gridKey = 1;  // Ensure grid renders
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error('Error loading procedures:', error);
      }
    });
  }

  onProcedureChange(): void {
    console.log('📝 Procedure changed to:', this.selectedProcedure);
    // Force grid refresh by toggling gridKey
    this.gridKey = 0;
    this.cdr.detectChanges();
    
    setTimeout(() => {
      this.gridKey = Date.now();
      this.cdr.detectChanges();
      console.log('✅ Grid recreated with key:', this.gridKey);
    }, 0);
  }

  refreshGrid(): void {
    console.log('🔄 Refreshing grid...');
    this.gridKey = 0;
    this.cdr.detectChanges();
    
    setTimeout(() => {
      this.gridKey = Date.now();
      this.cdr.detectChanges();
      console.log('✅ Grid refreshed with key:', this.gridKey);
    }, 0);
  }
}
