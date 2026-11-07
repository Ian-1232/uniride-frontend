import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { finalize } from 'rxjs';
import { SolicitudesPasajeroService } from '../../../../../core/services/solicitudes-pasajero.service';
import { MetodosCompensacionService } from '../../../../../core/services/metodos-compensacion.service';
import { MetodoCompensacionResponse } from '../../../../../core/models/compensaciones.models';
import { ReportesStatePanel } from '../../../../reportes/shared/reportes-state-panel/reportes-state-panel';
import {
  ETIQUETAS_COMPENSACION,
  salidaTexto,
  SolicitudRespuesta,
  TipoCompensacion,
  ViajeVista,
} from '../../../../../core/models/viajes.models';
import { pasajeroError } from '../../shared/pasajero-query';
@Component({
  selector: 'app-unirse-viaje-dialog',
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
    ReportesStatePanel,
  ],
  templateUrl: './unirse-viaje-dialog.html',
  styleUrl: './unirse-viaje-dialog.css',
})
export class UnirseViajeDialog {
  protected readonly viaje = inject<{ viaje: ViajeVista }>(MAT_DIALOG_DATA).viaje;
  private readonly ref = inject(MatDialogRef<UnirseViajeDialog, SolicitudRespuesta>);
  private readonly service = inject(SolicitudesPasajeroService);
  private readonly methodsService = inject(MetodosCompensacionService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly tipos: readonly TipoCompensacion[] = ['DINERO', 'GASOLINA', 'FAVOR'];
  protected readonly etiquetas = ETIQUETAS_COMPENSACION;
  protected readonly salida = salidaTexto;
  protected readonly methods = signal<readonly MetodoCompensacionResponse[]>([]);
  protected readonly methodsLoading = signal(false);
  protected readonly methodsError = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly form = new FormGroup({
    preferencia: new FormControl<TipoCompensacion | null>(null, [
      Validators.required,
      Validators.pattern(/^(DINERO|GASOLINA|FAVOR)$/),
    ]),
    metodo: new FormControl<number | null>(null),
    mensaje: new FormControl('', { nonNullable: true }),
  });
  constructor() {
    this.loadMethods();
    this.form.controls.preferencia.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.form.controls.metodo.reset(null));
  }
  protected get metodosPreferidos() {
    return this.methods().filter(
      (method) => method.activo && method.tipo === this.form.controls.preferencia.value,
    );
  }
  protected loadMethods(): void {
    if (this.methodsLoading()) return;
    this.methodsLoading.set(true);
    this.methodsError.set('');
    this.methodsService
      .listar()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.methodsLoading.set(false)),
      )
      .subscribe({
        next: (methods) => this.methods.set(methods),
        error: () =>
          this.methodsError.set(
            'No se pudieron cargar tus métodos. Puedes reintentar o enviar sin método personal.',
          ),
      });
  }
  protected cancelar(): void {
    if (!this.busy()) this.ref.close();
  }
  protected enviar(): void {
    if (this.busy()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const values = this.form.getRawValue();
    if (
      values.metodo !== null &&
      !this.metodosPreferidos.some((method) => method.id === values.metodo)
    ) {
      this.error.set(
        'Selecciona un método activo que coincida con tu preferencia, o continúa sin método.',
      );
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.ref.disableClose = true;
    this.form.disable({ emitEvent: false });
    this.service
      .crear(this.viaje.id, {
        preferenciaCompensacion: values.preferencia!,
        metodoCompensacionId: values.metodo,
        ...(values.mensaje.trim() ? { mensaje: values.mensaje.trim() } : {}),
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.busy.set(false);
          this.ref.disableClose = false;
          if (!this.destroyRef.destroyed) this.form.enable({ emitEvent: false });
        }),
      )
      .subscribe({
        next: (result) => this.ref.close(result),
        error: (error) => this.error.set(pasajeroError(error)),
      });
  }
}
