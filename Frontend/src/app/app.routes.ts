import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('../features/auth/pages/login/login').then(m => m.LoginComponent)
  },
  {
    path: '',
    loadComponent: () => import('../layout/main-layout/main-layout').then(m => m.MainLayoutComponent),
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
