import { Component, computed, effect, inject, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { map } from 'rxjs';
import { DashboardViajesService } from '../../../core/services/dashboard-viajes.service';
import { CoordinacionService } from '../../../core/services/coordinacion.service';
import { ReportesService } from '../../../core/services/reportes.service';
import { consultaDashboard } from '../../dashboard/dashboard-query';
import { pasajeroQuery } from '../../pasajero/viajes/shared/pasajero-query';
import { Page } from '../../../core/models/ruta.model';
import { SolicitudRecibida } from '../../../core/models/coordinacion.models';
import { ReportesStatePanel } from '../../reportes/shared/reportes-state-panel/reportes-state-panel';
import { reportQuery } from '../../reportes/shared/report-query';
import { DashboardMetricas } from '../../dashboard/dashboard-metricas/dashboard-metricas';
import { DashboardFrecuencia } from '../../dashboard/dashboard-frecuencia/dashboard-frecuencia';
import { DashboardMetodos } from '../../dashboard/dashboard-metodos/dashboard-metodos';
import {
  conteoValido,
  exigirConteos,
  fechaDashboard,
  horaDashboard,
  proximoViajeConductor,
} from '../../dashboard/dashboard.models';

@Component({
  selector: 'app-conductor-dashboard',
  imports: [
    RouterLink,
    MatButtonModule,
    ReportesStatePanel,
    DashboardMetricas,
    DashboardFrecuencia,
    DashboardMetodos,
  ],
  templateUrl: './conductor-dashboard.html',
  styleUrls: ['../../dashboard/dashboard.css', './conductor-dashboard.css'],
})
export class ConductorDashboard {
  private readonly service = inject(DashboardViajesService);
  private readonly coordinacion = inject(CoordinacionService);
  private readonly reportes = inject(ReportesService);
  readonly viajes = consultaDashboard(() => this.service.viajesConductor());
  readonly proximo = computed(() => proximoViajeConductor(this.viajes.state().data ?? []));
  readonly solicitudes = pasajeroQuery<number, Page<SolicitudRecibida>>((id) =>
    this.coordinacion.solicitudes(id, 'PENDIENTE', 0, 1).pipe(
      map((r) => {
        exigirConteos([r.totalElements]);
        return r;
      }),
    ),
  );
  readonly ranking = reportQuery(() =>
    this.reportes.rutas().pipe(
      map((r) => {
        r.ranking.forEach((row) => exigirConteos([row.cantidad, row.penalidades]));
        return r;
      }),
    ),
  );
  readonly rutasFrecuentes = computed(() =>
    this.ranking.state().data?.suficientesDatos
      ? [...this.ranking.state().data!.ranking].sort((a, b) => b.cantidad - a.cantidad).slice(0, 3)
      : [],
  );
  readonly fecha = fechaDashboard;
  readonly hora = horaDashboard;
  readonly conteoValido = conteoValido;
  constructor() {
    effect(() => {
      const viaje = this.proximo();
      untracked(() => {
        if (viaje) this.solicitudes.run(viaje.id);
        else this.solicitudes.cancel();
      });
    });
  }
  reintentarSolicitudes(): void {
    const viaje = this.proximo();
    if (viaje) this.solicitudes.run(viaje.id);
  }
}
