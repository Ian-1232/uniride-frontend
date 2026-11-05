import { Routes } from '@angular/router';

export const routes: Routes = [
  // Entrada temporal al módulo de Sebastián; la landing pertenece a otro módulo.
  { path: '', pathMatch: 'full', redirectTo: 'conductor/viajes/1/solicitudes' },
  { path: 'conductor', loadChildren: () => import('./pages/conductor/conductor.routes').then(m => m.CONDUCTOR_ROUTES) },
  { path: 'pasajero', loadChildren: () => import('./pages/pasajero/pasajero.routes').then(m => m.PASAJERO_ROUTES) },
  { path: '**', redirectTo: 'conductor/viajes/1/solicitudes' },
];
