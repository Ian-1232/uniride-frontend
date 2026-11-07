import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { Viaje, ViajeConRuta } from '../../../../core/models/ruta.models';
import { consultaQuery } from '../../../../core/services/consulta';
import { RutasService } from '../../../../core/services/rutas.service';

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
  private readonly service = inject(RutasService);

  readonly consulta = consultaQuery(() => this.service.viajesPropios());

  readonly columnas: string[] = ['ruta', 'fecha', 'hora', 'estado', 'pasajeros', 'acciones'];

  readonly viajes = computed(() => this.consulta.state().data ?? []);
  readonly rutasConViajes = computed(
    () => new Set(this.viajes().map((viaje) => viaje.ruta.id)).size,
  );
  readonly programados = computed(() => this.contar('PROGRAMADO'));
  readonly enCurso = computed(() => this.contar('EN_PROGRESO'));
  readonly completados = computed(() => this.contar('COMPLETADO'));

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
    return viaje.pasajeros ?? viaje.pasajerosConfirmados ?? 0;
  }

  capacidad(viaje: ViajeConRuta): number {
    return viaje.capacidadMaxima ?? viaje.ruta.capacidadMaxima;
  }

  private contar(estado: Viaje['estado']): number {
    return this.viajes().filter((viaje) => viaje.estado === estado).length;
  }
}
