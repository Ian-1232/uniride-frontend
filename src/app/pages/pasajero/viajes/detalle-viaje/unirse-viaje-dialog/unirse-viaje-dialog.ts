import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  ETIQUETAS_COMPENSACION,
  METODOS_COMPENSACION,
  MetodoCompensacion,
  TipoCompensacion,
  Viaje,
} from '../../viajes.models';

interface DialogData {
  readonly viaje: Viaje;
}

@Component({
  selector: 'app-unirse-viaje-dialog',
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  templateUrl: './unirse-viaje-dialog.html',
  styleUrl: './unirse-viaje-dialog.css',
})
export class UnirseViajeDialog {
  private readonly data = inject<DialogData>(MAT_DIALOG_DATA);
  private readonly builder = inject(FormBuilder);

  protected readonly viaje = this.data.viaje;
  protected readonly tipos: readonly TipoCompensacion[] = ['DINERO', 'GASOLINA', 'FAVOR'];
  protected readonly etiquetas = ETIQUETAS_COMPENSACION;
  protected readonly todosLosMetodos = METODOS_COMPENSACION;

  protected readonly form = this.builder.nonNullable.group({
    preferencia: ['', Validators.required],
    metodo: [{ value: '', disabled: true }],
    mensaje: [''],
  });

  constructor(private readonly dialogRef: MatDialogRef<UnirseViajeDialog>) {
    this.form.controls.preferencia.valueChanges.subscribe((preferencia) => {
      const control = this.form.controls.metodo;
      control.reset('');
      if (preferencia) {
        control.enable();
      } else {
        control.disable();
      }
    });
  }

  protected get metodosPreferidos(): MetodoCompensacion[] {
    const preferencia = this.form.controls.preferencia.value;
    return this.todosLosMetodos.filter((metodo) => metodo.tipo === preferencia);
  }

  protected cancelar(): void {
    this.dialogRef.close();
  }

  protected enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close(this.form.getRawValue());
  }
}
