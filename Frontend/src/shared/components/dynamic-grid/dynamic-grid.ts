import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent, themeQuartz } from 'ag-grid-community';
import { DynamicGridService, GridDataRequest, ColumnDefinition } from '../../../core/services/dynamic-grid.service';
import { ActionButtonsRendererComponent } from './action-buttons-renderer.component';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-dynamic-grid',
  standalone: true,
  imports: [CommonModule, AgGridAngular],
  templateUrl: './dynamic-grid.html',
  styleUrls: ['./dynamic-grid.scss']
})
export class DynamicGrid implements OnInit, OnDestroy {
  @Input() procedureName: string = '';
  @Input() enableRowEditing: boolean = true;
  @Input() pageSize: number = 100;
  
  columnDefs: ColDef[] = [];
  rowData: any[] = [];
  gridApi!: GridApi;
  theme = themeQuartz;
  editingRows: Set<any> = new Set();
  
  private destroy$ = new Subject<void>();

  constructor(private gridService: DynamicGridService) {}

  ngOnInit(): void {
    if (!this.procedureName) {
      console.error('DynamicGrid: procedureName is required');
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onGridReady(params: GridReadyEvent): void {
    console.log('🎯 Grid Ready! Procedure:', this.procedureName);
    this.gridApi = params.api;
    this.loadGridData();
  }

  private loadGridData(): void {
    console.log('📊 Loading grid data...');
    
    const request: GridDataRequest = {
      procedureName: this.procedureName,
      pageNumber: 1,
      pageSize: this.pageSize
    };

    this.gridService.executeGridProcedure(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Grid data received:', response);
          console.log('  - Rows:', response.rows?.length || 0);
          console.log('  - Columns:', response.columns?.length || 0);
          console.log('  - Total Count:', response.totalCount);
          
          if (this.columnDefs.length === 0 && response.columns) {
            console.log('📋 Setting up column definitions...');
            this.updateColumnDefinitions(response.columns);
          }
          
          this.rowData = response.rows || [];
          
          // Force AG Grid to update
          if (this.gridApi) {
            this.gridApi.setGridOption('rowData', this.rowData);
          }
          
          console.log('✅ Data loaded into grid successfully');
          console.log('✅ Grid now has', this.rowData.length, 'rows');
        },
        error: (error) => {
          console.error('❌ Error loading grid data:', error);
        }
      });
  }

  private updateColumnDefinitions(columns: ColumnDefinition[]): void {
    console.log('🔧 updateColumnDefinitions called with', columns.length, 'columns');
    console.log('📋 Column details:', columns);
    
    const colDefs: ColDef[] = [];
    
    columns.forEach(col => {
      console.log(`  - Processing column: ${col.field} (${col.headerName})`);
      
      if (col.field === 'actions' && this.enableRowEditing) {
        colDefs.push({
          field: 'actions',
          headerName: 'Actions',
          width: col.width || 120,
          pinned: col.pinned ? 'left' : undefined,
          cellRenderer: ActionButtonsRendererComponent,
          cellRendererParams: {
            onEdit: (rowData: any) => this.enableRowEdit(rowData),
            onSave: (rowData: any) => this.saveRow(rowData),
            onCancel: (rowData: any) => this.cancelRowEdit(rowData),
            isEditing: (rowData: any) => this.editingRows.has(rowData.Id)
          },
          editable: false,
          sortable: false,
          filter: false
        });
      } else {
        colDefs.push({
          field: col.field,
          headerName: col.headerName,
          width: col.width,
          sortable: col.sortable,
          filter: col.filter,
          editable: this.enableRowEditing ? (params) => this.editingRows.has(params.data.Id) : false
        });
      }
    });
    
    this.columnDefs = colDefs;
    console.log('✅ Created', this.columnDefs.length, 'column definitions');
    console.log('📋 Final columnDefs:', this.columnDefs.map(c => ({ field: c.field, header: c.headerName })));
    
    this.gridApi?.setGridOption('columnDefs', this.columnDefs);
  }

  enableRowEdit(rowData: any): void {
    rowData._originalData = { ...rowData };
    this.editingRows.add(rowData.Id);
    this.gridApi?.refreshCells({ force: true });
  }

  saveRow(rowData: any): void {
    const changes: Record<string, any> = {};
    const originalData = rowData._originalData;
    
    if (!originalData) return;
    
    Object.keys(rowData).forEach(key => {
      if (key !== '_originalData' && key !== 'Id' && rowData[key] !== originalData[key]) {
        changes[key] = rowData[key];
      }
    });
    
    if (Object.keys(changes).length === 0) {
      this.cancelRowEdit(rowData);
      return;
    }
    
    const updateRequest = {
      procedureName: this.procedureName,
      rowId: rowData.Id,
      changes: changes
    };
    
    this.gridService.updateRow(updateRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.editingRows.delete(rowData.Id);
            delete rowData._originalData;
            this.gridApi?.refreshCells({ force: true });
            console.log('✅ Row saved successfully');
          } else {
            alert(`❌ Save failed: ${response.message}`);
          }
        },
        error: (error) => {
          console.error('Error saving row:', error);
          alert('❌ Failed to save. Please try again.');
        }
      });
  }

  cancelRowEdit(rowData: any): void {
    if (rowData._originalData) {
      Object.keys(rowData._originalData).forEach(key => {
        rowData[key] = rowData._originalData[key];
      });
      delete rowData._originalData;
    }
    this.editingRows.delete(rowData.Id);
    this.gridApi?.refreshCells({ force: true });
  }

  getRowStyle = (params: any) => {
    if (this.editingRows.has(params.data?.Id)) {
      return { background: '#fff9e6' };
    }
    return undefined;
  };
}
