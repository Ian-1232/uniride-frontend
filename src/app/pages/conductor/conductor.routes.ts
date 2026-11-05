import { Routes } from '@angular/router';
import { ConductorLayout } from '../../layouts/conductor-layout/conductor-layout';

export const CONDUCTOR_ROUTES: Routes = [{
  path: '', component: ConductorLayout, children: [
    { path: 'viajes/:viajeId/solicitudes', title: 'Solicitudes recibidas · UniRide', loadComponent: () => import('./viajes/solicitudes/solicitudes').then(m => m.Solicitudes) },
    { path: 'viajes/:viajeId/solicitudes/:solicitudId', title: 'Detalle de solicitud · UniRide', loadComponent: () => import('./viajes/detalle-solicitud/detalle-solicitud').then(m => m.DetalleSolicitud) },
    { path: 'viajes/:viajeId', title: 'Gestionar viaje · UniRide', loadComponent: () => import('./viajes/gestionar-viaje/gestionar-viaje').then(m => m.GestionarViaje) },
    { path: '', pathMatch: 'full', redirectTo: 'viajes/1/solicitudes' },
    { path: 'viajes', pathMatch: 'full', redirectTo: 'viajes/1/solicitudes' },
  ],
}];
