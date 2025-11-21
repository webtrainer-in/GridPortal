import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DynamicTableComponent } from '../../shared/components/dynamic-table/dynamic-table';
import { DynamicTableConfig } from '../../shared/components/dynamic-table/models/dynamic-table.model';
import { ProjectsService, Project } from './projects.service';

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
  tableData: Project[] = [];
  isLoading: boolean = false;
  selectedRow: Project | null = null;

  // Define table columns configuration
  tableConfig: DynamicTableConfig = {
    columns: [
      {
        field: 'id',
        header: 'ID',
        width: '80px',
        dataType: 'number',
        sortable: true,
        filterable: true,
        align: 'center'
      },
      {
        field: 'name',
        header: 'Project Name',
        width: '250px',
        dataType: 'string',
        sortable: true,
        filterable: true
      },
      {
        field: 'description',
        header: 'Description',
        width: '300px',
        dataType: 'string',
        sortable: false,
        filterable: true
      },
      {
        field: 'status',
        header: 'Status',
        width: '120px',
        dataType: 'string',
        sortable: true,
        filterable: true,
        align: 'center'
      },
      {
        field: 'startDate',
        header: 'Start Date',
        width: '130px',
        dataType: 'date',
        sortable: true,
        filterable: false,
        align: 'center'
      },
      {
        field: 'endDate',
        header: 'End Date',
        width: '130px',
        dataType: 'date',
        sortable: true,
        filterable: false,
        align: 'center'
      },
      {
        field: 'budget',
        header: 'Budget',
        width: '120px',
        dataType: 'currency',
        sortable: true,
        filterable: false,
        align: 'right'
      },
      {
        field: 'progress',
        header: 'Progress %',
        width: '120px',
        dataType: 'number',
        sortable: true,
        filterable: false,
        align: 'center'
      },
      {
        field: 'teamLead',
        header: 'Team Lead',
        width: '150px',
        dataType: 'string',
        sortable: true,
        filterable: true
      },
      {
        field: 'isActive',
        header: 'Active',
        width: '100px',
        dataType: 'boolean',
        sortable: true,
        filterable: false,
        align: 'center'
      }
    ],
    dataKey: 'id',
    rowsPerPage: 10,
    paginator: true,
    globalFilterFields: ['name', 'description', 'status', 'teamLead'],
    showGridlines: true,
    striped: true,
    scrollable: false,
    resizableColumns: true,
    reorderableColumns: true
  };

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
        this.isLoading = false;
        this.cdr.markForCheck();
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
  onRowSelected(row: Project): void {
    this.selectedRow = row;
    console.log('Project selected:', row);
  }

  /**
   * Handle row double click
   */
  onRowDoubleClicked(row: Project): void {
    console.log('Project double clicked:', row);
    // Perform action like opening edit dialog, etc.
  }
}
