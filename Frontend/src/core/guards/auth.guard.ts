import { Injectable } from '@angular/core';
import { CanActivate, CanActivateChild, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate, CanActivateChild {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return this.checkAuthentication();
  }

  canActivateChild(): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return this.checkAuthentication();
  }

  private checkAuthentication(): boolean | UrlTree {
    if (this.authService.isAuthenticated()) {
      return true;
    } else {
      // Redirect to login page if not authenticated
      console.log('Access denied: User not authenticated, redirecting to login');
      return this.router.createUrlTree(['/login']);
    }
  }
}