import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, of, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

interface LoginResponse {
  token: string;
  success: boolean;
  message: string;
  roles?: string[];
  user?: User;  // Backend returns user data with roles
}

export interface User {
  id: number;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  tokenExpiration?: string;
  user?: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'user_data';
  private readonly LOGIN_STATE_KEY = 'isLoggedIn';
  //private readonly apiUrl = `${environment.apiUrl}/Auth`;

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  
  private userRolesSubject = new BehaviorSubject<string[]>([]);
  public userRoles$ = this.userRolesSubject.asObservable();

  // Reactive signals for authentication state
  private _isLoggedIn = signal<boolean>(this.hasValidToken());
  private _currentUser = signal<User | null>(this.getStoredUser());

  // Public readonly signals
  public readonly isLoggedIn = this._isLoggedIn.asReadonly();
  public readonly currentUser = this._currentUser.asReadonly();
  public readonly isAuthenticated = computed(() => this._isLoggedIn());

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.isAuthenticatedSubject.next(!!this.getToken());
    const roles = this.getRoles();
    if (roles) {
      this.userRolesSubject.next(roles);
    }
  }

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiEndpoint}/api/Auth/login`, {
      Username: username,  // Backend expects PascalCase
      Password: password   // Backend expects PascalCase
    }).pipe(
      tap(response => {
        if (response.success) {
          // Store token using consistent keys
          localStorage.setItem(this.TOKEN_KEY, response.token);
          localStorage.setItem('token', response.token); // Keep for backward compatibility
          localStorage.setItem(this.LOGIN_STATE_KEY, 'true');
          
          if (response.roles) {
            localStorage.setItem('roles', JSON.stringify(response.roles));
            this.userRolesSubject.next(response.roles);
          }
          
          // Store user data with roles for menu filtering
          if (response.user) {
            // Ensure user object has roles from response
            const userData: User = {
              ...response.user,
              roles: response.user.roles || response.roles || []
            };
            localStorage.setItem(this.USER_KEY, JSON.stringify(userData));
            this._currentUser.set(userData);
          } else {
            // Fallback: create minimal user object from available data
            const userData: User = {
              id: 0,
              username: username,
              roles: response.roles || []
            };
            localStorage.setItem(this.USER_KEY, JSON.stringify(userData));
            this._currentUser.set(userData);
          }
          
          // Update BehaviorSubjects
          this.isAuthenticatedSubject.next(true);
          
          // Update signals
          this._isLoggedIn.set(true);
          
          this.router.navigate(['/dash']);
        }
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          this.logout();
        }
        throw error;
      })
    );
  }

  /**
   * Windows Authentication login - auto authenticates with current Windows credentials
   * This uses the Windows Authentication endpoint that requires no credentials
   * and relies on the Windows Authentication configured in IIS/backend
   */
  windowsAuth(): Observable<any> {
    // The endpoint should be configured to use Windows Authentication
    return this.http.get<any>(`${environment.apiEndpoint}/api/Auth/windows`, { 
      withCredentials: true // Important: sends Windows credentials
    }).pipe(
      tap(response => {
        if (response.success) {
          // Store token using consistent keys
          localStorage.setItem(this.TOKEN_KEY, response.token);
          localStorage.setItem('token', response.token); // Keep for backward compatibility
          localStorage.setItem(this.LOGIN_STATE_KEY, 'true');
          
          if (response.roles) {
            localStorage.setItem('roles', JSON.stringify(response.roles));
            this.userRolesSubject.next(response.roles);
          }
          
          // Store user data with roles for menu filtering
          if (response.user) {
            const userData: User = {
              ...response.user,
              roles: response.user.roles || response.roles || []
            };
            localStorage.setItem(this.USER_KEY, JSON.stringify(userData));
            this._currentUser.set(userData);
          }
          
          // Update BehaviorSubjects
          this.isAuthenticatedSubject.next(true);
          
          // Update signals
          this._isLoggedIn.set(true);
          
          this.router.navigate(['/dashboard']);
        }
      }),
      catchError(error => {
        console.error('Windows auth error:', error);
        return throwError(() => new Error('Windows authentication failed. Please use username/password login.'));
      })
    );
  }

  logout(): void {
    this.clearAuthenticationData();
    this.router.navigate(['/login']);
  }

  logout(): void {
    // Call the backend logout endpoint first
    this.http.get(`${environment.apiEndpoint}/api/Auth/logout`)
      .subscribe({
        next: () => this.handleLogoutSuccess(),
        error: () => this.handleLogoutSuccess() // Continue with logout even if API call fails
      });
  }

  /**
   * Get current user data
   */
  getCurrentUser(): User | null {
    return this._currentUser();
  }

  // Handle logout process after API call (success or error)
  private handleLogoutSuccess(): void {
    // Clear all authentication tokens and data
    localStorage.removeItem('token');
    localStorage.removeItem('roles');
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.LOGIN_STATE_KEY);
    
    // Update BehaviorSubjects (old system)
    this.userRolesSubject.next([]);
    this.isAuthenticatedSubject.next(false);
    
    // Update signals (new system)
    this._isLoggedIn.set(false);
    this._currentUser.set(null);
    
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getRoles(): string[] | null {
    const rolesString = localStorage.getItem('roles');
    return rolesString ? JSON.parse(rolesString) : null;
  }

  handleUnauthorized(): void {
    this.logout();
  }

  private hasValidToken(): boolean {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const loginState = localStorage.getItem(this.LOGIN_STATE_KEY);
    
    // Basic validation - in production, you'd validate token expiry, signature, etc.
    return !!(token && loginState === 'true');
  }

  private getStoredUser(): User | null {
    try {
      const userData = localStorage.getItem(this.USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error parsing stored user data:', error);
      return null;
    }
  }
}
