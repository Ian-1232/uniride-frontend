import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { finalize } from 'rxjs';
import { CoordinacionService } from '../../../../../core/services/coordinacion.service';
import {
  ViajeRespuesta,
  coordinacionError,
  penalidadEstimada,
} from '../../../../../core/models/coordinacion.models';
import { ViajeVista } from '../../../../../core/models/viajes.models';
import { ReportesStatePanel } from '../../../../reportes/shared/reportes-state-panel/reportes-state-panel';

export interface CancelacionViajeResultado {
  readonly viaje?: ViajeRespuesta;
  readonly refrescar?: boolean;
}

@Component({
  selector: 'app-cancelar-viaje-dialog',
  imports: [MatDialogModule, ReportesStatePanel],
  styleUrl: '../cancelar-solicitud-dialog/cancelar-solicitud-dialog.css',
  template: `
    <h2 mat-dialog-title>Cancelar viaje completo</h2>
    <mat-dialog-content>
      <p>{{ viaje.origen }} → {{ viaje.destino }}</p>
      <p>
        Se cancelará el viaje para el conductor y todos los pasajeros. Se notificará a los
        involucrados.
      </p>
      <p>
        <strong>{{
          penalidad(viaje) === 'GRAVE'
            ? 'Penalidad grave estimada'
            : penalidad(viaje) === 'LEVE'
              ? 'Penalidad leve estimada'
              : 'Sin penalidad estimada'
        }}</strong>
      </p>
      <p>Más de 24 horas: sin penalidad. De 4 a 24 horas: leve. Menos de 4 horas: grave.</p>
      <p>
        La estimación usa la hora de tu equipo. Al confirmar se comprobará si el viaje sigue
        programado y se calculará la penalidad definitiva.
      </p>
      @if (busy()) {
        <p role="status">Cancelando viaje…</p>
      }
      @if (error()) {
        <app-reportes-state-panel
          role="alert"
          title="No se pudo cancelar"
          [message]="error()"
          tone="danger"
        />
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button
        class="ur-button ur-button--secondary"
        type="button"
        [disabled]="busy()"
        (click)="cerrar()"
      >
        Conservar viaje
      </button>
      @if (desactualizado()) {
        <button class="ur-button" type="button" (click)="actualizar()">Actualizar datos</button>
      } @else {
        <button
          class="ur-button ur-button--destructive"
          type="button"
          [disabled]="busy()"
          (click)="confirmar()"
        >
          Sí, cancelar viaje completo
        </button>
      }
    </mat-dialog-actions>
  `,
})
export class CancelarViajeDialog {
  protected readonly viaje = inject<ViajeVista>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<CancelarViajeDialog, CancelacionViajeResultado>);
  private readonly service = inject(CoordinacionService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly desactualizado = signal(false);
  protected readonly penalidad = penalidadEstimada;

  protected cerrar() {
    if (!this.busy()) this.ref.close();
  }
  protected actualizar() {
    if (!this.busy()) this.ref.close({ refrescar: true });
  }

  protected confirmar() {
    if (this.busy() || this.desactualizado()) return;
    this.busy.set(true);
    this.error.set('');
    this.ref.disableClose = true;
    this.service
      .cambiarViaje(this.viaje.id, 'cancelar')
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.busy.set(false);
          this.ref.disableClose = false;
        }),
      )
      .subscribe({
        next: (viaje) => this.ref.close({ viaje }),
        error: (error: HttpErrorResponse) => {
          this.error.set(coordinacionError(error));
          this.desactualizado.set([404, 409].includes(error.status));
        },
      });
  }
}
