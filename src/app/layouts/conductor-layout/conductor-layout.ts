import { RoleSelector } from '../../shared/role-selector/role-selector';
import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-conductor-layout',
  imports: [
    RoleSelector,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MatListModule,
    MatToolbarModule,
    MatButtonModule,
    MatMenuModule,
  ],
  templateUrl: './conductor-layout.html',
  styleUrl: './conductor-layout.css',
})
export class ConductorLayout {
  readonly authService = inject(AuthService);

  readonly menu = computed(() => {
    const isPasajero = this.authService.isPasajero();
    return [
      {
        nombre: 'Dashboard',
        icono: 'dashboard',
        ruta: isPasajero ? '/pasajero/dashboard' : '/conductor/dashboard',
      },
      {
        nombre: 'Rutas',
        icono: 'rutas',
        ruta: isPasajero ? undefined : '/conductor/rutas',
      },
      {
        nombre: 'Viajes',
        icono: 'viajes',
        ruta: isPasajero ? '/pasajero/viajes' : '/conductor/viajes',
      },
      {
        nombre: 'Compensaciones',
        icono: 'compensaciones',
        ruta: '/compensaciones',
      },
      {
        nombre: 'Reportes',
        icono: 'reportes',
        ruta: '/reportes',
      },
      { nombre: 'Horarios', icono: 'horarios' },
      { nombre: 'Configuración', icono: 'configuracion', ruta: '/configuracion' },
    ];
  });
}
