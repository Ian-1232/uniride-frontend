import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ACTIVITY_SUMMARY,
  resolveViewState,
  SummaryViewState,
} from '../reportes.models';
import { ReportesStatePanel } from '../shared/reportes-state-panel/reportes-state-panel';

const SUMMARY_STATES: readonly SummaryViewState[] = [
  'disponible',
  'restringido',
  'cargando',
  'error',
  'incidencias',
];

@Component({
  selector: 'app-resumen-actividad',
  imports: [MatCardModule, ReportesStatePanel],
  templateUrl: './resumen-actividad.html',
  styleUrl: './resumen-actividad.css',
})
export class ResumenActividad {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly summary = ACTIVITY_SUMMARY;
  protected readonly state = computed(() =>
    resolveViewState(this.queryParams().get('estado'), SUMMARY_STATES, 'disponible'),
  );
  protected readonly showSummary = computed(
    () => this.state() === 'disponible' || this.state() === 'incidencias',
  );

  protected restoreDefaultState(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { estado: null },
      queryParamsHandling: 'merge',
    });
  }
}
