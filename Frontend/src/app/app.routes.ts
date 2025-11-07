import { Routes } from '@angular/router';
import { AuthGuard } from '../core/guards/auth.guard';
import { LoginGuard } from '../core/guards/login.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('../features/auth/pages/login/login').then(m => m.LoginComponent),
    canActivate: [LoginGuard] // Prevent access if already logged in
  },
  {
    path: '',
    loadComponent: () => import('../layout/main-layout/main-layout').then(m => m.MainLayoutComponent),
    canActivate: [AuthGuard], // Protect all child routes
    canActivateChild: [AuthGuard], // Protect all child routes
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('../features/dashboard/pages/dashboard/dashboard').then(m => m.DashboardComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('../features/users/pages/users/users').then(m => m.UsersComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('../features/settings/pages/settings/settings').then(m => m.SettingsComponent)
      },
      {
        path: 'settings/backup',
        loadComponent: () => import('../features/settings/pages/backup-history/backup-history').then(m => m.BackupHistoryComponent)
      },
      {
        path: 'analytics',
        loadComponent: () => import('../features/dashboard/pages/dashboard/dashboard').then(m => m.DashboardComponent) // Placeholder
      },
      {
        path: 'reports',
        loadComponent: () => import('../features/dashboard/pages/dashboard/dashboard').then(m => m.DashboardComponent) // Placeholder
      }
    ]
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
