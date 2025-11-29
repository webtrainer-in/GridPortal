import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface User {
  id: number;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
}

export interface LoginRequest {
  usernameOrEmail: string;
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
  private readonly apiUrl = `${environment.apiUrl}/Auth`;

  // Reactive signals for authentication state
  private _isLoggedIn = signal<boolean>(this.hasValidToken());
  private _currentUser = signal<User | null>(this.getStoredUser());

  // Public readonly signals
  public readonly isLoggedIn = this._isLoggedIn.asReadonly();
  public readonly currentUser = this._currentUser.asReadonly();
  public readonly isAuthenticated = computed(() => this._isLoggedIn());

  constructor(
    private router: Router,
    private http: HttpClient
  ) {
    // Initialize authentication state from localStorage on service creation
    this.initializeAuthState();
  }

  /**
   * Authenticate user with username/email and password
   */
  login(usernameOrEmail: string, password: string): Observable<{success: boolean, message?: string}> {
    const loginRequest: LoginRequest = {
      usernameOrEmail: usernameOrEmail,
      password: password
    };

    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, loginRequest).pipe(
      tap(response => {
        if (response.success && response.token && response.user) {
          // Store authentication data
          this.setAuthenticationData(response.user, response.token);
        }
      }),
      map(response => ({
        success: response.success,
        message: response.message
      })),
      catchError(error => {
        console.error('Login error:', error);
        const errorMessage = error.error?.message || error.message || 'An error occurred during login. Please try again.';
        return of({ 
          success: false, 
          message: errorMessage
        });
      })
    );
  }

  /**
   * Log out the current user
   */
  logout(): void {
    this.clearAuthenticationData();
    this.router.navigate(['/login']);
  }

  /**
   * Check if user is authenticated
   */
  isUserAuthenticated(): boolean {
    return this.hasValidToken() && this._isLoggedIn();
  }

  /**
   * Get current user data
   */
  getCurrentUser(): User | null {
    return this._currentUser();
  }

  /**
   * Check if user has a specific role
   */
  hasRole(role: string): boolean {
    const user = this._currentUser();
    return user?.roles?.includes(role) || false;
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roles: string[]): boolean {
    const user = this._currentUser();
    if (!user?.roles) return false;
    return roles.some(role => user.roles.includes(role));
  }

  /**
   * Get auth token for API requests
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Refresh authentication state (useful after token refresh)
   */
  refreshAuthState(): void {
    this.initializeAuthState();
  }

  // Private methods

  private initializeAuthState(): void {
    const hasToken = this.hasValidToken();
    const storedUser = this.getStoredUser();
    
    this._isLoggedIn.set(hasToken && !!storedUser);
    this._currentUser.set(storedUser);
  }

  private setAuthenticationData(user: User, token: string): void {
    // Store data in localStorage
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    localStorage.setItem(this.LOGIN_STATE_KEY, 'true');
    
    // Update reactive signals
    this._isLoggedIn.set(true);
    this._currentUser.set(user);
  }

  private clearAuthenticationData(): void {
    // Remove data from localStorage
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.LOGIN_STATE_KEY);
    localStorage.removeItem('userEmail'); // Legacy cleanup
    
    // Update reactive signals
    this._isLoggedIn.set(false);
    this._currentUser.set(null);
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