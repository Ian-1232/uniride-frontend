import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { Pagina, Ruta, Viaje } from '../../../../models/ruta.model';
import { RutasService, mensajeError } from '../../../../services/rutas.service';

interface ViajeConRuta extends Viaje {
  ruta: Ruta;
}

@Component({
  selector: 'app-mis-viajes',
  templateUrl: './mis-viajes.html',
  styleUrl: './mis-viajes.css',
  imports: [RouterLink, MatButtonModule, MatCardModule, MatChipsModule, MatIconModule, MatTableModule],
})
export class MisViajes {
  private readonly rutasService = inject(RutasService);
  private readonly pageSize = 100;

  readonly columnas: string[] = ['ruta', 'fecha', 'hora', 'estado', 'pasajeros', 'acciones'];
  readonly viajes = signal<ViajeConRuta[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  readonly programados = computed(
    () => this.viajes().filter((viaje) => viaje.estado === 'PROGRAMADO').length,
  );
  readonly enCurso = computed(
    () => this.viajes().filter((viaje) => viaje.estado === 'EN_PROGRESO').length,
  );
  readonly completados = computed(
    () => this.viajes().filter((viaje) => viaje.estado === 'COMPLETADO').length,
  );
  readonly rutasConViajes = computed(
    () => new Set(this.viajes().map((viaje) => viaje.ruta.id)).size,
  );

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.viajes.set([]);

    this.rutasService
      .listarRutas(0, this.pageSize)
      .pipe(
        switchMap((primera) =>
          this.acumularPaginas(primera, (pagina) => this.rutasService.listarRutas(pagina, this.pageSize)),
        ),
        switchMap((rutas) => {
          if (rutas.length === 0) {
            return of<ViajeConRuta[]>([]);
          }
          return forkJoin(rutas.map((ruta) => this.cargarViajesDeRuta(ruta))).pipe(
            map((listas) => listas.flat()),
          );
        }),
        map((viajes) => this.ordenar(viajes)),
      )
      .subscribe({
        next: (viajes) => {
          this.viajes.set(viajes);
          this.cargando.set(false);
        },
        error: (error: unknown) => {
          this.error.set(mensajeError(error));
          this.cargando.set(false);
        },
      });
  }

  private cargarViajesDeRuta(ruta: Ruta): Observable<ViajeConRuta[]> {
    return this.rutasService.listarViajes(ruta.id, 0, this.pageSize).pipe(
      switchMap((primera) =>
        this.acumularPaginas(primera, (pagina) =>
          this.rutasService.listarViajes(ruta.id, pagina, this.pageSize),
        ),
      ),
      map((viajes) => viajes.map((viaje) => ({ ...viaje, ruta }))),
    );
  }

  private acumularPaginas<T>(
    primera: Pagina<T>,
    cargarPagina: (pagina: number) => Observable<Pagina<T>>,
  ): Observable<T[]> {
    const restantes = Array.from(
      { length: Math.max(primera.totalPages - 1, 0) },
      (_, indice) => indice + 1,
    );

    if (restantes.length === 0) {
      return of(primera.content);
    }

    return forkJoin(restantes.map(cargarPagina)).pipe(
      map((paginas) => [
        ...primera.content,
        ...paginas.flatMap((pagina) => pagina.content),
      ]),
    );
  }

  private ordenar(viajes: ViajeConRuta[]): ViajeConRuta[] {
    return [...viajes].sort((a, b) => {
      const fechaA = `${a.fecha}T${a.hora}`;
      const fechaB = `${b.fecha}T${b.hora}`;
      return fechaA.localeCompare(fechaB) || a.id - b.id;
    });
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

  pasajeros(viaje: ViajeConRuta): number {
    return viaje.pasajerosConfirmados ?? viaje.pasajeros ?? 0;
  }

  capacidad(viaje: ViajeConRuta): number {
    return viaje.capacidadMaxima ?? viaje.ruta.capacidadMaxima;
  }
}
