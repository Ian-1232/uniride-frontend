import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { finalize } from 'rxjs';
import { SolicitudesPasajeroService } from '../../../../../core/services/solicitudes-pasajero.service';
import { ReportesStatePanel } from '../../../../reportes/shared/reportes-state-panel/reportes-state-panel';
import { SolicitudRespuesta } from '../../viajes.models';
import { pasajeroError } from '../../shared/pasajero-query';
export interface CancelacionResultado {
  readonly solicitud?: SolicitudRespuesta;
  readonly refrescar?: boolean;
}
@Component({
  selector: 'app-cancelar-solicitud-dialog',
  imports: [MatDialogModule, ReportesStatePanel],
  templateUrl: './cancelar-solicitud-dialog.html',
  styleUrl: './cancelar-solicitud-dialog.css',
})
export class CancelarSolicitudDialog {
  protected readonly solicitud = inject<SolicitudRespuesta>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<CancelarSolicitudDialog, CancelacionResultado>);
  private readonly service = inject(SolicitudesPasajeroService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly missing = signal(false);
  protected cancelar(): void {
    if (!this.busy()) this.ref.close();
  }
  protected actualizar(): void {
    if (!this.busy()) this.ref.close({ refrescar: true });
  }
  protected confirmar(): void {
    if (this.busy() || this.missing() || this.solicitud.estado !== 'PENDIENTE') return;
    this.busy.set(true);
    this.error.set('');
    this.ref.disableClose = true;
    this.service
      .cancelar(this.solicitud.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.busy.set(false);
          this.ref.disableClose = false;
        }),
      )
      .subscribe({
        next: (solicitud) => this.ref.close({ solicitud }),
        error: (error: HttpErrorResponse) => {
          this.error.set(pasajeroError(error));
          this.missing.set(error.status === 404);
        },
      });
  }
}
