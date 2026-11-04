import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'app-conductor-layout',
  imports: [RouterLink, RouterOutlet, MatListModule, MatToolbarModule, MatButtonModule, MatMenuModule],
  templateUrl: './conductor-layout.html',
  styleUrl: './conductor-layout.css',
})
export class ConductorLayout {
  readonly menu: { nombre: string; icono: string; ruta?: string }[] = [
    { nombre: 'Dashboard', icono: 'dashboard' },
    { nombre: 'Rutas', icono: 'rutas', ruta: '/conductor/rutas' },
    { nombre: 'Viajes', icono: 'viajes', ruta: '/conductor/viajes' },
    { nombre: 'Compensaciones', icono: 'compensaciones', ruta: '/compensaciones/metodos' },
    { nombre: 'Reportes', icono: 'reportes', ruta: '/reportes/resumen' },
    { nombre: 'Horarios', icono: 'horarios' },
    { nombre: 'Configuración', icono: 'configuracion' },
  ];
}
