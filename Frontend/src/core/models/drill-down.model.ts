export interface DrillDownState {
  levels: DrillDownLevel[];
  currentLevel: number;
}

export interface DrillDownLevel {
  procedureName: string;
  displayName: string;
  filters: Record<string, any>;
  breadcrumbLabel: string;
}

export interface DrillDownConfig {
  enabled: boolean;
  targetProcedure: string;
  filterParams: FilterParameter[];
  breadcrumbLabel: string;
  allowMultipleLevels: boolean;
  maxDepth: number;
}

export interface FilterParameter {
  targetColumn: string;
  sourceFields: string[];
  separator?: string;
}
