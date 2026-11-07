import { Routes } from '@angular/router';
import { ConductorLayout } from '../../layouts/conductor-layout/conductor-layout';

export const CONDUCTOR_ROUTES: Routes = [
  {
    path: '',
    component: ConductorLayout,
    children: [
      // Módulo 2 — Rutas
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Dashboard · Conductor UniRide',
        loadComponent: () =>
          import('./dashboard/conductor-dashboard').then((m) => m.ConductorDashboard),
      },
      {
        path: 'rutas',
        title: 'Mis rutas · UniRide',
        loadComponent: () => import('./rutas/mis-rutas/mis-rutas').then((m) => m.MisRutas),
      },
      {
        path: 'rutas/publicar',
        title: 'Publicar ruta · UniRide',
        loadComponent: () =>
          import('./rutas/publicar-ruta/publicar-ruta').then((m) => m.PublicarRuta),
      },
      {
        path: 'rutas/editar/:id',
        title: 'Editar ruta · UniRide',
        loadComponent: () => import('./rutas/editar-ruta/editar-ruta').then((m) => m.EditarRuta),
      },
      {
        path: 'rutas/:id/viajes',
        title: 'Viajes de la ruta · UniRide',
        loadComponent: () => import('./rutas/viajes-ruta/viajes-ruta').then((m) => m.ViajesRuta),
      },
      // Viajes (Módulo 2)
      {
        path: 'viajes',
        pathMatch: 'full',
        title: 'Mis viajes · UniRide',
        loadComponent: () => import('./viajes/mis-viajes/mis-viajes').then((m) => m.MisViajes),
      },
      {
        path: 'viajes/:id/generar',
        title: 'Generar viaje · UniRide',
        loadComponent: () =>
          import('./rutas/generar-viaje/generar-viaje').then((m) => m.GenerarViaje),
      },
      {
        path: 'viajes/:id/editar',
        title: 'Reprogramar viaje · UniRide',
        loadComponent: () =>
          import('./viajes/reprogramar-viaje/reprogramar-viaje').then((m) => m.ReprogramarViaje),
      },
      // Módulo 4 — Solicitudes
      {
        path: 'viajes/:viajeId/solicitudes',
        title: 'Solicitudes recibidas · UniRide',
        loadComponent: () => import('./viajes/solicitudes/solicitudes').then((m) => m.Solicitudes),
      },
      {
        path: 'viajes/:viajeId/solicitudes/:solicitudId',
        title: 'Detalle de solicitud · UniRide',
        loadComponent: () =>
          import('./viajes/detalle-solicitud/detalle-solicitud').then((m) => m.DetalleSolicitud),
      },
      {
        path: 'viajes/:viajeId',
        title: 'Gestionar viaje · UniRide',
        loadComponent: () =>
          import('./viajes/gestionar-viaje/gestionar-viaje').then((m) => m.GestionarViaje),
      },
      { path: '**', redirectTo: 'rutas' },
    ],
  },
];
