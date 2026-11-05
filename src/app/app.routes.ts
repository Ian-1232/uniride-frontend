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
  {
    path: 'compensaciones',
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
  {
    path: 'contribucion',
    loadComponent: () =>
      import('./pages/contribucion/contribucion-shell/contribucion-shell').then(
        (component) => component.ContribucionShell,
      ),
    children: [
      {
        path: 'sugerencia/:viajeId',
        loadComponent: () =>
          import(
            './pages/contribucion/sugerencia-contribucion/sugerencia-contribucion'
          ).then((component) => component.SugerenciaContribucion),
      },
    ],
  },
],
{
    path: 'conductor',
    loadChildren: () =>
      import('./pages/conductor/conductor.routes').then(
        (module) => module.CONDUCTOR_ROUTES,
      ),
  },
  {
    path: 'pasajero',
    loadChildren: () =>
      import('./pages/pasajero/pasajero.routes').then(
        (module) => module.PASAJERO_ROUTES,
      ),
  },
  {
    path: '**',
    redirectTo: 'conductor/viajes/1/solicitudes',
  },
];
