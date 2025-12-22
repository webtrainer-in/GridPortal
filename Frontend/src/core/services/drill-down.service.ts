import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router, ActivatedRoute } from '@angular/router';
import { DrillDownState, DrillDownLevel, DrillDownConfig } from '../models/drill-down.model';

@Injectable({
  providedIn: 'root'
})
export class DrillDownService {
  private drillDownState$ = new BehaviorSubject<DrillDownState>({
    levels: [],
    currentLevel: 0
  });

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Initialize from URL on service creation
    this.initializeFromUrl();
  }

  getDrillDownState(): Observable<DrillDownState> {
    return this.drillDownState$.asObservable();
  }

  getCurrentState(): DrillDownState {
    return this.drillDownState$.value;
  }

  /**
   * Drill down to a new level
   */
  drillDown(config: DrillDownConfig, rowData: any, baseProcedure: string): void {
    const currentState = this.getCurrentState();
    
    // Check max depth
    if (currentState.currentLevel >= config.maxDepth) {
      console.warn(`Maximum drill-down depth (${config.maxDepth}) reached`);
      return;
    }

    // Build filters from row data
    const filters = this.buildFilters(config.filterParams, rowData);
    
    // Build breadcrumb label
    const breadcrumbLabel = this.buildBreadcrumbLabel(config.breadcrumbLabel, rowData);

    // Create new level
    const newLevel: DrillDownLevel = {
      procedureName: config.targetProcedure,
      displayName: config.targetProcedure,
      filters: filters,
      breadcrumbLabel: breadcrumbLabel
    };

    // If this is the first drill-down, add the base level
    let levels = [...currentState.levels];
    if (levels.length === 0) {
      levels.push({
        procedureName: baseProcedure,
        displayName: baseProcedure,
        filters: {},
        breadcrumbLabel: this.getProcedureDisplayName(baseProcedure)
      });
    }

    // Add new level
    levels.push(newLevel);

    const newState: DrillDownState = {
      levels: levels,
      currentLevel: levels.length - 1
    };

    this.drillDownState$.next(newState);
    this.updateUrl(newState);
  }

  /**
   * Navigate back one level
   */
  goBack(): void {
    const currentState = this.getCurrentState();
    if (currentState.currentLevel > 0) {
      this.goToLevel(currentState.currentLevel - 1);
    }
  }

  /**
   * Jump to a specific level
   */
  goToLevel(levelIndex: number): void {
    const currentState = this.getCurrentState();
    
    if (levelIndex < 0 || levelIndex >= currentState.levels.length) {
      return;
    }

    // Special case: going back to root (level 0) means clearing drill-down
    if (levelIndex === 0) {
      this.reset();
      return;
    }

    // Remove all levels after the target level
    const newLevels = currentState.levels.slice(0, levelIndex + 1);

    const newState: DrillDownState = {
      levels: newLevels,
      currentLevel: levelIndex
    };

    this.drillDownState$.next(newState);
    this.updateUrl(newState);
  }

  /**
   * Reset drill-down state
   */
  reset(): void {
    const newState: DrillDownState = {
      levels: [],
      currentLevel: 0
    };
    
    this.drillDownState$.next(newState);
    this.updateUrl(newState);
  }

  /**
   * Build filters from row data
   */
  private buildFilters(filterParams: any[], rowData: any): Record<string, any> {
    const filters: Record<string, any> = {};

    for (const param of filterParams) {
      const values: any[] = [];
      
      // Collect values from source fields
      for (const field of param.sourceFields) {
        const value = rowData[field];
        if (value !== null && value !== undefined) {
          values.push(value);
        }
      }

      // Skip if no values
      if (values.length === 0) continue;

      // Build filter value
      if (values.length === 1) {
        filters[param.targetColumn] = values[0];
      } else if (param.separator) {
        filters[param.targetColumn] = values.join(param.separator);
      } else {
        filters[param.targetColumn] = values.join('_');
      }
    }

    return filters;
  }

  /**
   * Build breadcrumb label from template
   */
  private buildBreadcrumbLabel(template: string, rowData: any): string {
    let label = template;
    
    // Replace {field} placeholders with actual values
    const matches = template.match(/\{([^}]+)\}/g);
    if (matches) {
      for (const match of matches) {
        const field = match.slice(1, -1); // Remove { }
        const value = rowData[field] ?? '';
        label = label.replace(match, value);
      }
    }

    return label;
  }

  /**
   * Get display name for procedure
   */
  private getProcedureDisplayName(procedureName: string): string {
    // Convert sp_Grid_Buses to "Buses"
    const match = procedureName.match(/sp_Grid_(.+)/);
    return match ? match[1] : procedureName;
  }

  /**
   * Update URL with drill-down state
   * FIX: Clear params when at root level to prevent stale data
   */
  private updateUrl(state: DrillDownState): void {
    let queryParams: any = {};

    // Only add drill-down params if we're actually drilled down (not at root)
    if (state.levels.length > 0 && state.currentLevel > 0) {
      const drillPath = state.levels.map(l => l.procedureName).join('|');
      const filterPath = state.levels.map(l => JSON.stringify(l.filters)).join('|');
      const breadcrumbPath = state.levels.map(l => l.breadcrumbLabel).join('>');

      queryParams['drill'] = drillPath;
      queryParams['filters'] = filterPath;
      queryParams['breadcrumbs'] = breadcrumbPath;
      queryParams['level'] = state.currentLevel;
    } else {
      // Clear all drill-down params when at root
      queryParams = {
        drill: null,
        filters: null,
        breadcrumbs: null,
        level: null
      };
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: queryParams,
      replaceUrl: true
    });
  }

  /**
   * Initialize state from URL query params
   */
  private initializeFromUrl(): void {
    this.route.queryParams.subscribe(params => {
      if (params['drill']) {
        try {
          const procedures = params['drill'].split('|');
          const filters = params['filters'].split('|').map((f: string) => JSON.parse(f));
          const breadcrumbs = params['breadcrumbs'].split('>');
          const currentLevel = parseInt(params['level'] || '0');

          const levels: DrillDownLevel[] = procedures.map((proc: string, index: number) => ({
            procedureName: proc,
            displayName: proc,
            filters: filters[index] || {},
            breadcrumbLabel: breadcrumbs[index] || proc
          }));

          this.drillDownState$.next({
            levels: levels,
            currentLevel: currentLevel
          });
        } catch (error) {
          console.error('Error parsing drill-down state from URL:', error);
          this.reset();
        }
      }
    });
  }
}
