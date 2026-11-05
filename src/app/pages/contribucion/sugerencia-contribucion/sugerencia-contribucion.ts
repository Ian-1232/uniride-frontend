import { DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router } from '@angular/router';
import {
  integerMinOneValidator,
  resolveContribucionState,
  SUGERENCIA_DOS_PASAJEROS,
  SUGERENCIA_UN_PASAJERO,
  SugerenciaContribucionFixture,
  SugerenciaContribucionState,
} from '../contribucion.models';
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
  ],
  templateUrl: './sugerencia-contribucion.html',
  styleUrl: './sugerencia-contribucion.css',
})
export class SugerenciaContribucion {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly form = new FormGroup<PasajerosForm>({
    pasajeros: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(1),
      integerMinOneValidator,
    ]),
  });
  protected readonly selectedFixture = signal<SugerenciaContribucionFixture | null>(null);
  protected readonly unsupportedPassengerCount = signal(false);
  protected readonly returnNoticeVisible = signal(false);
  protected readonly tripId = computed(() => Number(this.params().get('viajeId')));
  protected readonly state = computed<SugerenciaContribucionState>(() => {
    if (this.tripId() !== 35) {
      return 'no-encontrado';
    }

    return resolveContribucionState(this.queryParams().get('estado'));
  });
  protected readonly result = computed<SugerenciaContribucionFixture | null>(() => {
    const selected = this.selectedFixture();
    if (selected !== null) {
      return selected;
    }

    switch (this.state()) {
      case 'disponible':
      case 'pasajeros-confirmados':
        return SUGERENCIA_DOS_PASAJEROS;
      case 'unico-pasajero':
        return SUGERENCIA_UN_PASAJERO;
      default:
        return null;
    }
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.selectedFixture.set(null);
      this.unsupportedPassengerCount.set(false);
    });

    effect(() => this.applyDemonstrationState(this.state()));
  }

  protected submitDemonstration(): void {
    this.selectedFixture.set(null);
    this.unsupportedPassengerCount.set(false);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const passengers = this.form.controls.pasajeros.value;
    if (passengers === 1) {
      this.selectedFixture.set(SUGERENCIA_UN_PASAJERO);
    } else if (passengers === 2) {
      this.selectedFixture.set(SUGERENCIA_DOS_PASAJEROS);
    } else {
      this.unsupportedPassengerCount.set(true);
    }
  }

  protected showPassengerError(): boolean {
    const control = this.form.controls.pasajeros;
    return control.touched && control.invalid;
  }

  protected retry(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { estado: null },
      queryParamsHandling: 'merge',
    });
  }

  protected showReturnNotice(): void {
    this.returnNoticeVisible.set(true);
  }

  private applyDemonstrationState(state: SugerenciaContribucionState): void {
    this.selectedFixture.set(null);
    this.unsupportedPassengerCount.set(false);
    this.returnNoticeVisible.set(false);
    this.form.reset({ pasajeros: null }, { emitEvent: false });

    if (state === 'insuficiente') {
      this.form.markAllAsTouched();
    }
  }
}
