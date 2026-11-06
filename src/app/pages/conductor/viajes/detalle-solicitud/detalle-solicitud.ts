import { Component, DestroyRef, Input, OnChanges, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { Subscription, finalize, forkJoin } from 'rxjs';
import { CoordinacionService } from '../../../../core/services/coordinacion.service';
import {
  CoordinacionViaje,
  DetalleSolicitud as Solicitud,
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
  selector: 'app-detalle-solicitud',
  imports: [RouterLink, MatButtonModule, MatCardModule, MatDividerModule, SolicitudAccionDialog],
  templateUrl: './detalle-solicitud.html',
  styleUrl: './detalle-solicitud.css',
})
export class DetalleSolicitud implements OnChanges {
  @Input() viajeId = '';
  @Input() solicitudId = '';
  private readonly api = inject(CoordinacionService);
  private readonly destroyRef = inject(DestroyRef);
  private carga?: Subscription;
  readonly viaje = signal<CoordinacionViaje | null>(null);
  readonly solicitud = signal<Solicitud | null>(null);
  readonly cargando = signal(false);
  readonly error = signal('');
  readonly aviso = signal<ResultadoSolicitud | null>(null);
  readonly dialogo = signal<AccionSolicitud | null>(null);
  readonly iniciales = iniciales;
  readonly salidaTexto = salidaTexto;
  ngOnChanges() {
    this.cargar();
  }
  cargar() {
    this.carga?.unsubscribe();
    this.error.set('');
    const viajeId = Number(this.viajeId),
      id = Number(this.solicitudId);
    if (![viajeId, id].every((n) => Number.isSafeInteger(n) && n > 0)) {
      this.error.set('El identificador de la solicitud no es válido.');
      this.solicitud.set(null);
      return;
    }
    this.cargando.set(true);
    this.carga = forkJoin({
      viaje: this.api.viaje(viajeId),
      solicitud: this.api.detalleSolicitud(id),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: ({ viaje, solicitud }) => {
          if (solicitud.viajeId !== viajeId) {
            this.solicitud.set(null);
            this.error.set('La solicitud no pertenece a este viaje.');
            return;
          }
          this.viaje.set(viaje);
          this.solicitud.set(solicitud);
        },
        error: (error) => {
          this.solicitud.set(null);
          this.viaje.set(null);
          this.error.set(coordinacionError(error));
        },
      });
  }
  procesable() {
    return (
      !this.cargando() &&
      this.solicitud()?.estado === 'PENDIENTE' &&
      this.viaje()?.viaje.estado === 'PROGRAMADO' &&
      segundosParaSalida(this.viaje()!.viaje) > 0
    );
  }
  abrir(tipo: 'aceptar' | 'rechazar') {
    if (!this.procesable() || (tipo === 'aceptar' && !this.viaje()?.cuposDisponibles)) return;
    const solicitud = this.solicitud()!;
    this.dialogo.set({ tipo, ids: [solicitud.solicitudId], nombre: solicitud.pasajero.nombre });
  }
  resuelta(resultado: ResultadoSolicitud) {
    this.dialogo.set(null);
    this.aviso.set(resultado);
    this.cargar();
  }
}
