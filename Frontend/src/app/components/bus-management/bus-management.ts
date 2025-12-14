import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DynamicGrid } from '../../../shared/components/dynamic-grid/dynamic-grid';

@Component({
  selector: 'app-bus-management',
  standalone: true,
  imports: [CommonModule, DynamicGrid],
  templateUrl: './bus-management.html',
  styleUrls: ['./bus-management.scss']
})
export class BusManagementComponent {
  // Grid configuration
  busGridProcedure = 'sp_Grid_Buses';
  
  constructor() {
    console.log('Bus Management Component initialized');
  }

  /**
   * Refresh the grid data
   */
  refreshGrid() {
    // The grid will automatically refresh when the procedure name changes
    // For now, we can just log
    console.log('Refresh grid clicked');
  }

  /**
   * Export grid data
   */
  exportData() {
    console.log('Export data clicked');
    // TODO: Implement export functionality
  }

  /**
   * Add new bus
   */
  addBus() {
    console.log('Add bus clicked');
    // TODO: Navigate to add bus form or open modal
  }
}
