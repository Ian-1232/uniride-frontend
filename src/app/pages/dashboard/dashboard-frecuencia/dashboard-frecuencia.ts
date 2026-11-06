import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { ReportesService } from '../../../core/services/reportes.service';
import { reportQuery } from '../../reportes/shared/report-query';
import { ReportesStatePanel } from '../../reportes/shared/reportes-state-panel/reportes-state-panel';
import { exigirConteos } from '../dashboard.models';

@Component({
  selector: 'app-dashboard-frecuencia',
  imports: [RouterLink, ReportesStatePanel],
  templateUrl: './dashboard-frecuencia.html',
  styleUrl: '../dashboard.css',
})
export class DashboardFrecuencia {
  private readonly service = inject(ReportesService);
  readonly consulta = reportQuery(() =>
    this.service.semana().pipe(
      map((r) => {
        exigirConteos([
          r.canceladosPorMi,
          r.canceladosPorTerceros,
          ...r.viajesPorDia.map((d) => d.cantidad),
        ]);
        return r;
      }),
    ),
  );
  readonly dias = computed(() =>
    this.consulta.state().data?.suficientesDatos
      ? this.consulta.state().data!.viajesPorDia.map((d) => ({
          ...d,
          etiqueta: d.dia.replace('Miercoles', 'Miércoles').replace('Sabado', 'Sábado'),
        }))
      : [],
  );
  readonly maximo = computed(() => Math.max(1, ...this.dias().map((d) => d.cantidad)));
  readonly total = computed(() => this.dias().reduce((n, d) => n + d.cantidad, 0));
}
