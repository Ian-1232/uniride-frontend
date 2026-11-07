import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ImpactoEdicion {
  origen: string;
  destino: string;
  salidaAnterior?: string;
  salidaNueva?: string;
  pasajerosAceptados?: number;
  pierdeConfirmacion?: boolean;
}

@Component({
  selector: 'app-confirmar-impacto-dialog',
  host: { '[class.reprogramacion]': '!!impacto.salidaNueva' },
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  templateUrl: './confirmar-impacto-dialog.html',
  styleUrl: './confirmar-impacto-dialog.css',
})
export class ConfirmarImpactoDialog {
  private readonly dialogRef = inject(MatDialogRef<ConfirmarImpactoDialog, boolean>);
  readonly impacto = inject<ImpactoEdicion>(MAT_DIALOG_DATA);

  cancelar(): void {
    this.dialogRef.close(false);
  }

  confirmar(): void {
    this.dialogRef.close(true);
  }
}
