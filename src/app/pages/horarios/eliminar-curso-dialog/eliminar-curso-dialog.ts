import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { finalize } from 'rxjs';
import { HorariosService } from '../../../core/services/horarios.service';
import { CursoRespuesta, diaCurso, horaCurso } from '../../../core/models/horarios.models';
import { horariosError } from '../horarios-error';
import { ReportesStatePanel } from '../../reportes/shared/reportes-state-panel/reportes-state-panel';

@Component({
  selector: 'app-eliminar-curso-dialog',
  imports: [MatDialogModule, MatButtonModule, ReportesStatePanel],
  templateUrl: './eliminar-curso-dialog.html',
  styleUrl: './eliminar-curso-dialog.css',
})
export class EliminarCursoDialog {
  readonly curso = inject<CursoRespuesta>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<EliminarCursoDialog, boolean>);
  private readonly service = inject(HorariosService);
  private readonly destroyRef = inject(DestroyRef);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly dia = diaCurso;
  readonly hora = horaCurso;
  cancelar(): void {
    if (!this.busy()) this.ref.close(false);
  }
  confirmar(): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.ref.disableClose = true;
    this.service
      .eliminar(this.curso.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.busy.set(false);
          this.ref.disableClose = false;
        }),
      )
      .subscribe({
        next: () => this.ref.close(true),
        error: (error) => this.error.set(horariosError(error)),
      });
  }
}
