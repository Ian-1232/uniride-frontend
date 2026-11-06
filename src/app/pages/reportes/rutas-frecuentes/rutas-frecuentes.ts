import { Component, computed, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { ReportesService } from '../../../core/services/reportes.service';
import { FrequentRoute } from '../reportes.models';
import { reportQuery } from '../shared/report-query';
import { ReportesStatePanel } from '../shared/reportes-state-panel/reportes-state-panel';

@Component({
  selector: 'app-rutas-frecuentes',
  imports: [MatCardModule, ReportesStatePanel],
  templateUrl: './rutas-frecuentes.html',
  styleUrl: './rutas-frecuentes.css',
})
export class RutasFrecuentes {
  private readonly service = inject(ReportesService);
  protected readonly report = reportQuery(() => this.service.rutas());
  protected readonly data = computed(() => this.report.state().data);
  protected readonly routes = computed<readonly FrequentRoute[]>(() => {
    const data = this.data();
    if (!data?.suficientesDatos) return [];
    return [...data.ranking].sort((a, b) => b.cantidad - a.cantidad).map((route, index) => ({
      position: index + 1,
      origin: route.origen,
      destination: route.destino,
      completedTrips: route.cantidad,
      penalties: route.penalidades,
    }));
  });
}
