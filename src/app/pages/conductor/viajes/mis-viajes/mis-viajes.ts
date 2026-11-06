import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { Ruta, Viaje } from '../../../../core/models/ruta.model';

interface ViajeConRuta extends Viaje {
  ruta: Ruta;
}

// shortcut: datos hardcodeados del Figma M2.4; sustituir por RutasService cuando haya backend
const RUTA: Ruta = {
  id: 1,
  origen: 'San Borja',
  destino: 'UPC',
  capacidadMaxima: 3,
  puntosReferencia: 'Av. Arequipa 1234',
  zonasSinParada: 'Centro de Lima',
  notaContribucion: 'S/ 10 sugeridos por pasajero',
  estado: 'ACTIVA',
};

const VIAJES: Viaje[] = [
  {
    id: 1,
    fecha: '2026-10-13',
    hora: '07:30',
    estado: 'PROGRAMADO',
    pasajerosConfirmados: 2,
    capacidadMaxima: 3,
  },
  {
    id: 2,
    fecha: '2026-10-15',
    hora: '07:30',
    estado: 'PROGRAMADO',
    pasajerosConfirmados: 1,
    capacidadMaxima: 3,
  },
  {
    id: 3,
    fecha: '2026-10-10',
    hora: '07:30',
    estado: 'EN_PROGRESO',
    pasajerosConfirmados: 3,
    capacidadMaxima: 3,
  },
  {
    id: 4,
    fecha: '2026-10-06',
    hora: '07:30',
    estado: 'COMPLETADO',
    pasajerosConfirmados: 3,
    capacidadMaxima: 3,
  },
  {
    id: 5,
    fecha: '2026-10-03',
    hora: '07:30',
    estado: 'CANCELADO',
    pasajerosConfirmados: 0,
    capacidadMaxima: 3,
  },
  {
    id: 6,
    fecha: '2026-10-01',
    hora: '07:30',
    estado: 'COMPLETADO',
    pasajerosConfirmados: 3,
    capacidadMaxima: 3,
  },
  {
    id: 7,
    fecha: '2026-09-29',
    hora: '07:30',
    estado: 'COMPLETADO',
    pasajerosConfirmados: 3,
    capacidadMaxima: 3,
  },
];

@Component({
  selector: 'app-mis-viajes',
  templateUrl: './mis-viajes.html',
  styleUrl: './mis-viajes.css',
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatTableModule,
  ],
})
export class MisViajes {
  readonly columnas: string[] = ['ruta', 'fecha', 'hora', 'estado', 'pasajeros', 'acciones'];

  readonly viajes = signal<ViajeConRuta[]>(VIAJES.map((viaje) => ({ ...viaje, ruta: RUTA })));

  // El resumen del Figma M2.4 (2/1/4) no cuadra con su propia tabla; se replica tal cual.
  readonly programados = signal(2);
  readonly enCurso = signal(1);
  readonly completados = signal(4);
  readonly rutasConViajes = signal(1);

  formatearFecha(fecha: string): string {
    const partes = fecha.split('-').map(Number);
    if (partes.length !== 3 || partes.some((parte) => Number.isNaN(parte))) {
      return fecha;
    }
    const [anio, mes, dia] = partes;
    const valor = new Date(anio, mes - 1, dia);
    const texto = new Intl.DateTimeFormat('es-PE', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(valor);
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  formatearHora(hora: string): string {
    return hora.slice(0, 5);
  }

  pasajeros(viaje: ViajeConRuta): number {
    return viaje.pasajerosConfirmados ?? viaje.pasajeros ?? 0;
  }

  capacidad(viaje: ViajeConRuta): number {
    return viaje.capacidadMaxima ?? viaje.ruta.capacidadMaxima;
  }
}
