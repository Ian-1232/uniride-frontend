import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MetodoCompensacionResponse, TIPO_COMPENSACION_LABELS } from '../compensaciones.models';

@Component({
  selector: 'app-eliminar-metodo-dialog',
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  templateUrl: './eliminar-metodo-dialog.html',
  styleUrl: './eliminar-metodo-dialog.css',
})
export class EliminarMetodoDialog {
  private readonly dialogRef = inject(MatDialogRef<EliminarMetodoDialog, boolean>);
  protected readonly method = inject<MetodoCompensacionResponse>(MAT_DIALOG_DATA);
  protected readonly typeLabel = TIPO_COMPENSACION_LABELS[this.method.tipo];

  protected cancel(): void {
    this.dialogRef.close(false);
  }

  protected confirm(): void {
    this.dialogRef.close(true);
  }
}
