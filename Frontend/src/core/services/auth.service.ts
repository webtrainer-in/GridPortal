import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';

export interface User {
  email: string;
  name?: string;
  role?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'user_data';
  private readonly LOGIN_STATE_KEY = 'isLoggedIn';

  // Reactive signals for authentication state
  private _isLoggedIn = signal<boolean>(this.hasValidToken());
  private _currentUser = signal<User | null>(this.getStoredUser());

  // Public readonly signals
  public readonly isLoggedIn = this._isLoggedIn.asReadonly();
  public readonly currentUser = this._currentUser.asReadonly();
  public readonly isAuthenticated = computed(() => this._isLoggedIn());

  constructor(private router: Router) {
    // Initialize authentication state from localStorage on service creation
    this.initializeAuthState();
  }

  /**
   * Authenticate user with email and password
   */
  login(email: string, password: string): Observable<{success: boolean, message?: string}> {
    // Simulate API call (replace with actual API call in production)
    return new Observable(observer => {
      setTimeout(() => {
        // Simple validation - replace with actual API authentication
        if (email === 'admin@gridportal.com' && password === 'admin123') {
          const user: User = {
            email: email,
            name: 'Administrator',
            role: 'admin'
          };
          
          // Store authentication data
          this.setAuthenticationData(user);
          
          observer.next({ success: true });
          observer.complete();
        } else {
          observer.next({ 
            success: false, 
            message: 'Invalid email or password. Please try again.' 
          });
          observer.complete();
        }
      }, 1000); // Simulate network delay
    });
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
    return user?.role === role;
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

  private setAuthenticationData(user: User): void {
    // Generate a simple token (in production, this would come from your API)
    const token = this.generateToken(user);
    
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

  private generateToken(user: User): string {
    // Simple token generation (in production, use proper JWT or get from API)
    const timestamp = Date.now();
    const payload = btoa(JSON.stringify({ email: user.email, timestamp }));
    return `token_${payload}`;
  }
}