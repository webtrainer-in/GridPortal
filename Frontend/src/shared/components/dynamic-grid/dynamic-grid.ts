import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent, themeQuartz } from 'ag-grid-community';
import { DynamicGridService, GridDataRequest, ColumnDefinition } from '../../../core/services/dynamic-grid.service';
import { ActionButtonsRendererComponent } from './action-buttons-renderer.component';
import { EditableCellRendererComponent } from './editable-cell-renderer.component';
import { Subject, takeUntil } from 'rxjs';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-dynamic-grid',
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridAngular],
  templateUrl: './dynamic-grid.html',
  styleUrls: ['./dynamic-grid.scss'],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0, transform: 'translateY(-10px)' }))
      ])
    ])
  ]
})
export class DynamicGrid implements OnInit, OnDestroy {
  @Input() procedureName: string = '';
  @Input() enableRowEditing: boolean = true;
  @Input() pageSize: number = 15;
  @Input() paginationThreshold: number = 1000; // Switch to server-side if > 1000 records
  
  columnDefs: ColDef[] = [];
  rowData: any[] = [];
  allRowData: any[] = []; // Store all data for client-side pagination
  gridApi!: GridApi;
  theme = themeQuartz;
  editingRows: Set<any> = new Set();
  
  // Pagination state
  totalCount: number = 0;
  currentPage: number = 1;
  totalPages: number = 0;
  isServerSidePagination: boolean = false;
  isLoading: boolean = false;
  
  // Sorting state (for server-side pagination)
  currentSortColumn: string | null = null;
  currentSortDirection: 'ASC' | 'DESC' = 'ASC';
  
  // Filtering state (for server-side pagination)
  currentFilterModel: any = null;
  
  // Column visibility state
  showColumnMenu: boolean = false;
  columnSearchTerm: string = '';
  columnGroups: ColumnGroup[] = [];
  filteredColumnGroups: ColumnGroup[] = [];
  filteredUngroupedColumns: ColumnInfo[] = [];
  
  // Freeze columns state
  showFreezeMenu: boolean = false;
  freezableColumns: FreezeColumnInfo[] = [];
  
  // Export menu state
  showExportMenu: boolean = false;
  
  // Global search state
  globalSearchTerm: string = '';
  
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

  onSortChanged(): void {
    // Only handle sorting for server-side pagination
    if (!this.isServerSidePagination || !this.gridApi) {
      return;
    }

    const columnState = this.gridApi.getColumnState();
    const sortedColumn = columnState.find(col => col.sort != null);

    if (sortedColumn) {
      this.currentSortColumn = sortedColumn.colId;
      this.currentSortDirection = sortedColumn.sort === 'asc' ? 'ASC' : 'DESC';
      console.log(`🔽 Sort changed: ${this.currentSortColumn} ${this.currentSortDirection}`);
    } else {
      this.currentSortColumn = null;
      this.currentSortDirection = 'ASC';
      console.log('🔽 Sort cleared');
    }

    // Reload current page with new sort
    this.loadPageData(this.currentPage);
  }

  onFilterChanged(): void {
    // Only handle filtering for server-side pagination
    if (!this.isServerSidePagination || !this.gridApi) {
      return;
    }

    const filterModel = this.gridApi.getFilterModel();
    this.currentFilterModel = Object.keys(filterModel).length > 0 ? filterModel : null;
    
    if (this.currentFilterModel) {
      console.log('🔍 Filter changed:', JSON.stringify(this.currentFilterModel));
    } else {
      console.log('🔍 Filter cleared');
    }

    // Reload from page 1 with new filter
    this.loadPageData(1);
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
    console.log(`📊 Total count from initial response: ${this.totalCount}`);
    
    const request: GridDataRequest = {
      procedureName: this.procedureName,
      pageNumber: 1,
      pageSize: this.totalCount // Use the total count from initial response
    };

    console.log(`🔍 Requesting ${request.pageSize} records from API...`);

    this.gridService.executeGridProcedure(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('📦 API Response received:');
          console.log('  - response.rows.length:', response.rows?.length || 0);
          console.log('  - response.totalCount:', response.totalCount);
          console.log('  - Requested pageSize:', request.pageSize);
          
          if (this.columnDefs.length === 0 && response.columns) {
            this.updateColumnDefinitions(response.columns);
          }
          
          // Store all data - AG Grid will handle sorting/filtering
          this.allRowData = response.rows || [];
          this.rowData = this.allRowData; // Give AG Grid ALL data for client-side operations
          this.totalCount = this.allRowData.length;
          this.totalPages = Math.ceil(this.totalCount / this.pageSize);
          this.currentPage = 1;
          
          console.log(`✅ Loaded ${this.allRowData.length} rows for client-side operations`);
          console.log(`✅ Total pages: ${this.totalPages}`);
          
          // Set grid data
          if (this.gridApi) {
            this.gridApi.setGridOption('rowData', this.rowData);
            // Enable AG Grid's pagination for client-side mode
            this.gridApi.setGridOption('pagination', true);
            this.gridApi.setGridOption('paginationPageSize', this.pageSize);
          }
          
          this.setLoading(false);
        },
        error: (error) => {
          console.error('❌ Error loading all data:', error);
          this.setLoading(false);
        }
      });
  }

  private updatePagedData(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.rowData = this.allRowData.slice(startIndex, endIndex);
    
    if (this.gridApi) {
      this.gridApi.setGridOption('rowData', this.rowData);
    }
    
    console.log(`✅ Showing page ${this.currentPage}: rows ${startIndex + 1}-${Math.min(endIndex, this.totalCount)}`);
  }

  private loadPageData(page: number): void {
    console.log(`📄 Loading page ${page} of ${this.totalPages}...`);
    if (this.currentSortColumn) {
      console.log(`🔽 Sorting by: ${this.currentSortColumn} ${this.currentSortDirection}`);
    }
    if (this.currentFilterModel) {
      console.log(`🔍 Filtering with:`, this.currentFilterModel);
    }
    this.isLoading = true;
    
    const request: GridDataRequest = {
      procedureName: this.procedureName,
      pageNumber: page,
      pageSize: this.pageSize,
      sortColumn: this.currentSortColumn || undefined,
      sortDirection: this.currentSortDirection,
      filterJson: this.currentFilterModel ? JSON.stringify(this.currentFilterModel) : undefined,
      searchTerm: this.globalSearchTerm || undefined // Add global search term
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
          
          // Update total count and pages from response
          this.totalCount = response.totalCount || 0;
          this.totalPages = Math.ceil(this.totalCount / this.pageSize);
          
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
    const colDefs: ColDef[] = [];
    
    columns.forEach(col => {
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
            onDelete: (rowData: any) => this.deleteRow(rowData),
            isEditing: (rowData: any) => this.editingRows.has(rowData.Id)
          },
          editable: false,
          sortable: false,
          filter: false
        });
      } else {
        const isEditableColumn = this.enableRowEditing && col.field !== 'Id';
        
        const colDef: any = {
          field: col.field,
          headerName: col.headerName,
          width: col.width,
          sortable: col.sortable,
          filter: col.filter,
          // ID column should never be editable
          editable: false, // Disable AG Grid's built-in editing
          singleClickEdit: false
        };
        
        // Use custom cell renderer for editable columns to show input fields
        if (isEditableColumn) {
          colDef.cellRenderer = EditableCellRendererComponent;
          colDef.cellRendererParams = {
            isEditing: (rowData: any) => this.editingRows.has(rowData.Id),
            columnType: col.type // Pass column type for determining input type
          };
        }
        
        // Add column group if provided from database
        if (col.columnGroup) {
          colDef.columnGroup = col.columnGroup;
        }
        
        colDefs.push(colDef);
      }
    });
    
    this.columnDefs = colDefs;
    this.gridApi?.setGridOption('columnDefs', this.columnDefs);
  }

  enableRowEdit(rowData: any): void {
    rowData._originalData = { ...rowData };
    this.editingRows.add(rowData.Id);
    // Refresh cells to trigger custom cell renderer to show input fields
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
  
  deleteRow(rowData: any): void {
    const deleteRequest = {
      procedureName: this.procedureName,
      rowId: rowData.Id
    };
    
    this.gridService.deleteRow(deleteRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            // Remove from local data
            if (this.isServerSidePagination) {
              // Reload current page for server-side
              this.loadPageData(this.currentPage);
            } else {
              // Remove from client-side data
              const index = this.allRowData.findIndex(row => row.Id === rowData.Id);
              if (index > -1) {
                this.allRowData.splice(index, 1);
                this.rowData = this.allRowData;
                this.totalCount = this.allRowData.length;
                this.totalPages = Math.ceil(this.totalCount / this.pageSize);
                this.gridApi?.setGridOption('rowData', this.rowData);
              }
            }
            console.log('✅ Row deleted successfully');
          } else {
            alert(`❌ Delete failed: ${response.message}`);
          }
        },
        error: (error) => {
          console.error('Error deleting row:', error);
          alert('❌ Failed to delete. Please try again.');
        }
      });
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
      this.currentPage++;
      if (this.isServerSidePagination) {
        this.loadPageData(this.currentPage);
      } else {
        this.updatePagedData();
      }
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      if (this.isServerSidePagination) {
        this.loadPageData(this.currentPage);
      } else {
        this.updatePagedData();
      }
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      if (this.isServerSidePagination) {
        this.loadPageData(page);
      } else {
        this.updatePagedData();
      }
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
    
    if (this.isServerSidePagination) {
      // Reload data with new page size
      this.loadPageData(1);
    } else {
      // Just update the paged data slice
      this.updatePagedData();
    }
  }

  getStartRecord(): number {
    if (this.totalCount === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  getEndRecord(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalCount);
  }

  // Column visibility methods
  toggleColumnMenu(): void {
    this.showColumnMenu = !this.showColumnMenu;
    if (this.showColumnMenu) {
      this.buildColumnGroups();
      this.filterColumns();
    }
  }

  buildColumnGroups(): void {
    const groupMap = new Map<string, ColumnInfo[]>();
    const ungrouped: ColumnInfo[] = [];

    this.columnDefs.forEach(colDef => {
      if (colDef.field === 'actions') return; // Skip actions column

      const columnInfo: ColumnInfo = {
        field: colDef.field || '',
        headerName: colDef.headerName || colDef.field || '',
        visible: !colDef.hide,
        colDef: colDef
      };

      const groupName = (colDef as any).columnGroup;
      if (groupName) {
        if (!groupMap.has(groupName)) {
          groupMap.set(groupName, []);
        }
        groupMap.get(groupName)!.push(columnInfo);
      } else {
        ungrouped.push(columnInfo);
      }
    });

    this.columnGroups = Array.from(groupMap.entries()).map(([name, columns]) => ({
      name,
      columns,
      expanded: true
    }));

    this.filteredUngroupedColumns = ungrouped;
  }

  filterColumns(): void {
    const searchLower = this.columnSearchTerm.toLowerCase();
    
    if (!searchLower) {
      this.filteredColumnGroups = this.columnGroups;
      return;
    }

    this.filteredColumnGroups = this.columnGroups
      .map(group => ({
        ...group,
        columns: group.columns.filter(col => 
          col.headerName.toLowerCase().includes(searchLower) ||
          col.field.toLowerCase().includes(searchLower)
        )
      }))
      .filter(group => group.columns.length > 0);

    this.filteredUngroupedColumns = this.filteredUngroupedColumns.filter(col =>
      col.headerName.toLowerCase().includes(searchLower) ||
      col.field.toLowerCase().includes(searchLower)
    );
  }

  toggleColumnVisibility(column: ColumnInfo): void {
    column.visible = !column.visible;
    column.colDef.hide = !column.visible;
    this.gridApi.setGridOption('columnDefs', this.columnDefs);
  }

  toggleGroup(group: ColumnGroup): void {
    group.expanded = !group.expanded;
  }

  toggleGroupVisibility(group: ColumnGroup): void {
    const allVisible = group.columns.every(col => col.visible);
    const newVisibility = !allVisible;

    group.columns.forEach(col => {
      col.visible = newVisibility;
      col.colDef.hide = !newVisibility;
    });

    this.gridApi.setGridOption('columnDefs', this.columnDefs);
  }

  isGroupVisible(group: ColumnGroup): boolean {
    return group.columns.every(col => col.visible);
  }

  isGroupIndeterminate(group: ColumnGroup): boolean {
    const visibleCount = group.columns.filter(col => col.visible).length;
    return visibleCount > 0 && visibleCount < group.columns.length;
  }

  showAllColumns(): void {
    this.columnDefs.forEach(colDef => {
      if (colDef.field !== 'actions') {
        colDef.hide = false;
      }
    });
    this.buildColumnGroups();
    this.gridApi.setGridOption('columnDefs', this.columnDefs);
  }

  hideAllColumns(): void {
    this.columnDefs.forEach(colDef => {
      if (colDef.field !== 'actions') {
        colDef.hide = true;
      }
    });
    this.buildColumnGroups();
    this.gridApi.setGridOption('columnDefs', this.columnDefs);
  }
  
  // Freeze columns methods
  toggleFreezeMenu(): void {
    this.showFreezeMenu = !this.showFreezeMenu;
    if (this.showFreezeMenu) {
      this.buildFreezableColumns();
    }
  }

  buildFreezableColumns(): void {
    this.freezableColumns = this.columnDefs
      .filter(col => col.field !== 'actions') // Exclude actions column
      .map(col => ({
        field: col.field || '',
        headerName: col.headerName || col.field || '',
        pinned: col.pinned === 'left',
        colDef: col
      }));
  }

  toggleColumnFreeze(column: FreezeColumnInfo): void {
    column.pinned = !column.pinned;
    
    // Use AG Grid's applyColumnState API for proper pinning
    this.gridApi.applyColumnState({
      state: [
        {
          colId: column.field,
          pinned: column.pinned ? 'left' : null
        }
      ]
    });
    
    // Update the column def
    column.colDef.pinned = column.pinned ? 'left' : undefined;
    
    // Refresh the list
    this.buildFreezableColumns();
  }

  unfreezeAllColumns(): void {
    // Build state to unpin all columns EXCEPT actions (which comes pinned from DB)
    const columnState = this.columnDefs
      .filter(col => col.field !== 'actions') // Exclude actions from unfreezing
      .map(col => ({
        colId: col.field || '',
        pinned: null
      }));
    
    // Apply the state to AG Grid
    this.gridApi.applyColumnState({
      state: columnState
    });
    
    // Update column defs (but keep actions pinned)
    this.columnDefs.forEach(col => {
      if (col.field !== 'actions') {
        col.pinned = undefined;
      }
      // Actions column keeps its pinned state from DB
    });
    
    // Rebuild the freezable columns list to reflect changes
    this.freezableColumns = this.columnDefs
      .filter(col => col.field !== 'actions')
      .map(col => ({
        field: col.field || '',
        headerName: col.headerName || col.field || '',
        pinned: false,
        colDef: col
      }));
  }
  
  // Clear all filters
  clearAllFilters(): void {
    this.gridApi.setFilterModel(null);
  }
  
  // Global search across all columns
  onGlobalSearch(): void {
    if (this.isServerSidePagination) {
      // For server-side pagination, send search term to backend
      this.currentPage = 1; // Reset to first page when searching
      this.loadPageData(1);
    } else {
      // For client-side pagination, use AG Grid's quick filter
      this.gridApi.setGridOption('quickFilterText', this.globalSearchTerm);
    }
  }
  
  // Export methods
  toggleExportMenu(): void {
    this.showExportMenu = !this.showExportMenu;
  }

  async exportToCSV(): Promise<void> {
    this.showExportMenu = false;
    
    if (this.isServerSidePagination) {
      // For server-side pagination, fetch all data first
      await this.exportAllDataToCSV();
    } else {
      // For client-side pagination, export directly
      const params = {
        fileName: `${this.procedureName || 'grid-data'}_${new Date().toISOString().split('T')[0]}.csv`,
        columnKeys: this.getExportableColumns()
      };
      
      this.gridApi.exportDataAsCsv(params);
    }
  }

  async exportToExcel(): Promise<void> {
    this.showExportMenu = false;
    
    try {
      let dataToExport: any[];
      
      if (this.isServerSidePagination) {
        // For server-side pagination, fetch all data first
        dataToExport = await this.fetchAllDataForExport();
      } else {
        // For client-side pagination, use current data
        dataToExport = this.rowData;
      }
      
      // Use xlsx library to create Excel file
      await this.exportToExcelUsingXLSX(dataToExport);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export to Excel. Please try again.');
    }
  }

  private async exportToExcelUsingXLSX(data: any[]): Promise<void> {
    // Dynamically import xlsx library
    const XLSX = await import('xlsx');
    
    // Get exportable columns
    const exportColumns = this.getExportableColumns();
    
    // Create worksheet data with headers
    const worksheetData: any[][] = [];
    
    // Add headers
    const headers = exportColumns.map(field => {
      const colDef = this.columnDefs.find(col => col.field === field);
      return colDef?.headerName || field;
    });
    worksheetData.push(headers);
    
    // Add data rows
    data.forEach(row => {
      const rowData = exportColumns.map(field => row[field] ?? '');
      worksheetData.push(rowData);
    });
    
    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, this.procedureName || 'Data');
    
    // Generate file name
    const fileName = `${this.procedureName || 'grid-data'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Write file
    XLSX.writeFile(workbook, fileName);
  }

  private async exportAllDataToCSV(): Promise<void> {
    try {
      // Fetch all data from server
      const allData = await this.fetchAllDataForExport();
      
      // Temporarily store current row data
      const currentRowData = this.rowData;
      
      // Set all data to grid
      this.rowData = allData;
      this.gridApi.setGridOption('rowData', allData);
      
      // Export
      const params = {
        fileName: `${this.procedureName || 'grid-data'}_${new Date().toISOString().split('T')[0]}.csv`,
        columnKeys: this.getExportableColumns()
      };
      
      this.gridApi.exportDataAsCsv(params);
      
      // Restore original data
      this.rowData = currentRowData;
      this.gridApi.setGridOption('rowData', currentRowData);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      alert('Failed to export data. Please try again.');
    }
  }

  private async fetchAllDataForExport(): Promise<any[]> {
    // Fetch all data without pagination, sorting, or filtering
    // Use a very large page size to ensure we get ALL records
    const request: GridDataRequest = {
      procedureName: this.procedureName,
      pageNumber: 1,
      pageSize: 999999999 // Very large number to get all records from database
    };
    
    const response = await this.gridService.executeGridProcedure(request).toPromise();
    return response?.rows || [];
  }

  private getExportableColumns(): string[] {
    // Get all visible columns except the actions column
    return this.columnDefs
      .filter(col => col.field && col.field !== 'actions')
      .map(col => col.field!);
  }
}

// Interfaces for column visibility
interface ColumnInfo {
  field: string;
  headerName: string;
  visible: boolean;
  colDef: ColDef;
}

interface ColumnGroup {
  name: string;
  columns: ColumnInfo[];
  expanded: boolean;
}

// Interface for freeze columns
interface FreezeColumnInfo {
  field: string;
  headerName: string;
  pinned: boolean;
  colDef: ColDef;
}
