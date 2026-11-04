import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'reportes',
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
];
