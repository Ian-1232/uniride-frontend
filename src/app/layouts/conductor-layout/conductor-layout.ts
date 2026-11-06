import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
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
  private readonly router = inject(Router);

  readonly menu: { nombre: string; icono: string; ruta?: string; prefix?: string }[] = [
    { nombre: 'Dashboard', icono: 'dashboard' },
    { nombre: 'Rutas', icono: 'rutas' },
    { nombre: 'Viajes', icono: 'viajes', ruta: '/conductor/viajes/1/solicitudes', prefix: '/conductor/viajes' },
    { nombre: 'Compensaciones', icono: 'compensaciones', ruta: '/compensaciones/metodos', prefix: '/compensaciones' },
    { nombre: 'Reportes', icono: 'reportes', ruta: '/reportes/resumen', prefix: '/reportes' },
    { nombre: 'Horarios', icono: 'horarios' },
    { nombre: 'Configuración', icono: 'configuracion' },
  ];

  isActive(item: { ruta?: string; prefix?: string }): boolean {
    if (!item.prefix) return false;
    return this.router.url.startsWith(item.prefix);
  }
}
