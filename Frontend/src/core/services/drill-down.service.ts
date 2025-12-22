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
    currentLevel: 0,
    isStatelessMode: false
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

  drillDown(config: DrillDownConfig, rowData: any, baseProcedure: string): void {
    const currentState = this.getCurrentState();
    
    console.log('🔍 DrillDown called with config.maxDepth:', config.maxDepth);
    console.log('🔍 Target procedure:', config.targetProcedure);
    console.log('🔍 Base procedure:', baseProcedure);
    console.log('🔍 Current state:', currentState);
    
    // Determine if this is stateless mode (unlimited drill-down)
    const isStatelessMode = config.maxDepth === -1;
    console.log('🔍 Is stateless mode?', isStatelessMode);
    
    // Check max depth (skip check if maxDepth is -1 = unlimited)
    if (config.maxDepth !== -1 && currentState.currentLevel >= config.maxDepth) {
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

    let levels: DrillDownLevel[];
    let currentLevel: number;

    if (isStatelessMode) {
      // STATELESS MODE: Use sliding window (only keep current + previous level)
      // This prevents memory growth in unlimited drill-down scenarios
      
      if (currentState.levels.length === 0 || !currentState.isStatelessMode) {
        // First drill-down OR switching from stateful to stateless: add base level + new level
        levels = [
          {
            procedureName: baseProcedure,
            displayName: baseProcedure,
            filters: {},
            breadcrumbLabel: this.getProcedureDisplayName(baseProcedure)
          },
          newLevel
        ];
        currentLevel = 1;
        console.log('🔍 First stateless drill-down - created base + new level');
      } else {
        // Subsequent drill-downs: use current level as previous
        // IMPORTANT: Only if we're drilling to a DIFFERENT procedure
        const currentLevelData = currentState.levels[currentState.currentLevel];
        
        // Check if we're drilling to the same procedure (shouldn't happen, but handle it)
        if (currentLevelData.procedureName === newLevel.procedureName) {
          console.warn('⚠️ Drilling to same procedure - this might be a race condition');
          // Just update the filters for the current level
          levels = [currentState.levels[0], newLevel];
        } else {
          levels = [currentLevelData, newLevel];
        }
        
        currentLevel = 1; // Always at index 1 in sliding window
        console.log('🔍 Current level data:', currentLevelData);
        console.log('🔍 New level data:', newLevel);
        console.log('🔍 Sliding window levels:', levels);
      }
      
      console.log('🔄 Stateless drill-down: Using sliding window (2 levels max)');
    } else {
      // STATEFUL MODE: Keep full history for breadcrumb navigation
      levels = [...currentState.levels];
      
      if (levels.length === 0) {
        levels.push({
          procedureName: baseProcedure,
          displayName: baseProcedure,
          filters: {},
          breadcrumbLabel: this.getProcedureDisplayName(baseProcedure)
        });
      }

      levels.push(newLevel);
      currentLevel = levels.length - 1;
    }

    const newState: DrillDownState = {
      levels: levels,
      currentLevel: currentLevel,
      isStatelessMode: isStatelessMode
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
      currentLevel: levelIndex,
      isStatelessMode: currentState.isStatelessMode
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
      currentLevel: 0,
      isStatelessMode: false
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
   * STATELESS MODE: Store only current level to prevent URL bloat
   */
  private updateUrl(state: DrillDownState): void {
    let queryParams: any = {};

    // Only add drill-down params if we're actually drilled down (not at root)
    if (state.levels.length > 0 && state.currentLevel > 0) {
      
      if (state.isStatelessMode) {
        // STATELESS MODE: Store only current level (minimal URL state)
        const currentLevel = state.levels[state.currentLevel];
        queryParams['drill'] = currentLevel.procedureName;
        queryParams['filters'] = JSON.stringify(currentLevel.filters);
        queryParams['stateless'] = 'true'; // Flag to indicate stateless mode
        
        console.log('🔗 Stateless URL: Only current level stored');
      } else {
        // STATEFUL MODE: Store full drill-down path for breadcrumb navigation
        const drillPath = state.levels.map(l => l.procedureName).join('|');
        const filterPath = state.levels.map(l => JSON.stringify(l.filters)).join('|');
        const breadcrumbPath = state.levels.map(l => l.breadcrumbLabel).join('>');

        queryParams['drill'] = drillPath;
        queryParams['filters'] = filterPath;
        queryParams['breadcrumbs'] = breadcrumbPath;
        queryParams['level'] = state.currentLevel;
      }
    } else {
      // Clear all drill-down params when at root
      queryParams = {
        drill: null,
        filters: null,
        breadcrumbs: null,
        level: null,
        stateless: null
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
   * Handles both stateless and stateful modes
   */
  private initializeFromUrl(): void {
    this.route.queryParams.subscribe(params => {
      if (params['drill']) {
        try {
          const isStateless = params['stateless'] === 'true';
          
          if (isStateless) {
            // STATELESS MODE: Only current level in URL
            // Note: On page refresh, we lose drill-down history by design
            const currentLevel: DrillDownLevel = {
              procedureName: params['drill'],
              displayName: params['drill'],
              filters: JSON.parse(params['filters'] || '{}'),
              breadcrumbLabel: this.getProcedureDisplayName(params['drill'])
            };

            this.drillDownState$.next({
              levels: [currentLevel],
              currentLevel: 0,
              isStatelessMode: true
            });
            
            console.log('🔄 Restored stateless drill-down from URL (history lost on refresh)');
          } else {
            // STATEFUL MODE: Full drill-down path in URL
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
              currentLevel: currentLevel,
              isStatelessMode: false
            });
            
            console.log('🔄 Restored stateful drill-down from URL');
          }
        } catch (error) {
          console.error('Error parsing drill-down state from URL:', error);
          this.reset();
        }
      }
    });
  }
}
