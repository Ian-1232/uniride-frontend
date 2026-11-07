import { Component, inject, input } from '@angular/core';
import { map } from 'rxjs';
import { RouterLink } from '@angular/router';
import { RoleType } from '../../../core/models/auth.models';
import { ReportesService } from '../../../core/services/reportes.service';
import { reportQuery } from '../../reportes/shared/report-query';
import { ReportesStatePanel } from '../../reportes/shared/reportes-state-panel/reportes-state-panel';
import { exigirConteos } from '../../../core/models/dashboard.models';

@Component({
  selector: 'app-dashboard-metricas',
  imports: [RouterLink, ReportesStatePanel],
  templateUrl: './dashboard-metricas.html',
  styleUrl: '../dashboard.css',
})
export class DashboardMetricas {
  readonly rol = input.required<RoleType>();
  private readonly service = inject(ReportesService);
  readonly consulta = reportQuery(() =>
    this.service.resumen().pipe(
      map((r) => {
        exigirConteos([
          r.viajesComoConductor,
          r.viajesComoPasajero,
          r.viajesCancelados,
          r.penalidadesAcumuladas,
        ]);
        return r;
      }),
    ),
  );
}
