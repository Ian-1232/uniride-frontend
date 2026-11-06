import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Ruta } from '../../../../core/models/ruta.model';

@Component({
  selector: 'app-eliminar-ruta-dialog',
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  templateUrl: './eliminar-ruta-dialog.html',
  styleUrl: './eliminar-ruta-dialog.css',
})
export class EliminarRutaDialog {
  private readonly dialogRef = inject(MatDialogRef<EliminarRutaDialog, boolean>);
  readonly ruta = inject<Ruta>(MAT_DIALOG_DATA);

  cancelar(): void {
    this.dialogRef.close(false);
  }

  confirmar(): void {
    this.dialogRef.close(true);
  }
}
