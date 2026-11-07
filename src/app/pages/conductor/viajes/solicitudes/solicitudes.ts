import { Component, DestroyRef, Input, OnChanges, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Subscription, finalize, forkJoin } from 'rxjs';
import { CoordinacionService } from '../../../../core/services/coordinacion.service';
import { crearPaginatorIntl } from '../../../../core/services/paginator-intl';
import {
  CoordinacionViaje,
  EstadoSolicitud,
  SolicitudRecibida,
  coordinacionError,
  iniciales,
  segundosParaSalida,
  salidaTexto,
} from '../../../../core/models/coordinacion.models';
import {
  AccionSolicitud,
  ResultadoSolicitud,
  SolicitudAccionDialog,
} from '../solicitud-accion-dialog';

@Component({
  selector: 'app-solicitudes',
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatPaginatorModule,
    SolicitudAccionDialog,
  ],
  providers: [{ provide: MatPaginatorIntl, useFactory: () => crearPaginatorIntl('Solicitudes') }],
  templateUrl: './solicitudes.html',
  styleUrl: './solicitudes.css',
})
export class Solicitudes implements OnChanges {
  @Input() viajeId = '';
  private readonly api = inject(CoordinacionService);
  private readonly destroyRef = inject(DestroyRef);
  private carga?: Subscription;
  readonly viaje = signal<CoordinacionViaje | null>(null);
  readonly solicitudes = signal<SolicitudRecibida[]>([]);
  readonly cargando = signal(false);
  readonly error = signal('');
  readonly aviso = signal<ResultadoSolicitud | null>(null);
  readonly seleccion = signal(new Set<number>());
  readonly dialogo = signal<AccionSolicitud | null>(null);
  readonly procesable = computed(
    () =>
      this.viaje()?.viaje.estado === 'PROGRAMADO' && segundosParaSalida(this.viaje()!.viaje) > 0,
  );
  readonly iniciales = iniciales;
  readonly salidaTexto = salidaTexto;
  readonly filtros: { estado: EstadoSolicitud | ''; etiqueta: string }[] = [
    { estado: '', etiqueta: 'Todas' },
    { estado: 'PENDIENTE', etiqueta: 'Pendientes' },
    { estado: 'ACEPTADA', etiqueta: 'Aceptadas' },
    { estado: 'RECHAZADA', etiqueta: 'Rechazadas' },
    { estado: 'CANCELADA', etiqueta: 'Canceladas' },
  ];
  filtro: EstadoSolicitud | '' = '';
  pagina = 0;
  tamanio = 10;
  total = 0;

  ngOnChanges() {
    this.pagina = 0;
    this.cargar();
  }
  cargar() {
    this.carga?.unsubscribe();
    this.seleccion.set(new Set());
    this.error.set('');
    const id = Number(this.viajeId);
    if (!Number.isSafeInteger(id) || id < 1) {
      this.viaje.set(null);
      this.error.set('El identificador del viaje no es válido.');
      return;
    }
    this.cargando.set(true);
    this.carga = forkJoin({
      viaje: this.api.viaje(id),
      pagina: this.api.solicitudes(id, this.filtro, this.pagina, this.tamanio),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: ({ viaje, pagina }) => {
          this.viaje.set(viaje);
          this.solicitudes.set(pagina.content);
          this.total = pagina.totalElements;
          if (!pagina.content.length && this.pagina > 0 && this.total > 0) {
            this.pagina--;
            this.cargar();
          }
        },
        error: (error) => {
          this.viaje.set(null);
          this.solicitudes.set([]);
          this.error.set(coordinacionError(error));
        },
      });
  }
  filtrar(estado: EstadoSolicitud | '') {
    this.filtro = estado;
    this.pagina = 0;
    this.cargar();
  }
  paginar(evento: PageEvent) {
    this.pagina = evento.pageIndex;
    this.tamanio = evento.pageSize;
    this.cargar();
  }
  seleccionar(id: number, marcado: boolean) {
    this.seleccion.update((actual) => {
      const siguiente = new Set(actual);
      if (marcado) siguiente.add(id);
      else siguiente.delete(id);
      return siguiente;
    });
  }
  abrir(tipo: 'aceptar' | 'rechazar', solicitud?: SolicitudRecibida) {
    if (this.cargando() || !this.procesable()) return;
    if (tipo === 'aceptar' && !this.viaje()!.cuposDisponibles) return;
    const ids = solicitud ? [solicitud.id] : [...this.seleccion()];
    if (ids.length) this.dialogo.set({ tipo, ids, nombre: solicitud?.pasajeroNombre ?? '' });
  }
  resuelta(resultado: ResultadoSolicitud) {
    this.dialogo.set(null);
    this.aviso.set(resultado);
    this.cargar();
  }
}
