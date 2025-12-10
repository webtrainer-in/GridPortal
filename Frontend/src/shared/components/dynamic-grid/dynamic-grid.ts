import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent, themeQuartz } from 'ag-grid-community';
import { DynamicGridService, GridDataRequest, ColumnDefinition } from '../../../core/services/dynamic-grid.service';
import { ActionButtonsRendererComponent } from './action-buttons-renderer.component';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-dynamic-grid',
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridAngular],
  templateUrl: './dynamic-grid.html',
  styleUrls: ['./dynamic-grid.scss']
})
export class DynamicGrid implements OnInit, OnDestroy {
  @Input() procedureName: string = '';
  @Input() enableRowEditing: boolean = true;
  @Input() pageSize: number = 15;
  @Input() paginationThreshold: number = 1000; // Switch to server-side if > 1000 records
  
  columnDefs: ColDef[] = [];
  rowData: any[] = [];
  gridApi!: GridApi;
  theme = themeQuartz;
  editingRows: Set<any> = new Set();
  
  // Pagination state
  totalCount: number = 0;
  currentPage: number = 1;
  totalPages: number = 0;
  isServerSidePagination: boolean = false;
  isLoading: boolean = false;
  
  private destroy$ = new Subject<void>();

  // Make Math available in template
  Math = Math;

  constructor(
    private gridService: DynamicGridService,
    private cdr: ChangeDetectorRef
  ) {}

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

  private setLoading(loading: boolean): void {
    this.isLoading = loading;
    this.cdr.detectChanges();
    console.log(`🔄 Loading state set to: ${loading} (change detection triggered)`);
  }

  private loadGridData(): void {
    console.log('📊 Loading grid data...');
    this.setLoading(true);
    
    // Safety timeout - force clear loading after 10 seconds
    setTimeout(() => {
      if (this.isLoading) {
        console.warn('⚠️ Force clearing loading state after timeout');
        this.setLoading(false);
      }
    }, 10000);
    
    // Load initial page to get total count
    const request: GridDataRequest = {
      procedureName: this.procedureName,
      pageNumber: 1,
      pageSize: this.pageSize
    };

    this.gridService.executeGridProcedure(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('📦 Response received:', response);
          this.totalCount = response.totalCount || 0;
          console.log(`📈 Total records: ${this.totalCount}`);
          console.log(`📊 Rows in response: ${response.rows?.length || 0}`);
          
          // Determine pagination mode based on threshold
          if (this.totalCount < this.paginationThreshold) {
            console.log('✅ Using CLIENT-SIDE pagination (dataset < threshold)');
            this.isServerSidePagination = false;
            
            // If we need all data and haven't loaded it yet
            if (response.rows.length < this.totalCount) {
              console.log(`🔄 Need to load all ${this.totalCount} records (currently have ${response.rows.length})`);
              this.loadAllData();
            } else {
              console.log('✅ Already have all data in first response');
              // We already have all the data
              this.setupGridWithData(response);
            }
          } else {
            console.log('✅ Using SERVER-SIDE pagination (dataset >= threshold)');
            this.isServerSidePagination = true;
            this.totalPages = Math.ceil(this.totalCount / this.pageSize);
            this.currentPage = 1;
            this.setupGridWithData(response);
          }
        },
        error: (error) => {
          console.error('❌ Error loading grid data:', error);
          this.setLoading(false);
        }
      });
  }

  private setupGridWithData(response: any): void {
    console.log('🔧 setupGridWithData called');
    
    try {
      if (this.columnDefs.length === 0 && response.columns) {
        console.log('📋 Setting up column definitions...');
        this.updateColumnDefinitions(response.columns);
      }
      
      this.rowData = response.rows || [];
      console.log(`✅ Setting rowData with ${this.rowData.length} rows`);
      
      this.setLoading(false);
      console.log('✅ Loading state cleared');
      
      if (this.gridApi) {
        this.gridApi.setGridOption('rowData', this.rowData);
        console.log('✅ Grid API updated');
      } else {
        console.warn('⚠️ Grid API not available yet');
      }
      
      console.log('✅ Grid setup complete with', this.rowData.length, 'rows');
    } catch (error) {
      console.error('❌ Error in setupGridWithData:', error);
      this.setLoading(false);
    }
  }

  private loadAllData(): void {
    console.log('📥 Loading ALL data for client-side pagination...');
    
    const request: GridDataRequest = {
      procedureName: this.procedureName,
      pageNumber: 1,
      pageSize: this.totalCount || 10000 // Load all records
    };

    this.gridService.executeGridProcedure(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ All data loaded:', response.rows?.length || 0, 'rows');
          
          if (this.columnDefs.length === 0 && response.columns) {
            this.updateColumnDefinitions(response.columns);
          }
          
          this.rowData = response.rows || [];
          this.setLoading(false);
          
          if (this.gridApi) {
            this.gridApi.setGridOption('rowData', this.rowData);
          }
        },
        error: (error) => {
          console.error('❌ Error loading all data:', error);
          this.setLoading(false);
        }
      });
  }

  private loadPageData(page: number): void {
    console.log(`📄 Loading page ${page} of ${this.totalPages}...`);
    this.isLoading = true;
    
    const request: GridDataRequest = {
      procedureName: this.procedureName,
      pageNumber: page,
      pageSize: this.pageSize
    };

    this.gridService.executeGridProcedure(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log(`✅ Page ${page} loaded:`, response.rows?.length || 0, 'rows');
          
          if (this.columnDefs.length === 0 && response.columns) {
            this.updateColumnDefinitions(response.columns);
          }
          
          this.rowData = response.rows || [];
          this.currentPage = page;
          this.setLoading(false);
          
          if (this.gridApi) {
            this.gridApi.setGridOption('rowData', this.rowData);
          }
        },
        error: (error) => {
          console.error(`❌ Error loading page ${page}:`, error);
          this.setLoading(false);
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

  // Pagination navigation methods
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.loadPageData(this.currentPage + 1);
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.loadPageData(this.currentPage - 1);
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.loadPageData(page);
    }
  }

  get canGoNext(): boolean {
    return this.currentPage < this.totalPages;
  }

  get canGoPrevious(): boolean {
    return this.currentPage > 1;
  }

  onPageSizeChange(): void {
    console.log('📏 Page size changed to:', this.pageSize);
    // Recalculate total pages
    this.totalPages = Math.ceil(this.totalCount / this.pageSize);
    // Reset to first page
    this.currentPage = 1;
    // Reload data with new page size
    this.loadPageData(1);
  }
}
