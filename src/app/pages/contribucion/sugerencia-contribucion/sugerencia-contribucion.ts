import { HttpErrorResponse } from '@angular/common/http';
import { distinctUntilChanged, map, Subscription } from 'rxjs';
import { ContribucionService } from '../../../core/services/contribucion.service';
import { DecimalPipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  integerMinOneValidator,
  MISSING_PASSENGERS,
  formatContributionDate,
  formatContributionTime,
  SugerenciaContribucionRespuesta,
  SugerenciaContribucionState,
} from '../../../core/models/contribucion.models';
import { ContribucionStatePanel } from '../shared/contribucion-state-panel/contribucion-state-panel';

interface PasajerosForm {
  pasajeros: FormControl<number | null>;
}

@Component({
  selector: 'app-sugerencia-contribucion',
  imports: [
    ContribucionStatePanel,
    DecimalPipe,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './sugerencia-contribucion.html',
  styleUrl: './sugerencia-contribucion.css',
})
export class SugerenciaContribucion {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(ContribucionService);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;
  private lastPassengers?: number;
  protected readonly tripId = signal<number | null>(null);
  protected readonly state = signal<SugerenciaContribucionState>('cargando');
  protected readonly result = signal<SugerenciaContribucionRespuesta | null>(null);
  protected readonly message = signal('');
  protected readonly needsPassengers = signal(false);
  protected readonly confirmedPassengers = signal(false);
  protected readonly form = new FormGroup<PasajerosForm>({
    pasajeros: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(1),
      integerMinOneValidator,
    ]),
  });
  protected readonly formatDate = formatContributionDate;
  protected readonly formatTime = formatContributionTime;
  protected readonly busy = computed(() => this.state() === 'cargando');

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('viajeId')),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((raw) => {
        this.request?.unsubscribe();
        const id = raw !== null && /^\d+$/.test(raw) ? Number(raw) : NaN;
        this.tripId.set(Number.isSafeInteger(id) && id > 0 ? id : null);
        this.needsPassengers.set(false);
        this.confirmedPassengers.set(false);
        this.result.set(null);
        this.form.reset({ pasajeros: null });
        this.lastPassengers = undefined;
        if (this.tripId() === null) {
          this.state.set('no-encontrado');
          return;
        }
        this.load();
      });
  }
  protected submit(): void {
    if (this.busy() || !this.needsPassengers()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.load(this.form.controls.pasajeros.value!);
  }
  protected retry(): void {
    if (!this.busy()) this.load(this.lastPassengers);
  }
  private load(passengers?: number): void {
    const id = this.tripId();
    if (id === null) return;
    this.request?.unsubscribe();
    this.lastPassengers = passengers;
    this.state.set('cargando');
    this.result.set(null);
    this.message.set('');
    this.request = this.service
      .sugerencia(id, passengers)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (
            !response ||
            response.viajeId !== id ||
            !Number.isInteger(response.pasajeros) ||
            response.pasajeros < 1 ||
            ![
              response.origen,
              response.destino,
              response.dia,
              response.fecha,
              response.hora,
              response.nota,
              response.sugerenciaFavor,
            ].every((value) => typeof value === 'string') ||
            typeof response.esHoraPico !== 'boolean' ||
            ![
              response.aporteEstimado,
              response.costoTotalEstimado,
              response.litrosGasolinaAprox,
            ].every((value) => typeof value === 'number' && Number.isFinite(value) && value >= 0)
          ) {
            this.state.set('error');
            this.message.set(
              'El servicio devolvió una respuesta de estimación inválida. Intenta nuevamente.',
            );
            return;
          }
          this.result.set(response);
          this.confirmedPassengers.set(passengers === undefined);
          this.state.set('disponible');
        },
        error: (error: HttpErrorResponse) => {
          if (error.status === 400 && error.error?.mensaje === MISSING_PASSENGERS) {
            this.needsPassengers.set(true);
            this.state.set('insuficiente');
            this.message.set(MISSING_PASSENGERS);
          } else {
            this.state.set(
              error.status === 404
                ? 'no-encontrado'
                : error.status === 409
                  ? 'viaje-no-disponible'
                  : error.status === 401 || error.status === 403
                    ? 'restringido'
                    : 'error',
            );
            this.message.set(
              error.status === 400
                ? 'Revisa la cantidad de pasajeros: debe ser un entero positivo válido para el servicio.'
                : error.status === 401
                  ? 'Tu sesión ya no es válida. Inicia sesión nuevamente.'
                  : error.status === 403
                    ? 'No tienes permiso para consultar esta sugerencia.'
                    : error.status === 404
                      ? 'Viaje no encontrado.'
                      : error.status === 409
                        ? 'El viaje ya no está disponible para calcular una sugerencia.'
                        : error.status === 0
                          ? 'No se pudo conectar con el servicio. Comprueba tu conexión y reintenta.'
                          : 'No se pudo obtener la sugerencia. Intenta nuevamente más tarde.',
            );
          }
        },
      });
  }
  protected showPassengerError(): boolean {
    const control = this.form.controls.pasajeros;
    return control.touched && control.invalid;
  }
}
