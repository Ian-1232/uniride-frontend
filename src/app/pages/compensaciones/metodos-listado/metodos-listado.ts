import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  LISTADO_COMPENSACIONES_STATES,
  ListadoCompensacionesState,
  METODOS_COMPENSACION_DEMO,
  MetodoCompensacionResponse,
  resolveCompensacionesState,
  TIPO_COMPENSACION_LABELS,
} from '../compensaciones.models';
import { EliminarMetodoDialog } from '../eliminar-metodo-dialog/eliminar-metodo-dialog';
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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  private readonly automaticDialogOpened = signal(false);

  protected readonly methods = METODOS_COMPENSACION_DEMO;
  protected readonly labels = TIPO_COMPENSACION_LABELS;
  protected readonly localOutcome = signal<'none' | 'deleted'>('none');
  protected readonly state = computed<ListadoCompensacionesState>(() =>
    resolveCompensacionesState(
      this.queryParams().get('estado'),
      LISTADO_COMPENSACIONES_STATES,
      'disponible',
    ),
  );

  constructor() {
    effect(() => {
      if (this.state() === 'confirmar-eliminacion' && !this.automaticDialogOpened()) {
        this.automaticDialogOpened.set(true);
        this.openDeleteDialog(this.methods[2]);
      }
    });
  }

  protected openDeleteDialog(method: MetodoCompensacionResponse): void {
    this.localOutcome.set('none');
    const dialogRef = this.dialog.open(EliminarMetodoDialog, {
      data: method,
      width: '35rem',
      maxWidth: 'calc(100vw - (2 * var(--ur-space-16)))',
      autoFocus: 'first-tabbable',
      restoreFocus: true,
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.localOutcome.set('deleted');
      }
    });
  }

  protected showDefaultState(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { estado: null },
      queryParamsHandling: 'merge',
    });
  }
}
