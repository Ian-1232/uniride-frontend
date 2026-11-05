import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'app-pasajero-layout',
  imports: [RouterLink, RouterOutlet, MatListModule, MatToolbarModule, MatButtonModule, MatMenuModule],
  templateUrl: './pasajero-layout.html',
  styleUrl: './pasajero-layout.css',
})
export class PasajeroLayout {
  readonly menu: { nombre: string; icono: string; ruta?: string }[] = [
    { nombre: 'Dashboard', icono: 'dashboard' },
    { nombre: 'Viajes', icono: 'viajes', ruta: '/pasajero/viajes/1' },
    { nombre: 'Compensaciones', icono: 'compensaciones', ruta: '/compensaciones/metodos' },
    { nombre: 'Reportes', icono: 'reportes', ruta: '/reportes/resumen' },
    { nombre: 'Horarios', icono: 'horarios' },
    { nombre: 'Configuración', icono: 'configuracion' },
  ];
}
