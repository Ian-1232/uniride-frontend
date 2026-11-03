import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule } from '@angular/material/paginator';

interface Ruta {
  id: number;
  origen: string;
  puntos: string;
  zonas: string;
  nota: string;
}

@Component({
  selector: 'app-mis-rutas',
  templateUrl: './mis-rutas.html',
  styleUrl: './mis-rutas.css',
  imports: [RouterLink, MatButtonModule, MatCardModule, MatChipsModule, MatIconModule, MatPaginatorModule],
})
export class MisRutas {
  readonly rutas: Ruta[] = [
    { id: 1, origen: 'San Borja', puntos: 'Av. Arequipa 1234', zonas: 'Centro de Lima', nota: 'S/ 10 sugeridos por pasajero' },
    { id: 2, origen: 'Surco', puntos: 'Caminos del Inca 155', zonas: 'Centro de Lima', nota: 'S/ 8 sugeridos por pasajero' },
    { id: 3, origen: 'Los Olivos', puntos: 'Av. Tupac Amaru 4500', zonas: 'Centro de Lima', nota: 'S/ 12 sugeridos por pasajero' },
    { id: 4, origen: 'Callao', puntos: 'Av. Argentina 2800', zonas: 'Centro de Lima', nota: 'S/ 9 sugeridos por pasajero' },
  ];

  readonly pageSize = 4;
  pagina = 0;

  get rutasVisibles(): Ruta[] {
    const inicio = this.pagina * this.pageSize;
    return this.rutas.slice(inicio, inicio + this.pageSize);
  }
}
