import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

export interface Project {
  id: number;
  name: string;
  description: string;
  status: string;
  startDate: string;
  endDate: string;
  budget: number;
  progress: number;
  teamLead: string;
  isActive: boolean;
}

export interface ProjectsResponse {
  data: Project[];
  totalRecords: number;
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProjectsService {
  constructor() {}

  /**
   * Get all projects
   * Replace this with actual API call: this.http.get<ProjectsResponse>('/api/projects')
   */
  getProjects(): Observable<ProjectsResponse> {
    const dummyData: Project[] = [
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
      message: 'Projects retrieved successfully'
    }).pipe(delay(300));
  }

  /**
   * Get project by ID
   * Replace this with: this.http.get<Project>(`/api/projects/${id}`)
   */
  getProjectById(id: number): Observable<Project | undefined> {
    return of(undefined).pipe(delay(200));
  }

  /**
   * Create new project
   * Replace this with: this.http.post<Project>('/api/projects', project)
   */
  createProject(project: Omit<Project, 'id'>): Observable<Project> {
    return of({ id: 0, ...project }).pipe(delay(300));
  }

  /**
   * Update project
   * Replace this with: this.http.put<Project>(`/api/projects/${id}`, project)
   */
  updateProject(id: number, project: Partial<Project>): Observable<Project> {
    return of({ id, ...project } as Project).pipe(delay(300));
  }

  /**
   * Delete project
   * Replace this with: this.http.delete(`/api/projects/${id}`)
   */
  deleteProject(id: number): Observable<{ success: boolean }> {
    return of({ success: true }).pipe(delay(300));
  }
}
