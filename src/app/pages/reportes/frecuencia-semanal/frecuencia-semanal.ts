import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FrequencyViewState,
  resolveViewState,
  WEEKLY_TRIPS,
} from '../reportes.models';
import { ReportesStatePanel } from '../shared/reportes-state-panel/reportes-state-panel';

const FREQUENCY_STATES: readonly FrequencyViewState[] = [
  'disponible',
  'insuficiente',
  'cancelaciones',
  'cargando',
  'error',
];

@Component({
  selector: 'app-frecuencia-semanal',
  imports: [MatCardModule, ReportesStatePanel],
  templateUrl: './frecuencia-semanal.html',
  styleUrl: './frecuencia-semanal.css',
})
export class FrecuenciaSemanal {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly trips = WEEKLY_TRIPS;
  protected readonly scale = [5, 4, 3, 2, 1, 0] as const;
  protected readonly totalTrips = WEEKLY_TRIPS.reduce((total, day) => total + day.count, 0);
  protected readonly state = computed(() =>
    resolveViewState(this.queryParams().get('estado'), FREQUENCY_STATES, 'disponible'),
  );
  protected readonly showChart = computed(
    () => this.state() === 'disponible' || this.state() === 'cancelaciones',
  );

  protected restoreDefaultState(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { estado: null },
      queryParamsHandling: 'merge',
    });
  }
}
