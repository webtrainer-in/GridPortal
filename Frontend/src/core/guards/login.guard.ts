import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class LoginGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    if (this.authService.isUserAuthenticated()) {
      // If user is already authenticated, redirect to dashboard
      console.log('User already authenticated, redirecting to dashboard');
      return this.router.createUrlTree(['/dashboard']);
    } else {
      // Allow access to login page if not authenticated
      return true;
    }
  }
}