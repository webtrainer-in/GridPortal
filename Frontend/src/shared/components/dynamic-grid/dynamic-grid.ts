import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent, themeQuartz } from 'ag-grid-community';
import { DynamicGridService, GridDataRequest, ColumnDefinition, DropdownOption, DropdownValuesRequest } from '../../../core/services/dynamic-grid.service';
import { ActionButtonsRendererComponent } from './action-buttons-renderer.component';
import { EditableCellRendererComponent } from './editable-cell-renderer.component';
import { LinkCellRendererComponent } from './link-cell-renderer.component';
import { DrillDownBreadcrumbComponent } from '../drill-down-breadcrumb/drill-down-breadcrumb.component';
import { DrillDownService } from '../../../core/services/drill-down.service';
import { DrillDownLevel } from '../../../core/models/drill-down.model';
import { Subject, takeUntil } from 'rxjs';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-dynamic-grid',
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridAngular, ConfirmDialogModule, ToastModule, DrillDownBreadcrumbComponent],
  providers: [ConfirmationService, MessageService],
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
  
  // Infinite scroll configuration
  @Input() enableInfiniteScrollToggle: boolean = true; // Allow users to toggle modes
  @Input() defaultPaginationMode: 'traditional' | 'infinite' = 'traditional';
  @Input() infiniteScrollBatchSize: number = 1000;
  @Input() infiniteScrollWindowSize: number = 10000 // For windowed mode (>10k rows)
  @Input() infiniteScrollThreshold: number = 0.8; // Load at 80% scroll
  
  columnDefs: ColDef[] = [];
  rowData: any[] = [];
  allRowData: any[] = []; // Store all data for client-side pagination
  gridApi!: GridApi;
  theme = themeQuartz;
  editingRows: Set<any> = new Set();
  editedRows: Map<any, any> = new Map(); // Map of rowId -> original data
  hasUnsavedChanges: boolean = false;
  isSaving: boolean = false;
  
  // Column definitions (for dropdown support)
  columns: ColumnDefinition[] = [];
  
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
  
  // Drill-down state
  drillDownLevels: DrillDownLevel[] = [];
  currentDrillLevel: number = 0;
  isDrilledDown: boolean = false;
  isStatelessMode: boolean = false; // Track unlimited drill-down mode
  originalProcedureName: string = ''; // Store original procedure name for restoration
  drillDownFilters: any = null; // Store drill-down filters to preserve across search/pagination
  
  // Freeze columns state
  showFreezeMenu: boolean = false;
  freezableColumns: FreezeColumnInfo[] = [];
  
  // Export menu state
  showExportMenu: boolean = false;
  
  // Global search state
  globalSearchTerm: string = '';
  
  // Pagination mode state
  paginationMode: 'traditional' | 'infinite' = 'traditional';
  infiniteScrollStrategy: 'full' | 'windowed' = 'full';
  
  // Infinite scroll state
  isInfiniteScrollMode: boolean = false;
  isLoadingMore: boolean = false;
  hasMoreData: boolean = true;
  lastLoadedRow: number = 0;
  
  // Windowed scroll state (for >10k rows)
  windowedScrollActive: boolean = false;
  virtualRowStart: number = 0;
  virtualRowEnd: number = 0;
  currentWindowRows: any[] = [];
  
  // New row state
  isAddingNewRow: boolean = false;
  newRowTempId: string | null = null;
  
  private destroy$ = new Subject<void>();

  // Make Math available in template
  Math = Math;

  constructor(
    private gridService: DynamicGridService,
    private cdr: ChangeDetectorRef,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private drillDownService: DrillDownService
  ) {}

  ngOnInit(): void {
    if (!this.procedureName) {
      console.error('DynamicGrid: procedureName is required');
    }
    
    // Store the original procedure name for restoration when returning from drill-down
    this.originalProcedureName = this.procedureName;
    
    // Initialize pagination mode from input
    this.paginationMode = this.defaultPaginationMode;
    
    // Subscribe to drill-down state
    this.drillDownService.getDrillDownState()
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        console.log('📊 Drill-down state changed:', state);
        const wasDrilledDown = this.isDrilledDown;
        
        this.drillDownLevels = state.levels;
        this.currentDrillLevel = state.currentLevel;
        this.isDrilledDown = state.currentLevel > 0;
        this.isStatelessMode = state.isStatelessMode;
        
        // Reload grid with drilled-down procedure
        if (state.currentLevel > 0 && state.levels.length > 0) {
          const currentLevel = state.levels[state.currentLevel];
          this.loadDrilledDownData(currentLevel);
        } else if (state.currentLevel === 0 && state.levels.length === 1 && state.isStatelessMode) {
          // STATELESS MODE with single level: This is a valid drilled-down state
          // Load the grid for this level (happens when navigating via browser back)
          const currentLevel = state.levels[0];
          this.loadDrilledDownData(currentLevel);
        } else {
          // We're at root
          const needsReload = wasDrilledDown || this.procedureName !== this.originalProcedureName;
          
          if (needsReload) {
            // Returning from drill-down - restore original procedure name
            console.log('🔄 Returning from drill-down - restoring original procedure name');
            this.procedureName = this.originalProcedureName;
            console.log(`🔄 Procedure name restored to: ${this.procedureName}`);
            
            // Clear drill-down filters
            this.drillDownFilters = null;
            console.log('🔄 Drill-down filters cleared');
            
            // Clear columns to force refresh
            this.columnDefs = [];
            this.columns = [];
            
            // IMPORTANT: Clear row data to force complete refresh
            this.rowData = [];
            this.totalCount = 0;
            
            if (this.gridApi) {
              this.gridApi.setGridOption('columnDefs', []);
              this.gridApi.setGridOption('rowData', []);
            }
            
            // Load root grid data (will fetch fresh columns and data)
            console.log(`🔄 Loading root grid data for procedure: ${this.procedureName}`);
            this.loadGridData();
          }
        }
      });
    
    // Add keyboard listener for Backspace
    this.setupKeyboardNavigation();
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
    if (!this.gridApi) return;

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

    if (this.isInfiniteScrollMode) {
      // Reset infinite scroll and reload from start
      console.log('🔄 Resetting infinite scroll due to sort change');
      this.resetInfiniteScroll();
      this.loadGridData();
    } else if (this.isServerSidePagination) {
      // Reload current page with new sort (traditional pagination)
      this.loadPageData(this.currentPage);
    }
    // Client-side pagination: AG-Grid handles sorting automatically
  }

  onFilterChanged(): void {
    if (!this.gridApi) return;

    const filterModel = this.gridApi.getFilterModel();
    this.currentFilterModel = Object.keys(filterModel).length > 0 ? filterModel : null;
    
    if (this.currentFilterModel) {
      console.log('🔍 Filter changed:', JSON.stringify(this.currentFilterModel));
    } else {
      console.log('🔍 Filter cleared');
    }

    if (this.isInfiniteScrollMode) {
      // Reset infinite scroll and reload from start with filter (server-side)
      console.log('🔄 Resetting infinite scroll due to filter change');
      this.resetInfiniteScroll();
      this.loadGridData();
    } else if (this.isServerSidePagination) {
      // Reload from page 1 with new filter (traditional pagination)
      this.loadPageData(1);
    }
    // Client-side pagination: AG-Grid handles filtering automatically
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
          
          // Determine pagination/scroll strategy
          this.determineScrollStrategy();
          
          if (this.isInfiniteScrollMode) {
            // Infinite scroll mode
            console.log(`✅ Using INFINITE SCROLL mode (${this.infiniteScrollStrategy})`);
            this.loadInitialBatchForInfiniteScroll(response);
          } else if (this.totalCount < this.paginationThreshold) {
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
      // Always update column definitions if response contains columns
      // This is important for drill-down scenarios where columns change
      if (response.columns) {
        console.log('📋 Updating column definitions...');
        this.updateColumnDefinitions(response.columns);
      }
      
      this.rowData = response.rows || [];
      console.log(`✅ Setting rowData with ${this.rowData.length} rows`);
      
      // Update total count from response (important for drill-down)
      if (response.totalCount !== undefined) {
        this.totalCount = response.totalCount;
        console.log(`📊 Total count updated to: ${this.totalCount}`);
        
        // Recalculate total pages based on new total count
        this.totalPages = Math.ceil(this.totalCount / this.pageSize);
        console.log(`📄 Total pages recalculated to: ${this.totalPages}`);
        
        // Also update lastLoadedRow for infinite scroll mode
        if (this.isInfiniteScrollMode) {
          this.lastLoadedRow = this.rowData.length;
          console.log(`📊 Last loaded row updated to: ${this.lastLoadedRow}`);
        }
      }
      
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
    if (this.drillDownFilters) {
      console.log(`🔍 Drill-down filters:`, this.drillDownFilters);
    }
    this.isLoading = true;
    
    const request: GridDataRequest = {
      procedureName: this.procedureName,
      pageNumber: page,
      pageSize: this.pageSize,
      sortColumn: this.currentSortColumn || undefined,
      sortDirection: this.currentSortDirection,
      filterJson: this.drillDownFilters ? JSON.stringify(this.drillDownFilters) : (this.currentFilterModel ? JSON.stringify(this.currentFilterModel) : undefined),
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

  // Drill-down methods
  private loadDrilledDownData(level: DrillDownLevel): void {
    console.log('📊 Loading drilled-down data:', level);
    this.setLoading(true);
    
    // Update procedure name to the drilled-down procedure
    // This ensures search/filter operations use the correct procedure
    this.procedureName = level.procedureName;
    console.log(`🔄 Procedure name updated to: ${this.procedureName}`);
    
    // Store drill-down filters to preserve them across search/pagination
    this.drillDownFilters = level.filters;
    console.log(`🔄 Drill-down filters stored:`, this.drillDownFilters);
    
    const request: GridDataRequest = {
      procedureName: level.procedureName,
      pageNumber: 1,
      pageSize: this.pageSize,
      filterJson: JSON.stringify(level.filters)
    };

    this.gridService.executeGridProcedure(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Drilled-down data loaded:', response);
          this.setupGridWithData(response);
        },
        error: (error) => {
          console.error('❌ Error loading drilled-down data:', error);
          this.setLoading(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Load Error',
            detail: 'Failed to load drilled-down data.',
            life: 3000
          });
        }
      });
  }

  private setupKeyboardNavigation(): void {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Backspace to go back (only if not in input/textarea)
      if (event.key === 'Backspace' && 
          this.isDrilledDown &&
          !['INPUT', 'TEXTAREA'].includes((event.target as HTMLElement).tagName)) {
        event.preventDefault();
        this.onDrillDownBack();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    
    // Cleanup on destroy
    this.destroy$.subscribe(() => {
      document.removeEventListener('keydown', handleKeyPress);
    });
  }

  onDrillDownNavigate(levelIndex: number): void {
    this.drillDownService.goToLevel(levelIndex);
  }

  onDrillDownBack(): void {
    this.drillDownService.goBack();
  }

  private updateColumnDefinitions(columns: ColumnDefinition[]): void {
    // Store columns for dropdown support
    this.columns = columns;
    
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
            onSaveNew: (rowData: any) => this.saveNewRow(rowData),
            onCancelNew: (rowData: any) => this.cancelNewRow(rowData),
            isEditing: (rowData: any) => this.editingRows.has(rowData.Id),
            confirmationService: this.confirmationService
          },
          editable: false,
          sortable: false,
          filter: false
        });
      } else {
        // Check if column is actually editable (from backend config)
        const isEditableColumn = this.enableRowEditing && col.editable && col.field !== 'Id';
        const hasLinkConfig = col.linkConfig?.enabled;
        
        const colDef: any = {
          field: col.field,
          headerName: col.headerName,
          width: col.width,
          sortable: col.sortable,
          filter: col.filter,
          editable: false,
          singleClickEdit: false
        };
        
        // If column is editable, use EditableCellRenderer (even if it has linkConfig)
        // The EditableCellRenderer will show text input in edit mode and link in view mode
        if (isEditableColumn) {
          colDef.cellRenderer = EditableCellRendererComponent;
          colDef.cellRendererParams = {
            isEditing: (rowData: any) => this.editingRows.has(rowData.Id),
            columnType: col.type,
            linkConfig: hasLinkConfig ? col.linkConfig : undefined, // Pass linkConfig for view mode
            dropdownConfig: col.dropdownConfig,
            loadDropdownValues: col.dropdownConfig ? 
              (field: string, rowContext: any) => this.loadDropdownValues(field, rowContext) : 
              undefined,
            onCascadingChange: col.dropdownConfig?.dependsOn && col.dropdownConfig.dependsOn.length > 0 ?
              (field: string, value: any, rowData: any) => this.handleCascadingChange(field, value, rowData) :
              undefined
          };
        }
        // If column has link but is NOT editable, use LinkCellRenderer
        else if (hasLinkConfig) {
          colDef.cellRenderer = LinkCellRendererComponent;
          colDef.cellRendererParams = {
            linkConfig: col.linkConfig,
            baseProcedure: this.procedureName
          };
        }
        
        // Add column group if provided
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
    // Track this row as edited if not already tracked
    // Don't track new rows in editedRows - they use saveNewRow() instead
    if (!this.editedRows.has(rowData.Id) && !rowData._isNewRow) {
      this.editedRows.set(rowData.Id, { ...rowData });
      this.hasUnsavedChanges = true;
    }
    
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
            this.editedRows.delete(rowData.Id); // Clear from edited rows
            this.hasUnsavedChanges = this.editedRows.size > 0; // Update flag
            delete rowData._originalData;
            
            // Redraw the entire row to update all cells including action buttons
            this.gridApi?.redrawRows();
            
            // Show success toast notification
            this.messageService.add({
              severity: 'success',
              summary: 'Saved',
              detail: 'Record saved successfully',
              life: 3000
            });
            
            console.log('✅ Row saved successfully');
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'Save Failed',
              detail: response.message || 'Failed to save row',
              life: 3000
            });
          }
        },
        error: (error) => {
          console.error('Error saving row:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Save Error',
            detail: 'Failed to save. Please try again.',
            life: 3000
          });
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
    this.editedRows.delete(rowData.Id); // Clear from edited rows
    this.hasUnsavedChanges = this.editedRows.size > 0; // Update flag
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
            console.log('✅ Row deleted successfully');
            
            // Reload data based on current mode
            if (this.isDrilledDown) {
              // In drill-down mode, reload the drilled-down data
              const currentLevel = this.drillDownLevels[this.currentDrillLevel];
              this.loadDrilledDownData(currentLevel);
            } else if (this.isServerSidePagination || this.isInfiniteScrollMode) {
              // Reload current page for server-side or infinite scroll
              if (this.isInfiniteScrollMode) {
                this.resetInfiniteScroll();
              }
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
            
            this.messageService.add({
              severity: 'success',
              summary: 'Deleted',
              detail: 'Record deleted successfully',
              life: 3000
            });
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'Delete Failed',
              detail: response.message || 'Failed to delete row',
              life: 3000
            });
          }
        },
        error: (error) => {
          console.error('Error deleting row:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Delete Error',
            detail: 'Failed to delete. Please try again.',
            life: 3000
          });
        }
      });
  }

  addNewRow(): void {
    if (this.isAddingNewRow) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Already Adding',
        detail: 'Please save or cancel the current new row first',
        life: 3000
      });
      return;
    }

    // Create temporary ID
    this.newRowTempId = `new_temp_${Date.now()}`;
    
    // Create new row object with empty values
    const newRow: any = {
      Id: this.newRowTempId,
      _isNewRow: true
    };
    
    // Initialize all editable fields as null
    this.columns.forEach(col => {
      if (col.field !== 'Id' && col.field !== 'actions') {
        newRow[col.field] = null;
      }
    });
    
    // Add to top of grid
    this.rowData = [newRow, ...this.rowData];
    this.isAddingNewRow = true;
    
    // Refresh grid
    if (this.gridApi) {
      this.gridApi.setGridOption('rowData', this.rowData);
    }
    
    // Automatically enter edit mode
    this.enableRowEdit(newRow);
    
    console.log('✅ New row added with temp ID:', this.newRowTempId);
  }

  saveNewRow(rowData: any): void {
    if (!rowData._isNewRow) {
      console.error('❌ Attempted to save non-new row as new');
      return;
    }

    // Extract field values (exclude metadata and temp ID)
    const fieldValues: Record<string, any> = {};
    Object.keys(rowData).forEach(key => {
      if (key !== 'Id' && key !== '_isNewRow' && key !== '_originalData' && key !== 'actions') {
        // Convert field name to lowercase to match backend expectations
        fieldValues[key.toLowerCase()] = rowData[key];
      }
    });

    console.log('💾 Saving new row with values:', fieldValues);

    const createRequest = {
      procedureName: this.procedureName,
      fieldValues: fieldValues
    };

    this.gridService.createRow(createRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.createdRow) {
            console.log('✅ Row created successfully:', response.createdRow);
            
            // Remove temporary row
            const tempIndex = this.rowData.findIndex(r => r.Id === this.newRowTempId);
            if (tempIndex > -1) {
              this.rowData.splice(tempIndex, 1);
            }
            
            // Add the real row with actual ID
            this.rowData = [response.createdRow, ...this.rowData];
            
            // Update total count
            this.totalCount++;
            if (!this.isServerSidePagination && !this.isInfiniteScrollMode) {
              this.allRowData = [response.createdRow, ...this.allRowData];
            }
            
            // Clear new row state
            this.isAddingNewRow = false;
            this.newRowTempId = null;
            this.editingRows.delete(rowData.Id);
            
            // Refresh grid
            if (this.gridApi) {
              this.gridApi.setGridOption('rowData', this.rowData);
            }
            
            this.messageService.add({
              severity: 'success',
              summary: 'Created',
              detail: 'Record created successfully',
              life: 3000
            });
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'Create Failed',
              detail: response.message || 'Failed to create row',
              life: 5000
            });
          }
        },
        error: (error) => {
          console.error('❌ Error creating row:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Create Error',
            detail: 'Failed to create row. Please try again.',
            life: 5000
          });
        }
      });
  }

  cancelNewRow(rowData: any): void {
    if (!rowData._isNewRow) {
      console.error('❌ Attempted to cancel non-new row');
      return;
    }

    // Remove the temporary row from grid
    const tempIndex = this.rowData.findIndex(r => r.Id === this.newRowTempId);
    if (tempIndex > -1) {
      this.rowData.splice(tempIndex, 1);
    }
    
    // Clear new row state
    this.isAddingNewRow = false;
    this.newRowTempId = null;
    this.editingRows.delete(rowData.Id);
    
    // Refresh grid
    if (this.gridApi) {
      this.gridApi.setGridOption('rowData', this.rowData);
    }
    
    console.log('✅ New row cancelled');
  }


  async saveAllChanges(): Promise<void> {
    if (this.editedRows.size === 0) return;
    
    this.isSaving = true;
    const savePromises: Promise<any>[] = [];
    const failedRows: Array<{rowId: any, error: any}> = [];
    const rowsToSave: any[] = [];
    
    // Collect all rows that need saving
    this.editedRows.forEach((originalData, rowId) => {
      const currentRow = this.isServerSidePagination 
        ? this.rowData.find(r => r.Id === rowId)
        : this.allRowData.find(r => r.Id === rowId);
        
      if (!currentRow) return;
      
      // Calculate changes
      const changes: Record<string, any> = {};
      Object.keys(currentRow).forEach(key => {
        if (key !== '_originalData' && key !== 'Id' && 
            currentRow[key] !== originalData[key]) {
          changes[key] = currentRow[key];
        }
      });
      
      if (Object.keys(changes).length > 0) {
        rowsToSave.push({ rowId, currentRow, changes });
      }
    });
    
    console.log(`💾 Saving ${rowsToSave.length} row(s)...`);
    
    // Create save promises for all rows
    rowsToSave.forEach(({ rowId, changes }) => {
      const promise = this.gridService.updateRow({
        procedureName: this.procedureName,
        rowId: rowId,
        changes: changes
      }).toPromise()
        .catch(error => {
          failedRows.push({ rowId, error });
          return null;
        });
      
      savePromises.push(promise);
    });
    
    // Wait for all saves to complete
    await Promise.all(savePromises);
    
    // Handle results
    if (failedRows.length === 0) {
      // All saves successful
      console.log('🎯 Before clear - editedRows size:', this.editedRows.size, 'hasUnsavedChanges:', this.hasUnsavedChanges);
      this.editedRows.clear();
      this.editingRows.clear();
      this.hasUnsavedChanges = false;
      this.isSaving = false;
      console.log('🎯 After clear - editedRows size:', this.editedRows.size, 'hasUnsavedChanges:', this.hasUnsavedChanges);
      
      // Manually trigger change detection to update button visibility
      this.cdr.detectChanges();
      
      this.gridApi?.redrawRows();
      this.messageService.add({
        severity: 'success',
        summary: 'Save Successful',
        detail: `Successfully saved ${savePromises.length} row(s)`,
        life: 3000
      });
      console.log(`✅ All ${savePromises.length} row(s) saved successfully`);
    } else {
      // Some saves failed
      const successCount = savePromises.length - failedRows.length;
      this.messageService.add({
        severity: 'warn',
        summary: 'Partial Save',
        detail: `Saved ${successCount} row(s), but ${failedRows.length} failed. Please check and retry.`,
        life: 5000
      });
      console.error('Failed rows:', failedRows);
      
      // Remove successful saves from editedRows
      this.editedRows.forEach((_, rowId) => {
        if (!failedRows.find(f => f.rowId === rowId)) {
          this.editedRows.delete(rowId);
          this.editingRows.delete(rowId);
        }
      });
      
      this.hasUnsavedChanges = this.editedRows.size > 0;
      this.isSaving = false;
      
      // Manually trigger change detection
      this.cdr.detectChanges();
    }
    
    console.log('🎯 Final state - editedRows size:', this.editedRows.size, 'hasUnsavedChanges:', this.hasUnsavedChanges);
    this.gridApi?.refreshCells({ force: true });
  }

  getRowStyle = (params: any) => {
    // New row being added (light green)
    if (params.data?._isNewRow) {
      return { background: '#e6ffe6' };
    }
    // Currently editing (light yellow)
    if (this.editingRows.has(params.data?.Id)) {
      return { background: '#fff9e6' };
    }
    // Has unsaved changes (light red)
    if (this.editedRows.has(params.data?.Id)) {
      return { background: '#ffe6e6' };
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

  // Infinite Scroll Methods
  private determineScrollStrategy(): void {
    if (this.paginationMode === 'traditional') {
      this.isInfiniteScrollMode = false;
      return;
    }

    // Infinite scroll mode selected
    this.isInfiniteScrollMode = true;

    if (this.totalCount < 1000) {
      // Small dataset: use existing client-side pagination
      this.isServerSidePagination = false;
      this.infiniteScrollStrategy = 'full';
      this.windowedScrollActive = false;
    } else if (this.totalCount <= 10000) {
      // Medium dataset: infinite scroll, keep all in memory
      this.isServerSidePagination = true;
      this.infiniteScrollStrategy = 'full';
      this.windowedScrollActive = false;
    } else {
      // Large dataset: windowed scroll with memory management
      this.isServerSidePagination = true;
      this.infiniteScrollStrategy = 'windowed';
      this.windowedScrollActive = true;
    }
  }

  private loadInitialBatchForInfiniteScroll(response: any): void {
    if (this.columnDefs.length === 0 && response.columns) {
      this.updateColumnDefinitions(response.columns);
    }

    this.rowData = response.rows || [];
    this.lastLoadedRow = this.rowData.length;
    this.hasMoreData = this.lastLoadedRow < this.totalCount;

    if (this.windowedScrollActive) {
      this.currentWindowRows = this.rowData;
      this.virtualRowStart = 0;
      this.virtualRowEnd = this.rowData.length;
    }

    this.setLoading(false);

    if (this.gridApi) {
      this.gridApi.setGridOption('rowData', this.rowData);
    }

    console.log(`✅ Initial batch loaded: ${this.rowData.length} rows, hasMore: ${this.hasMoreData}`);
  }

  onBodyScroll(event: any): void {
    if (!this.isInfiniteScrollMode || this.isLoadingMore || !this.hasMoreData) {
      return;
    }

    const api = this.gridApi;
    if (!api) return;

    // Calculate scroll percentage
    const lastRow = api.getDisplayedRowCount() - 1;
    const lastRenderedRow = api.getLastDisplayedRowIndex();
    
    if (lastRow <= 0) return;
    
    const scrollPercentage = lastRenderedRow / lastRow;

    // Load more when threshold reached
    if (scrollPercentage >= this.infiniteScrollThreshold) {
      this.loadNextBatch();
    }
  }

  private loadNextBatch(): void {
    if (this.isLoadingMore || !this.hasMoreData) return;

    this.isLoadingMore = true;
    const nextPage = Math.floor(this.lastLoadedRow / this.infiniteScrollBatchSize) + 1;

    console.log(`📥 Loading batch ${nextPage}...`);

    const request: GridDataRequest = {
      procedureName: this.procedureName,
      pageNumber: nextPage,
      pageSize: this.infiniteScrollBatchSize,
      sortColumn: this.currentSortColumn || undefined,
      sortDirection: this.currentSortDirection,
      filterJson: this.currentFilterModel ? JSON.stringify(this.currentFilterModel) : undefined,
      searchTerm: this.globalSearchTerm || undefined
    };

    this.gridService.executeGridProcedure(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const newRows = response.rows || [];
          
          if (this.windowedScrollActive) {
            // Windowed mode: manage memory
            this.appendRowsWithWindowManagement(newRows);
          } else {
            // Full mode: append all rows
            this.rowData = [...this.rowData, ...newRows];
          }

          this.lastLoadedRow += newRows.length;
          // Cap lastLoadedRow to totalCount to prevent display issues
          this.lastLoadedRow = Math.min(this.lastLoadedRow, this.totalCount);
          this.hasMoreData = this.lastLoadedRow < this.totalCount;
          this.isLoadingMore = false;

          this.gridApi?.setGridOption('rowData', this.rowData);
          
          console.log(`✅ Batch loaded: ${newRows.length} rows, total loaded: ${this.lastLoadedRow}/${this.totalCount}`);
        },
        error: (error) => {
          console.error('❌ Error loading next batch:', error);
          this.isLoadingMore = false;
        }
      });
  }

  private appendRowsWithWindowManagement(newRows: any[]): void {
    // Add new rows
    this.currentWindowRows = [...this.currentWindowRows, ...newRows];
    this.virtualRowEnd += newRows.length;

    // Remove old rows if window size exceeded
    if (this.currentWindowRows.length > this.infiniteScrollWindowSize) {
      const rowsToRemove = this.currentWindowRows.length - this.infiniteScrollWindowSize;
      this.currentWindowRows = this.currentWindowRows.slice(rowsToRemove);
      this.virtualRowStart += rowsToRemove;
      
      console.log(`🪟 Window managed: removed ${rowsToRemove} old rows, showing ${this.virtualRowStart}-${this.virtualRowEnd}`);
    }

    this.rowData = this.currentWindowRows;
  }

  togglePaginationMode(): void {
    this.paginationMode = this.paginationMode === 'traditional' ? 'infinite' : 'traditional';
    console.log(`🔄 Switched to ${this.paginationMode} mode`);
    
    // Reset state and reload data
    this.resetInfiniteScroll();
    this.loadGridData();
  }

  private resetInfiniteScroll(): void {
    this.rowData = [];
    this.lastLoadedRow = 0;
    this.hasMoreData = true;
    this.isLoadingMore = false;
    this.virtualRowStart = 0;
    this.virtualRowEnd = 0;
    this.currentWindowRows = [];
    this.currentPage = 1;
  }

  getModeDisplayText(): string {
    if (this.isInfiniteScrollMode) {
      if (this.windowedScrollActive) {
        return 'Infinite Scroll (Windowed)';
      }
      return 'Infinite Scroll';
    } else if (this.isServerSidePagination) {
      return 'Server-Side Pagination';
    } else {
      return 'Client-Side Pagination';
    }
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
      .filter(col => col.field !== 'actions' && !col.hide)
      .map(col => col.field as string);
  }

  // =============================================
  // Dropdown Support Methods
  // =============================================

  /**
   * Load dropdown values for a specific field with row context
   */
  private async loadDropdownValues(field: string, rowContext: any): Promise<DropdownOption[]> {
    const column = this.columns.find((col: ColumnDefinition) => col.field === field);
    if (!column?.dropdownConfig) {
      return [];
    }

    const config = column.dropdownConfig;

    // Handle static dropdowns
    if (config.type === 'static' && config.staticValues) {
      return config.staticValues;
    }

    // Handle dynamic dropdowns
    if (config.type === 'dynamic' && config.masterTable && config.valueField && config.labelField) {
      const request: DropdownValuesRequest = {
        procedureName: this.procedureName,
        masterTable: config.masterTable,
        valueField: config.valueField,
        labelField: config.labelField,
        filterCondition: config.filterCondition,
        rowContext: rowContext
      };

      try {
        return await this.gridService.getDropdownValues(request).toPromise() || [];
      } catch (error) {
        console.error('Error loading dropdown values:', error);
        return [];
      }
    }

    return [];
  }

  /**
   * Handle cascading dropdown changes
   */
  private handleCascadingChange(changedField: string, newValue: any, rowData: any): void {
    // Find all columns that depend on the changed field
    const dependentColumns = this.columns.filter((col: ColumnDefinition) => 
      col.dropdownConfig?.dependsOn?.includes(changedField)
    );

    if (dependentColumns.length === 0) {
      return;
    }

    // Clear values of dependent fields
    dependentColumns.forEach((col: ColumnDefinition) => {
      rowData[col.field] = null;
    });

    // Refresh the cells to reload dropdown options
    const rowNode = this.gridApi.getRowNode(rowData.Id);
    if (rowNode) {
      const fieldsToRefresh = dependentColumns.map((col: ColumnDefinition) => col.field);
      this.gridApi.refreshCells({
        rowNodes: [rowNode],
        columns: fieldsToRefresh,
        force: true
      });
    }
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
