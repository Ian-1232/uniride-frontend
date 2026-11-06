import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { finalize, take } from 'rxjs';
import { MetodosCompensacionService } from '../../../core/services/metodos-compensacion.service';
import { MetodoCompensacionResponse, TIPO_COMPENSACION_LABELS } from '../compensaciones.models';
import {
  DeleteMethodResult,
  EliminarMetodoDialog,
} from '../eliminar-metodo-dialog/eliminar-metodo-dialog';
import { compensationError } from '../shared/compensacion-error';
import { CompensacionStatePanel } from '../shared/compensacion-state-panel/compensacion-state-panel';

@Component({
  selector: 'app-metodos-listado',
  imports: [
    CompensacionStatePanel,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    RouterLink,
  ],
  templateUrl: './metodos-listado.html',
  styleUrl: './metodos-listado.css',
})
export class MetodosListado {
  private readonly service = inject(MetodosCompensacionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  protected readonly methods = signal<readonly MetodoCompensacionResponse[]>([]);
  protected readonly labels = TIPO_COMPENSACION_LABELS;
  protected readonly state = signal<'cargando' | 'disponible' | 'vacio' | 'error'>('disponible');
  protected readonly message = signal('');
  protected readonly notice = signal('');
  protected readonly dialogOpen = signal(false);

  constructor() {
    this.load();
  }

  protected load(): void {
    if (this.state() === 'cargando') return;
    this.state.set('cargando');
    this.message.set('');
    this.service
      .listar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (methods) => {
          this.methods.set(methods);
          this.state.set(methods.length ? 'disponible' : 'vacio');
        },
        error: (error) => {
          this.message.set(compensationError(error));
          this.state.set('error');
        },
      });
  }

  protected openDeleteDialog(method: MetodoCompensacionResponse): void {
    if (this.dialogOpen()) return;
    this.dialogOpen.set(true);
    this.notice.set('');
    const ref = this.dialog.open<
      EliminarMetodoDialog,
      MetodoCompensacionResponse,
      DeleteMethodResult
    >(EliminarMetodoDialog, {
      data: method,
      width: '35rem',
      maxWidth: 'calc(100vw - (2 * var(--ur-space-16)))',
      autoFocus: 'first-tabbable',
      restoreFocus: true,
    });
    const unregister = this.destroyRef.onDestroy(() => ref.close());
    ref
      .afterClosed()
      .pipe(
        take(1),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          unregister();
          this.dialogOpen.set(false);
        }),
      )
      .subscribe((result) => {
        if (result?.action === 'deleted' || result?.action === 'refresh') {
          this.notice.set(
            result.action === 'deleted'
              ? 'Método eliminado correctamente.'
              : 'El método ya no existe.',
          );
          this.load();
        } else if (result?.action === 'deactivate') {
          void this.router.navigate(['/compensaciones/metodos', method.id, 'editar']);
        }
      });
  }
}
