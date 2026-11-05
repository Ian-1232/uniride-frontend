import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'app-conductor-layout',
  imports: [RouterLink, RouterOutlet, MatListModule, MatToolbarModule],
  templateUrl: './conductor-layout.html',
  styleUrl: './conductor-layout.css',
})
export class ConductorLayout {
  readonly menu = [
    { nombre: 'Dashboard', icono: 'dashboard' },
    { nombre: 'Rutas', icono: 'rutas' },
    { nombre: 'Viajes', icono: 'viajes' },
    { nombre: 'Compensaciones', icono: 'compensaciones' },
    { nombre: 'Reportes', icono: 'reportes' },
    { nombre: 'Horarios', icono: 'horarios' },
    { nombre: 'Configuración', icono: 'configuracion' },
  ];
}
