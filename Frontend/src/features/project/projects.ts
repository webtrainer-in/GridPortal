import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DynamicTableComponent } from '../../shared/components/dynamic-table/dynamic-table';
import { DynamicTableConfig } from '../../shared/components/dynamic-table/models/dynamic-table.model';
import { DynamicTableConfigGenerator } from '../../shared/components/dynamic-table/services/dynamic-table-config-generator.service';
import { ProjectsService } from './projects.service';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, DynamicTableComponent],
  template: `
    <div class="projects-container">
      <h2>Projects Management</h2>
      
      <app-dynamic-table
        [data]="tableData"
        [tableConfig]="tableConfig"
        [loading]="isLoading"
        fileName="projects-export"
        (rowSelected)="onRowSelected($event)"
        (rowDoubleClicked)="onRowDoubleClicked($event)"
      />

      <div *ngIf="selectedRow" class="selected-row-info">
        <h3>Selected Project:</h3>
        <pre>{{ selectedRow | json }}</pre>
      </div>
    </div>
  `,
  styles: [`
    .projects-container {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    h2 {
      margin-bottom: 1.5rem;
      color: var(--primary-color);
    }

    .selected-row-info {
      margin-top: 2rem;
      padding: 1rem;
      background-color: var(--surface-50);
      border-radius: 4px;
      border-left: 4px solid var(--primary-color);

      h3 {
        margin-top: 0;
        color: var(--primary-color);
      }

      pre {
        background-color: var(--surface-card);
        padding: 1rem;
        border-radius: 4px;
        overflow-x: auto;
        font-size: 0.875rem;
      }
    }
  `]
})
export class ProjectsComponent implements OnInit {
  tableData: any[] = [];
  isLoading: boolean = false;
  selectedRow: any | null = null;
  tableConfig: DynamicTableConfig = { columns: [] };

  constructor(
    private projectsService: ProjectsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadProjects();
  }

  /**
   * Load projects from service
   */
  loadProjects(): void {
    this.isLoading = true;

    this.projectsService.getProjects().subscribe({
      next: (response) => {
        this.tableData = response.data;
        
        // Generate table config dynamically from the data
        if (this.tableData.length > 0) {
          this.tableConfig = DynamicTableConfigGenerator.generateTableConfig(
            this.tableData,
            {
              globalFilterFields: ['name', 'description', 'status', 'teamLead']
            }
          );
        }
        
        this.isLoading = false;
        // Force change detection to propagate input changes
        setTimeout(() => {
          this.cdr.detectChanges();
        }, 0);
      },
      error: (error) => {
        console.error('Error loading projects:', error);
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Handle row selection
   */
  onRowSelected(row: any): void {
    this.selectedRow = row;
    console.log('Project selected:', row);
  }

  /**
   * Handle row double click
   */
  onRowDoubleClicked(row: any): void {
    console.log('Project double clicked:', row);
    // Perform action like opening edit dialog, etc.
  }
}
