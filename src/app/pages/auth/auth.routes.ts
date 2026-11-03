import { Routes } from '@angular/router';
import { AuthLayoutComponent } from '../../layouts/auth-layout/auth-layout';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    component: AuthLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
      },
      {
        path: 'login',
        loadComponent: () => import('./login/login').then((m) => m.LoginComponent)
      },
      {
        path: 'registro',
        loadComponent: () => import('./signup/signup').then((m) => m.SignupComponent)
      },
      {
        path: 'perfil',
        loadComponent: () => import('./perfil/perfil').then((m) => m.PerfilComponent)
      },
      {
        path: 'info-adicional',
        loadComponent: () => import('./info-adicional/info-adicional').then((m) => m.InfoAdicionalComponent)
      }
    ]
  }
];
