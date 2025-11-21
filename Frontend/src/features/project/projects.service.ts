import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

/**
 * Generic response structure for any API data
 * Works with any type of data - no need to define specific interfaces
 */
export interface GenericDataResponse<T = any> {
  data: T[];
  totalRecords: number;
  success: boolean;
  message: string;
}

/**
 * Projects Service - Generic implementation
 * Can be used with any data structure from API
 */
@Injectable({
  providedIn: 'root'
})
export class ProjectsService {
  constructor() {}

  /**
   * Get all projects with generic type support
   * Replace this with actual API call: this.http.get<GenericDataResponse>('/api/projects')
   * The API can return any structure - the service will adapt automatically
   */
  getProjects<T = any>(): Observable<GenericDataResponse<T>> {
    // Dummy data - replace with actual API call
    const dummyData: any[] = [
      {
        id: 1,
        name: 'GridPortal Development',
        description: 'Build a comprehensive portal for data management',
        status: 'In Progress',
        startDate: '2024-01-15',
        endDate: '2024-06-30',
        budget: 50000,
        progress: 75,
        teamLead: 'John Smith',
        isActive: true
      },
      {
        id: 2,
        name: 'Mobile App Redesign',
        description: 'Redesign mobile application with modern UI/UX',
        status: 'In Progress',
        startDate: '2024-02-01',
        endDate: '2024-05-15',
        budget: 35000,
        progress: 60,
        teamLead: 'Sarah Johnson',
        isActive: true
      },
      {
        id: 3,
        name: 'Database Migration',
        description: 'Migrate legacy database to cloud infrastructure',
        status: 'Completed',
        startDate: '2023-09-10',
        endDate: '2024-01-20',
        budget: 45000,
        progress: 100,
        teamLead: 'Mike Davis',
        isActive: false
      },
      {
        id: 4,
        name: 'Analytics Dashboard',
        description: 'Create real-time analytics and reporting dashboard',
        status: 'Planning',
        startDate: '2024-05-01',
        endDate: '2024-08-30',
        budget: 40000,
        progress: 20,
        teamLead: 'Emma Wilson',
        isActive: true
      },
      {
        id: 5,
        name: 'API Security Enhancement',
        description: 'Implement OAuth 2.0 and improve API security',
        status: 'In Progress',
        startDate: '2024-03-15',
        endDate: '2024-04-30',
        budget: 28000,
        progress: 85,
        teamLead: 'Robert Chen',
        isActive: true
      },
      {
        id: 6,
        name: 'Performance Optimization',
        description: 'Optimize application performance and load times',
        status: 'On Hold',
        startDate: '2024-02-20',
        endDate: '2024-06-15',
        budget: 32000,
        progress: 40,
        teamLead: 'Lisa Anderson',
        isActive: false
      },
      {
        id: 7,
        name: 'Documentation Update',
        description: 'Complete technical and user documentation',
        status: 'In Progress',
        startDate: '2024-04-01',
        endDate: '2024-05-31',
        budget: 15000,
        progress: 55,
        teamLead: 'James Martin',
        isActive: true
      },
      {
        id: 8,
        name: 'Testing & QA Automation',
        description: 'Implement automated testing framework',
        status: 'Completed',
        startDate: '2023-12-01',
        endDate: '2024-02-28',
        budget: 38000,
        progress: 100,
        teamLead: 'Patricia Brown',
        isActive: false
      }
    ];

    // Simulate API delay
    return of({
      data: dummyData,
      totalRecords: dummyData.length,
      success: true,
      message: 'Data retrieved successfully'
    }).pipe(delay(300));
  }

  /**
   * Get data by ID - Generic implementation
   * Replace this with: this.http.get<T>(`/api/data/${id}`)
   */
  getDataById<T = any>(id: number): Observable<T | undefined> {
    return of(undefined).pipe(delay(200));
  }

  /**
   * Create new data - Generic implementation
   * Replace this with: this.http.post<T>('/api/data', data)
   */
  createData<T = any>(data: Omit<T, 'id'>): Observable<T> {
    return of({ id: 0, ...data } as T).pipe(delay(300));
  }

  /**
   * Update data - Generic implementation
   * Replace this with: this.http.put<T>(`/api/data/${id}`, data)
   */
  updateData<T = any>(id: number, data: Partial<T>): Observable<T> {
    return of({ id, ...data } as T).pipe(delay(300));
  }

  /**
   * Delete data - Generic implementation
   * Replace this with: this.http.delete(`/api/data/${id}`)
   */
  deleteData(id: number): Observable<{ success: boolean }> {
    return of({ success: true }).pipe(delay(300));
  }
}
