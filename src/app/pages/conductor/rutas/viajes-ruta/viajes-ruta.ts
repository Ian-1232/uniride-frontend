import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { Ruta, Viaje } from '../../../../core/models/ruta.model';
import { consultaQuery } from '../../../../core/services/consulta';
import { crearPaginatorIntl } from '../../../../core/services/paginator-intl';
import { RutasService } from '../../../../core/services/rutas.service';

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
  providers: [{ provide: MatPaginatorIntl, useValue: crearPaginatorIntl('viajes') }],
})
export class ViajesRuta {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(RutasService);

  readonly rutaId = Number(this.route.snapshot.paramMap.get('id'));
  readonly columnas: string[] = ['fecha', 'hora', 'estado', 'pasajeros', 'acciones'];

  // shortcut: se cargan hasta 100 viajes por ruta y se pagina en pantalla; subir a
  // paginación del servidor cuando una ruta pueda superar ese volumen.
  readonly consulta = consultaQuery(() =>
    forkJoin({
      ruta: this.service.obtener(this.rutaId),
      viajes: this.service.viajes(this.rutaId, 0, 100),
    }),
  );
  readonly ruta = computed<Ruta | null>(() => this.consulta.state().data?.ruta ?? null);
  readonly pagina = signal(0);
  readonly pageSize = 5;

  readonly viajesTotales = computed(() => this.consulta.state().data?.viajes.content ?? []);
  readonly total = computed(() => this.viajesTotales().length);
  readonly viajes = computed(() => {
    const inicio = this.pagina() * this.pageSize;
    return this.viajesTotales().slice(inicio, inicio + this.pageSize);
  });

  readonly programados = computed(() => this.contar('PROGRAMADO'));
  readonly enCurso = computed(() => this.contar('EN_PROGRESO'));
  readonly completados = computed(() => this.contar('COMPLETADO'));

  cambiarPagina(evento: PageEvent): void {
    this.pagina.set(evento.pageIndex);
  }

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

  pasajeros(viaje: Viaje): number {
    return viaje.pasajeros ?? viaje.pasajerosConfirmados ?? 0;
  }

  capacidad(viaje: Viaje): number {
    return viaje.capacidadMaxima ?? this.ruta()?.capacidadMaxima ?? 0;
  }

  private contar(estado: Viaje['estado']): number {
    return this.viajesTotales().filter((viaje) => viaje.estado === estado).length;
  }
}
