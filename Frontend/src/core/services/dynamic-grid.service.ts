import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Interfaces matching backend DTOs
export interface GridDataRequest {
  procedureName: string;
  pageNumber?: number;
  pageSize?: number;
  startRow?: number;
  endRow?: number;
  sortColumn?: string;
  sortDirection?: 'ASC' | 'DESC';
  filterJson?: string;
  searchTerm?: string;
}

export interface GridDataResponse {
  rows: Record<string, any>[];
  columns: ColumnDefinition[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  lastRow?: number;
  metadata?: Record<string, any>;
}

export interface ColumnDefinition {
  field: string;
  headerName: string;
  type: string;
  width?: number;
  sortable: boolean;
  filter: boolean;
  editable?: boolean;
  cellEditor?: string;
  cellEditorParams?: string;
  columnGroup?: string;
  columnGroupShow?: string;
  pinned?: boolean;
  customProperties?: Record<string, any>;
}

export interface RowUpdateRequest {
  procedureName: string;
  rowId: any;
  changes: Record<string, any>;
}

export interface RowUpdateResponse {
  success: boolean;
  message?: string;
  updatedRow?: Record<string, any>;
  errorCode?: string;
}

export interface RowDeleteRequest {
  procedureName: string;
  rowId: any;
}

export interface RowDeleteResponse {
  success: boolean;
  message?: string;
  errorCode?: string;
}

export interface StoredProcedureInfo {
  id: number;
  procedureName: string;
  displayName: string;
  description?: string;
  category?: string;
  isActive: boolean;
  requiresAuth: boolean;
  allowedRoles: string[];
  defaultPageSize: number;
  maxPageSize: number;
}

export interface SaveColumnStateRequest {
  procedureName: string;
  columnState: string;
}

@Injectable({
  providedIn: 'root'
})
export class DynamicGridService {
  private apiUrl = `${environment.apiEndpoint}/api/DynamicGrid`;

  constructor(private http: HttpClient) {}

  /**
   * Execute a dynamic grid stored procedure
   */
  executeGridProcedure(request: GridDataRequest): Observable<GridDataResponse> {
    return this.http.post<GridDataResponse>(`${this.apiUrl}/execute`, request);
  }

  /**
   * Get total count for a procedure (for pagination mode detection)
   */
  getTotalCount(procedureName: string): Observable<number> {
    const request: GridDataRequest = {
      procedureName,
      pageNumber: 1,
      pageSize: 1 // Fetch minimal data, we only need the count
    };
    return new Observable<number>(observer => {
      this.executeGridProcedure(request).subscribe({
        next: (response) => {
          observer.next(response.totalCount);
          observer.complete();
        },
        error: (err) => observer.error(err)
      });
    });
  }

  /**
   * Update a row in the grid
   */
  updateRow(request: RowUpdateRequest): Observable<RowUpdateResponse> {
    return this.http.post<RowUpdateResponse>(`${this.apiUrl}/update-row`, request);
  }

  /**
   * Delete a row from the grid
   */
  deleteRow(request: RowDeleteRequest): Observable<RowDeleteResponse> {
    return this.http.post<RowDeleteResponse>(`${this.apiUrl}/delete-row`, request);
  }

  /**
   * Get list of available stored procedures
   */
  getAvailableProcedures(): Observable<StoredProcedureInfo[]> {
    return this.http.get<StoredProcedureInfo[]>(`${this.apiUrl}/available-procedures`);
  }

  /**
   * Get saved column state for a procedure
   */
  getColumnState(procedureName: string): Observable<{ columnState: string }> {
    return this.http.get<{ columnState: string }>(`${this.apiUrl}/column-state/${procedureName}`);
  }

  /**
   * Save column state for a procedure
   */
  saveColumnState(request: SaveColumnStateRequest): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/column-state`, request);
  }
}
