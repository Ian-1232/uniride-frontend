import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'app-pasajero-layout',
  imports: [RouterLink, RouterOutlet, MatListModule, MatToolbarModule],
  templateUrl: './pasajero-layout.html',
  styleUrl: './pasajero-layout.css',
})
export class PasajeroLayout {
  readonly menu = [
    { nombre: 'Dashboard', icono: 'dashboard' },
    { nombre: 'Viajes', icono: 'viajes' },
    { nombre: 'Compensaciones', icono: 'compensaciones' },
    { nombre: 'Reportes', icono: 'reportes' },
    { nombre: 'Horarios', icono: 'horarios' },
    { nombre: 'Configuración', icono: 'configuracion' },
  ];
}
