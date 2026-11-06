import { Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { A11yModule } from '@angular/cdk/a11y';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { finalize } from 'rxjs';
import { CoordinacionService } from '../../../core/services/coordinacion.service';
import { coordinacionError } from '../../../core/models/coordinacion.models';

export interface AccionSolicitud {
  tipo: 'aceptar' | 'rechazar';
  ids: number[];
  nombre: string;
}
export interface ResultadoSolicitud {
  exito: boolean;
  mensaje: string;
}

@Component({
  selector: 'app-solicitud-accion-dialog',
  imports: [
    A11yModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: ` <div class="dialog-backdrop">
    <mat-card
      class="dialog-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="solicitud-dialog-title"
      cdkTrapFocus
      [cdkTrapFocusAutoCapture]="true"
      (keydown.escape)="cerrar()"
    >
      <h2 id="solicitud-dialog-title">
        {{ datos().tipo === 'aceptar' ? 'Aceptar solicitud' : 'Rechazar solicitud' }}
      </h2>
      <p>
        {{
          datos().tipo === 'aceptar'
            ? '¿Aceptar a ' + datos().nombre + '?'
            : 'Se rechazarán ' + datos().ids.length + ' solicitud(es) pendientes.'
        }}
      </p>
      @if (datos().tipo === 'aceptar') {
        <div class="notice info">
          <strong>Se reservará un cupo</strong>
          <p>Se creará un borrador del acuerdo de compensación.</p>
        </div>
      } @else {
        <mat-form-field appearance="outline"
          ><mat-label>Motivo (opcional)</mat-label
          ><textarea matInput [formControl]="motivo" rows="3" maxlength="255"></textarea
          ><mat-hint>Máximo 255 caracteres</mat-hint
          ><mat-error>El motivo no debe superar los 255 caracteres.</mat-error></mat-form-field
        >
      }
      @if (error()) {
        <p class="error-text" role="alert">{{ error() }}</p>
      }
      <div class="dialog-actions">
        <button matButton="outlined" (click)="cerrar()" [disabled]="enviando()" cdkFocusInitial>
          Volver</button
        ><button
          matButton="filled"
          [class.danger-button]="datos().tipo === 'rechazar'"
          (click)="confirmar()"
          [disabled]="enviando() || motivo.invalid"
        >
          {{
            enviando()
              ? 'Guardando…'
              : datos().tipo === 'aceptar'
                ? 'Aceptar solicitud'
                : 'Rechazar selección'
          }}
        </button>
      </div>
    </mat-card>
  </div>`,
})
export class SolicitudAccionDialog {
  readonly datos = input.required<AccionSolicitud>();
  readonly terminada = output<ResultadoSolicitud>();
  readonly cancelada = output<void>();
  private readonly api = inject(CoordinacionService);
  private readonly destroyRef = inject(DestroyRef);
  readonly motivo = new FormControl('', {
    nonNullable: true,
    validators: [Validators.maxLength(255)],
  });
  readonly enviando = signal(false);
  readonly error = signal('');

  cerrar() {
    if (!this.enviando()) this.cancelada.emit();
  }
  confirmar() {
    if (this.enviando() || this.motivo.invalid || !this.datos().ids.length) return;
    this.enviando.set(true);
    this.error.set('');
    const datos = this.datos();
    const peticion =
      datos.tipo === 'aceptar'
        ? this.api.aceptar(datos.ids[0])
        : this.api.rechazar(datos.ids, this.motivo.value);
    peticion
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.enviando.set(false)),
      )
      .subscribe({
        next: () =>
          this.terminada.emit({
            exito: true,
            mensaje:
              datos.tipo === 'aceptar'
                ? 'Solicitud aceptada. Se reservó un cupo y se generó el borrador de compensación.'
                : 'Solicitudes rechazadas. El motivo quedó guardado.',
          }),
        error: (error) => {
          const mensaje = coordinacionError(error);
          if (error instanceof HttpErrorResponse && [404, 409].includes(error.status))
            this.terminada.emit({ exito: false, mensaje });
          else this.error.set(mensaje);
        },
      });
  }
}
