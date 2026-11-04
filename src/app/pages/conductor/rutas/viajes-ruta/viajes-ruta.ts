import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { Ruta, Viaje } from '../../../../models/ruta.model';
import { crearPaginatorIntl } from '../../../../services/paginator-intl';
import { RutasService, mensajeError } from '../../../../services/rutas.service';

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
  private readonly rutasService = inject(RutasService);

  readonly rutaId = Number(this.route.snapshot.paramMap.get('id'));
  readonly columnas: string[] = ['fecha', 'hora', 'estado', 'pasajeros', 'acciones'];

  readonly ruta = signal<Ruta | null>(null);
  readonly viajes = signal<Viaje[]>([]);
  readonly todos = signal<Viaje[]>([]);
  readonly total = signal(0);
  readonly pagina = signal(0);
  readonly pageSize = 5;
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  readonly programados = computed(
    () => this.todos().filter((viaje) => viaje.estado === 'PROGRAMADO').length,
  );
  readonly enCurso = computed(
    () => this.todos().filter((viaje) => viaje.estado === 'EN_PROGRESO').length,
  );
  readonly completados = computed(
    () => this.todos().filter((viaje) => viaje.estado === 'COMPLETADO').length,
  );

  constructor() {
    if (!Number.isFinite(this.rutaId)) {
      this.error.set('No se indicó la ruta cuyos viajes deseas ver.');
      this.cargando.set(false);
      return;
    }

    const rutaNavegada = history.state?.ruta as Ruta | undefined;
    if (rutaNavegada && rutaNavegada.id === this.rutaId) {
      this.ruta.set(rutaNavegada);
    } else {
      this.cargarRuta();
    }

    this.cargarViajes();
    this.cargarResumen();
  }

  cargarRuta(): void {
    this.rutasService.obtenerRuta(this.rutaId).subscribe({
      next: (ruta) => this.ruta.set(ruta),
      error: () => this.ruta.set(null),
    });
  }

  cargarViajes(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.rutasService.listarViajes(this.rutaId, this.pagina(), this.pageSize).subscribe({
      next: (respuesta) => {
        this.viajes.set(respuesta.content);
        this.total.set(respuesta.totalElements);
        this.cargando.set(false);
        if (respuesta.content.length === 0 && this.pagina() > 0) {
          this.pagina.set(Math.max(respuesta.totalPages - 1, 0));
          this.cargarViajes();
        }
      },
      error: (error: unknown) => {
        this.error.set(mensajeError(error));
        this.cargando.set(false);
      },
    });
  }

  cargarResumen(): void {
    this.rutasService.listarViajes(this.rutaId, 0, 100).subscribe({
      next: (respuesta) => this.todos.set(respuesta.content),
      error: () => this.todos.set([]),
    });
  }

  cambiarPagina(evento: PageEvent): void {
    this.pagina.set(evento.pageIndex);
    this.cargarViajes();
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
    return viaje.pasajerosConfirmados ?? viaje.pasajeros ?? 0;
  }

  capacidad(viaje: Viaje): number {
    return viaje.capacidadMaxima ?? this.ruta()?.capacidadMaxima ?? 0;
  }
}
