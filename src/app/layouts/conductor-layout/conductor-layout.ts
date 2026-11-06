import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'app-conductor-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, MatListModule, MatToolbarModule, MatButtonModule, MatMenuModule],
  templateUrl: './conductor-layout.html',
  styleUrl: './conductor-layout.css',
})
export class ConductorLayout {
  readonly menu: { nombre: string; icono: string; ruta?: string }[] = [
    { nombre: 'Dashboard', icono: 'dashboard', ruta: '/conductor/dashboard' },
    { nombre: 'Rutas', icono: 'rutas', ruta: '/conductor/rutas' },
    { nombre: 'Viajes', icono: 'viajes', ruta: '/conductor/viajes' },
    { nombre: 'Compensaciones', icono: 'compensaciones', ruta: '/compensaciones' },
    { nombre: 'Reportes', icono: 'reportes', ruta: '/reportes' },
    { nombre: 'Horarios', icono: 'horarios' },
    { nombre: 'Configuración', icono: 'configuracion' },
  ];
}
