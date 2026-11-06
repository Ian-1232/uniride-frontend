import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import { MetodosCompensacionService } from '../../../core/services/metodos-compensacion.service';
import { MetodoCompensacionResponse, TIPO_COMPENSACION_LABELS } from '../compensaciones.models';
import { BLOCKED_DELETE, compensationError } from '../shared/compensacion-error';
import { CompensacionStatePanel } from '../shared/compensacion-state-panel/compensacion-state-panel';

export interface DeleteMethodResult {
  readonly action: 'deleted' | 'refresh' | 'deactivate';
}

@Component({
  selector: 'app-eliminar-metodo-dialog',
  imports: [MatButtonModule, MatDialogModule, MatIconModule, CompensacionStatePanel],
  templateUrl: './eliminar-metodo-dialog.html',
  styleUrl: './eliminar-metodo-dialog.css',
})
export class EliminarMetodoDialog {
  private readonly ref = inject(MatDialogRef<EliminarMetodoDialog, DeleteMethodResult>);
  private readonly service = inject(MetodosCompensacionService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly method = inject<MetodoCompensacionResponse>(MAT_DIALOG_DATA);
  protected readonly typeLabel = TIPO_COMPENSACION_LABELS[this.method.tipo];
  protected readonly busy = signal(false);
  protected readonly outcome = signal<'ready' | 'error' | 'blocked' | 'missing'>('ready');
  protected readonly message = signal('');
  protected cancel(): void {
    if (!this.busy()) this.ref.close();
  }
  protected resolve(action: 'refresh' | 'deactivate'): void {
    if (!this.busy()) this.ref.close({ action });
  }
  protected confirm(): void {
    if (this.busy() || this.outcome() === 'blocked' || this.outcome() === 'missing') return;
    this.busy.set(true);
    this.message.set('');
    this.ref.disableClose = true;
    this.service
      .eliminar(this.method.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.busy.set(false);
          this.ref.disableClose = false;
        }),
      )
      .subscribe({
        next: () => this.ref.close({ action: 'deleted' }),
        error: (error: HttpErrorResponse) => {
          this.outcome.set(
            error.status === 404
              ? 'missing'
              : error.status === 409 && error.error?.mensaje === BLOCKED_DELETE
                ? 'blocked'
                : 'error',
          );
          this.message.set(compensationError(error));
        },
      });
  }
}
