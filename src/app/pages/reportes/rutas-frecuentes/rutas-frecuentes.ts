import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FREQUENT_ROUTES,
  resolveViewState,
  RoutesViewState,
} from '../reportes.models';
import { ReportesStatePanel } from '../shared/reportes-state-panel/reportes-state-panel';

const ROUTES_STATES: readonly RoutesViewState[] = [
  'disponible',
  'insuficiente',
  'restringido',
  'penalidades',
  'error',
];

@Component({
  selector: 'app-rutas-frecuentes',
  imports: [MatCardModule, ReportesStatePanel],
  templateUrl: './rutas-frecuentes.html',
  styleUrl: './rutas-frecuentes.css',
})
export class RutasFrecuentes {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly routes = FREQUENT_ROUTES;
  protected readonly state = computed(() =>
    resolveViewState(this.queryParams().get('estado'), ROUTES_STATES, 'disponible'),
  );
  protected readonly showRanking = computed(
    () => this.state() === 'disponible' || this.state() === 'penalidades',
  );

  protected restoreDefaultState(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { estado: null },
      queryParamsHandling: 'merge',
    });
  }
}
