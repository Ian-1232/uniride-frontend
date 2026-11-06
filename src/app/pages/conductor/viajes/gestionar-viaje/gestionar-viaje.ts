import { Component, DestroyRef, Input, OnChanges, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { A11yModule } from '@angular/cdk/a11y';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Subscription, finalize, forkJoin } from 'rxjs';
import { CoordinacionService } from '../../../../core/services/coordinacion.service';
import { crearPaginatorIntl } from '../../../../core/services/paginator-intl';
import {
  CoordinacionViaje,
  SolicitudRecibida,
  ViajeRespuesta,
  coordinacionError,
  iniciales,
  penalidadEstimada,
  segundosParaSalida,
  salidaTexto,
} from '../../../../core/models/coordinacion.models';

type AccionViaje = 'confirmar' | 'iniciar' | 'completar' | 'cancelar';

@Component({
  selector: 'app-gestionar-viaje',
  imports: [RouterLink, A11yModule, MatButtonModule, MatCardModule, MatPaginatorModule],
  providers: [{ provide: MatPaginatorIntl, useFactory: () => crearPaginatorIntl('Pasajeros') }],
  templateUrl: './gestionar-viaje.html',
  styleUrl: './gestionar-viaje.css',
})
export class GestionarViaje implements OnChanges {
  @Input() viajeId = '';
  private readonly api = inject(CoordinacionService);
  private readonly destroyRef = inject(DestroyRef);
  private carga?: Subscription;
  readonly datos = signal<CoordinacionViaje | null>(null);
  readonly pasajeros = signal<SolicitudRecibida[]>([]);
  readonly cargando = signal(false);
  readonly enviando = signal(false);
  readonly error = signal('');
  readonly aviso = signal('');
  readonly dialogo = signal<'confirmar' | 'cancelar' | null>(null);
  readonly iniciales = iniciales;
  readonly salidaTexto = salidaTexto;
  readonly segundos = segundosParaSalida;
  readonly penalidad = penalidadEstimada;
  pagina = 0;
  total = 0;

  ngOnChanges() {
    this.pagina = 0;
    this.dialogo.set(null);
    this.aviso.set('');
    this.cargar();
  }

  cargar(borrarError = true) {
    this.carga?.unsubscribe();
    if (borrarError) this.error.set('');
    const id = Number(this.viajeId);
    if (!Number.isSafeInteger(id) || id < 1) {
      this.datos.set(null);
      this.error.set('El identificador del viaje no es válido.');
      return;
    }
    this.cargando.set(true);
    this.carga = forkJoin({
      datos: this.api.viaje(id),
      pasajeros: this.api.solicitudes(id, 'ACEPTADA', this.pagina),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: ({ datos, pasajeros }) => {
          this.datos.set(datos);
          this.pasajeros.set(pasajeros.content);
          this.total = pasajeros.totalElements;
        },
        error: (error) => {
          this.datos.set(null);
          this.pasajeros.set([]);
          this.error.set(coordinacionError(error));
        },
      });
  }

  paginar(evento: PageEvent) {
    this.pagina = evento.pageIndex;
    this.cargar();
  }
  cerrarDialogo() {
    if (!this.enviando()) this.dialogo.set(null);
  }

  ejecutar(accion: AccionViaje) {
    const datos = this.datos();
    if (this.enviando() || this.cargando() || !datos) return;
    this.enviando.set(true);
    this.error.set('');
    this.aviso.set('');
    this.api
      .cambiarViaje(datos.viaje.id, accion)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.enviando.set(false)),
      )
      .subscribe({
        next: (viaje) => {
          this.datos.update((actual) => (actual ? { ...actual, viaje } : null));
          this.aviso.set(viaje.mensaje || 'Viaje actualizado.');
          this.dialogo.set(null);
          this.cargar();
        },
        error: (error) => {
          this.error.set(coordinacionError(error));
          this.dialogo.set(null);
          if (error instanceof HttpErrorResponse && error.status === 409) {
            const respuesta = error.error as ViajeRespuesta;
            if (respuesta?.id === this.datos()?.viaje.id && respuesta.estado) {
              this.datos.update((actual) => (actual ? { ...actual, viaje: respuesta } : null));
            }
            this.cargar(false);
          }
        },
      });
  }
}
