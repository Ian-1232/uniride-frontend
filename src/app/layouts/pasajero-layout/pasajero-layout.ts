import { RoleSelector } from '../../shared/role-selector/role-selector';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-pasajero-layout',
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
  templateUrl: './pasajero-layout.html',
  styleUrl: './pasajero-layout.css',
})
export class PasajeroLayout {
  readonly authService = inject(AuthService);

  readonly menu = [
    { nombre: 'Dashboard', icono: 'dashboard', ruta: '/pasajero/dashboard' },
    { nombre: 'Viajes', icono: 'viajes', ruta: '/pasajero/viajes' },
    { nombre: 'Compensaciones', icono: 'compensaciones', ruta: '/compensaciones' },
    { nombre: 'Reportes', icono: 'reportes', ruta: '/reportes' },
    { nombre: 'Horarios', icono: 'horarios', ruta: '/horarios' },
    { nombre: 'Configuración', icono: 'configuracion', ruta: '/configuracion' },
  ];
}
