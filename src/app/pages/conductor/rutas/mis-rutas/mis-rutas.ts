import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorIntl, MatPaginatorModule } from '@angular/material/paginator';
import { Ruta } from '../../../../models/ruta.model';
import { crearPaginatorIntl } from '../../../../services/paginator-intl';

@Component({
  selector: 'app-mis-rutas',
  templateUrl: './mis-rutas.html',
  styleUrl: './mis-rutas.css',
  imports: [RouterLink, MatButtonModule, MatCardModule, MatChipsModule, MatIconModule, MatPaginatorModule],
  providers: [{ provide: MatPaginatorIntl, useValue: crearPaginatorIntl('rutas') }],
})
export class MisRutas {
  // shortcut: datos hardcodeados del Figma M2.1; sustituir por RutasService cuando haya backend
  readonly rutas = signal<Ruta[]>([
    { id: 1, origen: 'San Borja', destino: 'UPC', capacidadMaxima: 3, puntosReferencia: 'Av. Arequipa 1234', zonasSinParada: 'Centro de Lima', notaContribucion: 'S/ 10 sugeridos por pasajero', estado: 'ACTIVA' },
    { id: 2, origen: 'Surco', destino: 'UPC', capacidadMaxima: 3, puntosReferencia: 'Caminos del Inca 155', zonasSinParada: 'Centro de Lima', notaContribucion: 'S/ 8 sugeridos por pasajero', estado: 'ACTIVA' },
    { id: 3, origen: 'Los Olivos', destino: 'UPC', capacidadMaxima: 3, puntosReferencia: 'Av. Tupac Amaru 4500', zonasSinParada: 'Centro de Lima', notaContribucion: 'S/ 12 sugeridos por pasajero', estado: 'ACTIVA' },
    { id: 4, origen: 'Callao', destino: 'UPC', capacidadMaxima: 3, puntosReferencia: 'Av. Argentina 2800', zonasSinParada: 'Centro de Lima', notaContribucion: 'S/ 9 sugeridos por pasajero', estado: 'ACTIVA' },
  ]);

  readonly pageSize = 4;
  readonly eliminandoId = signal<number | null>(null);

  eliminar(id: number): void {
    this.rutas.update((lista) => lista.filter((ruta) => ruta.id !== id));
  }
}
