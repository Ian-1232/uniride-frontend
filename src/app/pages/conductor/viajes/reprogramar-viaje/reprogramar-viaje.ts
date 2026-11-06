import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import {
  catchError,
  distinctUntilChanged,
  EMPTY,
  finalize,
  forkJoin,
  map,
  Observable,
  Subscription,
  switchMap,
  take,
  tap,
} from 'rxjs';
import { CoordinacionService } from '../../../../core/services/coordinacion.service';
import { RutasService, SalidaViaje } from '../../../../core/services/rutas.service';
import { ViajeRespuesta } from '../../../../core/models/coordinacion.models';
import { fechaValida } from '../../../../core/models/perfil.models';
import { ReportesStatePanel } from '../../../reportes/shared/reportes-state-panel/reportes-state-panel';
import { ConfirmarImpactoDialog } from '../../rutas/confirmar-impacto-dialog/confirmar-impacto-dialog';
import {
  anticipacionSalida,
  HorarioConsultado,
  horarioTexto,
  HORA_SALIDA,
  mismaRevision,
  mismoHorario,
  reprogramacionError,
  salidaValida,
} from './reprogramar-viaje.models';

@Component({
  selector: 'app-reprogramar-viaje',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    ReportesStatePanel,
  ],
  templateUrl: './reprogramar-viaje.html',
  styleUrl: './reprogramar-viaje.css',
})
export class ReprogramarViaje {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(CoordinacionService);
  private readonly rutas = inject(RutasService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private request?: Subscription;
  private dialogRef?: MatDialogRef<ConfirmarImpactoDialog, boolean>;
  readonly id = signal<number | null>(null);
  readonly actual = signal<HorarioConsultado | null>(null);
  readonly estado = signal<'cargando' | 'listo' | 'error' | 'inexistente'>('cargando');
  readonly ocupado = signal(false);
  readonly errorCarga = signal('');
  readonly errorGuardado = signal('');
  readonly aviso = signal('');
  readonly exito = signal('');
  readonly horarioTexto = horarioTexto;
  readonly form = new FormGroup(
    {
      fecha: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, fechaValida],
      }),
      hora: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.pattern(HORA_SALIDA)],
      }),
    },
    { validators: anticipacionSalida },
  );
  private readonly valorForm = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });
  readonly sinCambios = computed(() => {
    const valor = this.valorForm();
    const actual = this.actual();
    return (
      !!actual &&
      mismoHorario({ fecha: valor.fecha ?? '', hora: valor.hora ?? '' }, actual.datos.viaje)
    );
  });
  readonly editable = computed(
    () => this.estado() === 'listo' && this.actual()?.datos.viaje.estado === 'PROGRAMADO',
  );

  constructor() {
    this.form.disable({ emitEvent: false });
    this.destroyRef.onDestroy(() => {
      this.dialogRef?.close(false);
    });
    this.route.paramMap
      .pipe(
        map((p) => p.get('id')),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((raw) => {
        this.request?.unsubscribe();
        this.dialogRef?.close(false);
        this.actual.set(null);
        this.aviso.set('');
        this.exito.set('');
        this.errorGuardado.set('');
        this.ocupado.set(false);
        this.form.reset({ fecha: '', hora: '' });
        this.form.disable({ emitEvent: false });
        const id = raw && /^\d+$/.test(raw) ? Number(raw) : NaN;
        this.id.set(Number.isSafeInteger(id) && id > 0 ? id : null);
        if (this.id() === null) {
          this.estado.set('inexistente');
          this.errorCarga.set('El identificador del viaje no es válido.');
        } else this.cargar(false);
      });
  }
  private leer(id: number): Observable<HorarioConsultado> {
    return forkJoin({
      datos: this.api.viaje(id),
      solicitudes: this.api.solicitudes(id, 'ACEPTADA', 0, 1),
    }).pipe(
      map(({ datos, solicitudes }) => {
        if (
          datos.viaje.id !== id ||
          !salidaValida(datos.viaje) ||
          !Number.isSafeInteger(solicitudes.totalElements) ||
          solicitudes.totalElements < 0
        )
          throw new Error('Respuesta de consulta inválida');
        return { datos, aceptados: solicitudes.totalElements };
      }),
    );
  }
  private aplicar(actual: HorarioConsultado, conservar: boolean) {
    this.actual.set(actual);
    this.estado.set('listo');
    this.errorCarga.set('');
    if (!conservar)
      this.form.reset({ fecha: actual.datos.viaje.fecha, hora: actual.datos.viaje.hora });
  }
  private habilitar() {
    if (this.destroyRef.destroyed) return;
    if (this.editable()) this.form.enable({ emitEvent: false });
    else this.form.disable({ emitEvent: false });
  }
  cargar(conservar = true): void {
    const id = this.id();
    if (!id || this.ocupado()) return;
    this.request?.unsubscribe();
    this.estado.set('cargando');
    this.errorCarga.set('');
    this.form.disable({ emitEvent: false });
    this.request = this.leer(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.habilitar()),
      )
      .subscribe({
        next: (actual) => this.aplicar(actual, conservar && !!this.actual()),
        error: (error) => {
          this.estado.set(
            error instanceof HttpErrorResponse && error.status === 404 ? 'inexistente' : 'error',
          );
          this.errorCarga.set(reprogramacionError(error));
        },
      });
  }
  guardar(): void {
    if (this.ocupado() || !this.editable()) return;
    this.form.updateValueAndValidity();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.sinCambios()) {
      this.aviso.set('No hay cambios de fecha ni hora que guardar.');
      return;
    }
    const anterior = this.actual()!;
    const nueva = this.form.getRawValue();
    const id = anterior.datos.viaje.id;
    this.ocupado.set(true);
    this.form.disable({ emitEvent: false });
    this.errorGuardado.set('');
    this.exito.set('');
    this.aviso.set('');
    this.request = this.leer(id)
      .pipe(
        switchMap((actual) => {
          if (!mismaRevision(anterior, actual)) {
            this.cambioConcurrente(actual);
            return EMPTY;
          }
          if (actual.aceptados === 0) return this.enviar(actual, nueva, false);
          return this.confirmar(actual, nueva).pipe(
            switchMap((confirmado) =>
              confirmado
                ? this.leer(id).pipe(
                    switchMap((ultima) => {
                      if (!mismaRevision(actual, ultima)) {
                        this.cambioConcurrente(ultima);
                        return EMPTY;
                      }
                      return this.enviar(ultima, nueva, true);
                    }),
                  )
                : EMPTY,
            ),
          );
        }),
        catchError((error) => this.fallo(error, id)),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.ocupado.set(false);
          this.habilitar();
        }),
      )
      .subscribe();
  }
  private cambioConcurrente(actual: HorarioConsultado) {
    this.aplicar(actual, true);
    this.aviso.set(
      'El viaje o sus pasajeros cambiaron desde la última consulta. Conservamos tu selección. Revisa el horario actualizado y vuelve a guardar para confirmar de nuevo.',
    );
  }
  private confirmar(
    actual: HorarioConsultado,
    nueva: SalidaViaje,
  ): Observable<boolean | undefined> {
    this.dialogRef = this.dialog.open(ConfirmarImpactoDialog, {
      data: {
        origen: actual.datos.origen,
        destino: actual.datos.destino,
        salidaAnterior: horarioTexto(actual.datos.viaje),
        salidaNueva: horarioTexto(nueva),
        pasajerosAceptados: actual.aceptados,
        pierdeConfirmacion: actual.datos.viaje.confirmado,
      },
      width: '34rem',
      maxWidth: 'calc(100vw - 32px)',
    });
    return this.dialogRef.afterClosed().pipe(take(1));
  }
  private enviar(
    actual: HorarioConsultado,
    nueva: SalidaViaje,
    confirmarImpacto: boolean,
  ): Observable<HorarioConsultado> {
    // The time spent in the dialog can invalidate a previously valid 12-hour interval.
    if (anticipacionSalida(this.form)) {
      this.aviso.set(
        'La salida debe seguir teniendo al menos 12 horas de anticipación. Revisa tu selección.',
      );
      return EMPTY;
    }
    return this.rutas.actualizarHorario(actual.datos.viaje.id, nueva, confirmarImpacto).pipe(
      tap((viaje: ViajeRespuesta) => {
        if (
          !mismoHorario(viaje, nueva) ||
          viaje.rutaId !== actual.datos.viaje.rutaId ||
          viaje.estado !== 'PROGRAMADO' ||
          viaje.confirmado !== false ||
          viaje.fechaConfirmacion !== null
        )
          throw new Error('No se pudo confirmar el nuevo horario');
        this.aplicar({ ...actual, datos: { ...actual.datos, viaje } }, false);
        this.exito.set(
          'Horario actualizado correctamente. Revisa su estado y confirmación desde Gestionar viaje.',
        );
      }),
      switchMap(() =>
        this.leer(actual.datos.viaje.id).pipe(
          tap((ultima) => this.aplicar(ultima, false)),
          catchError((error) => {
            this.estado.set('error');
            this.errorCarga.set(reprogramacionError(error));
            return EMPTY;
          }),
        ),
      ),
    );
  }
  private fallo(error: unknown, id: number): Observable<never> {
    this.errorGuardado.set(reprogramacionError(error));
    if (error instanceof HttpErrorResponse && error.status === 404) this.estado.set('inexistente');
    if (!(error instanceof HttpErrorResponse) || error.status !== 409) return EMPTY;
    // A 409 is never permission to replay the write: refresh and require another explicit Save.
    return this.leer(id).pipe(
      tap((actual) => this.aplicar(actual, true)),
      switchMap(() => EMPTY),
      catchError((error) => {
        this.estado.set('error');
        this.errorCarga.set(reprogramacionError(error));
        return EMPTY;
      }),
    );
  }
}
