import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, themeQuartz } from 'ag-grid-community';

export interface GridRow {
  [key: string]: any;
}

@Component({
  selector: 'app-dynamic-grid',
  standalone: true,
  imports: [CommonModule, AgGridAngular],
  templateUrl: './dynamic-grid.html',
  styleUrls: ['./dynamic-grid.scss']
})
export class DynamicGrid implements OnInit {
  @Input() columnDefs: ColDef[] = [];
  @Input() rowData: GridRow[] = [];
  @Input() defaultColDef: ColDef = {
    flex: 1,
    minWidth: 100,
    resizable: true,
    sortable: true,
    filter: true
  };
  @Input() pagination = true;
  @Input() paginationPageSize = 15;
  @Input() domLayout: 'normal' | 'autoHeight' | 'print' = 'normal';
  
  paginationPageSizeSelector = [15, 25, 50];
  theme = themeQuartz;

  ngOnInit(): void {
    // Initialize grid with defaults if not provided
    if (this.columnDefs.length === 0 && this.rowData.length > 0) {
      this.generateColumnDefsFromData();
    }
  }

  /**
   * Auto-generate column definitions from data if not provided
   */
  private generateColumnDefsFromData(): void {
    if (this.rowData.length === 0) return;

    const firstRow = this.rowData[0];
    this.columnDefs = Object.keys(firstRow).map(key => ({
      field: key,
      headerName: key.charAt(0).toUpperCase() + key.slice(1)
    }));
  }
}
