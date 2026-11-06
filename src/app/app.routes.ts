import { conductorGuard, pasajeroGuard } from './core/guards/auth.guard';
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'home',
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home').then((m) => m.HomeComponent),
  },
  {
    path: 'auth',
    loadChildren: () => import('./pages/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'login',
    redirectTo: 'auth/login',
    pathMatch: 'full',
  },
  {
    path: 'registro',
    redirectTo: 'auth/registro',
    pathMatch: 'full',
  },
  {
    path: 'pasajero',
    canActivate: [pasajeroGuard],
    canActivateChild: [pasajeroGuard],
    loadComponent: () =>
      import('./layouts/pasajero-layout/pasajero-layout').then(
        (component) => component.PasajeroLayout,
      ),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        title: 'Dashboard · Pasajero UniRide',
        loadComponent: () =>
          import('./pages/pasajero/dashboard/pasajero-dashboard').then(
            (component) => component.PasajeroDashboard,
          ),
      },
      {
        path: 'viajes',
        children: [
          {
            path: '',
            pathMatch: 'full',
            redirectTo: 'mis-viajes',
          },
          {
            path: 'mis-viajes',
            loadComponent: () =>
              import('./pages/pasajero/viajes/mis-viajes/mis-viajes').then(
                (component) => component.MisViajes,
              ),
          },
          {
            path: 'buscar',
            loadComponent: () =>
              import('./pages/pasajero/viajes/buscar-viaje/buscar-viaje').then(
                (component) => component.BuscarViaje,
              ),
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./pages/pasajero/viajes/detalle-viaje/detalle-viaje').then(
                (component) => component.DetalleViaje,
              ),
          },
        ],
      },
    ],
  },
  {
    path: 'reportes',
    canActivate: [conductorGuard],
    canActivateChild: [conductorGuard],
    loadComponent: () =>
      import('./layouts/conductor-layout/conductor-layout').then(
        (module) => module.ConductorLayout,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/reportes/reportes-shell/reportes-shell').then(
            (component) => component.ReportesShell,
          ),
        children: [
          {
            path: '',
            pathMatch: 'full',
            redirectTo: 'resumen',
          },
          {
            path: 'resumen',
            loadComponent: () =>
              import('./pages/reportes/resumen-actividad/resumen-actividad').then(
                (component) => component.ResumenActividad,
              ),
          },
          {
            path: 'frecuencia',
            loadComponent: () =>
              import('./pages/reportes/frecuencia-semanal/frecuencia-semanal').then(
                (component) => component.FrecuenciaSemanal,
              ),
          },
          {
            path: 'rutas',
            loadComponent: () =>
              import('./pages/reportes/rutas-frecuentes/rutas-frecuentes').then(
                (component) => component.RutasFrecuentes,
              ),
          },
          {
            path: 'exportar',
            loadComponent: () =>
              import('./pages/reportes/exportar-historial/exportar-historial').then(
                (component) => component.ExportarHistorial,
              ),
          },
        ],
      },
    ],
  },
  {
    path: 'compensaciones',
    canActivate: [conductorGuard],
    canActivateChild: [conductorGuard],
    loadComponent: () =>
      import('./layouts/conductor-layout/conductor-layout').then(
        (module) => module.ConductorLayout,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/compensaciones/compensaciones-shell/compensaciones-shell').then(
            (component) => component.CompensacionesShell,
          ),
        children: [
          {
            path: '',
            pathMatch: 'full',
            redirectTo: 'metodos',
          },
          {
            path: 'metodos/nuevo',
            loadComponent: () =>
              import('./pages/compensaciones/metodo-formulario/metodo-formulario').then(
                (component) => component.MetodoFormulario,
              ),
          },
          {
            path: 'metodos/:id/editar',
            loadComponent: () =>
              import('./pages/compensaciones/metodo-formulario/metodo-formulario').then(
                (component) => component.MetodoFormulario,
              ),
          },
          {
            path: 'metodos',
            loadComponent: () =>
              import('./pages/compensaciones/metodos-listado/metodos-listado').then(
                (component) => component.MetodosListado,
              ),
          },
        ],
      },
    ],
  },
  {
    path: 'contribucion',
    canActivate: [pasajeroGuard],
    canActivateChild: [pasajeroGuard],
    loadComponent: () =>
      import('./pages/contribucion/contribucion-shell/contribucion-shell').then(
        (component) => component.ContribucionShell,
      ),
    children: [
      {
        path: 'sugerencia/:viajeId',
        loadComponent: () =>
          import('./pages/contribucion/sugerencia-contribucion/sugerencia-contribucion').then(
            (component) => component.SugerenciaContribucion,
          ),
      },
    ],
  },
  {
    path: 'conductor',
    canActivate: [conductorGuard],
    canActivateChild: [conductorGuard],
    loadChildren: () =>
      import('./pages/conductor/conductor.routes').then((module) => module.CONDUCTOR_ROUTES),
  },
  {
    path: '**',
    redirectTo: '/home',
  },
];
