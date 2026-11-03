import { Routes } from '@angular/router';
import { PasajeroLayout } from '../../layouts/pasajero-layout/pasajero-layout';

export const PASAJERO_ROUTES: Routes = [{
  path: '', component: PasajeroLayout, children: [
    { path: 'viajes/:viajeId', title: 'Mi viaje confirmado · UniRide', loadComponent: () => import('./viajes/detalle-viaje/detalle-viaje').then(m => m.DetalleViaje) },
    { path: '', pathMatch: 'full', redirectTo: 'viajes/1' },
    { path: 'viajes', pathMatch: 'full', redirectTo: 'viajes/1' },
  ],
}];
