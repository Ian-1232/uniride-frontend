import { Component, Provider } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorIntl, MatPaginatorModule } from '@angular/material/paginator';

interface Viaje {
  id: number;
  fecha: string;
  hora: string;
  estado: 'PROGRAMADO' | 'EN_PROGRESO' | 'COMPLETADO' | 'CANCELADO';
  pasajeros: number;
  capacidad: number;
}

export function uniPaginatorIntl(): MatPaginatorIntl {
  const intl = new MatPaginatorIntl();
  intl.itemsPerPageLabel = 'Viajes por página:';
  intl.firstPageLabel = 'Primera página';
  intl.previousPageLabel = 'Página anterior';
  intl.nextPageLabel = 'Página siguiente';
  intl.lastPageLabel = 'Última página';
  intl.getRangeLabel = (from: number, to: number, total: number) =>
    total === 0 ? `0 – 0 de ${total} viajes` : `${from + 1} – ${to} de ${total} viajes`;
  return intl;
}

const PAGINATOR_INTL_PROVIDER: Provider = {
  provide: MatPaginatorIntl,
  useFactory: uniPaginatorIntl,
};

@Component({
  selector: 'app-viajes-ruta',
  templateUrl: './viajes-ruta.html',
  styleUrl: './viajes-ruta.css',
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatTableModule,
    MatIconModule,
    MatPaginatorModule,
  ],
  providers: [PAGINATOR_INTL_PROVIDER],
})
export class ViajesRuta {
  readonly columnas: string[] = ['fecha', 'hora', 'estado', 'pasajeros', 'acciones'];

  readonly viajes: Viaje[] = [
    {
      id: 1,
      fecha: 'Lunes, 13 oct 2026',
      hora: '07:30',
      estado: 'PROGRAMADO',
      pasajeros: 2,
      capacidad: 3,
    },
    {
      id: 2,
      fecha: 'Miércoles, 15 oct 2026',
      hora: '07:30',
      estado: 'PROGRAMADO',
      pasajeros: 1,
      capacidad: 3,
    },
    {
      id: 3,
      fecha: 'Viernes, 10 oct 2026',
      hora: '07:30',
      estado: 'EN_PROGRESO',
      pasajeros: 3,
      capacidad: 3,
    },
    {
      id: 4,
      fecha: 'Lunes, 6 oct 2026',
      hora: '07:30',
      estado: 'COMPLETADO',
      pasajeros: 3,
      capacidad: 3,
    },
    {
      id: 5,
      fecha: 'Viernes, 3 oct 2026',
      hora: '07:30',
      estado: 'CANCELADO',
      pasajeros: 0,
      capacidad: 3,
    },
    {
      id: 6,
      fecha: 'Jueves, 1 oct 2026',
      hora: '07:30',
      estado: 'COMPLETADO',
      pasajeros: 3,
      capacidad: 3,
    },
    {
      id: 7,
      fecha: 'Martes, 29 sep 2026',
      hora: '07:30',
      estado: 'CANCELADO',
      pasajeros: 2,
      capacidad: 3,
    },
  ];

  readonly pageSize = 5;
  pagina = 0;

  get viajesVisibles(): Viaje[] {
    const inicio = this.pagina * this.pageSize;
    return this.viajes.slice(inicio, inicio + this.pageSize);
  }
}
