import { Component, computed, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { ReportesService } from '../../../core/services/reportes.service';
import { ActivitySummary } from '../../../core/models/reportes.models';
import { reportQuery } from '../shared/report-query';
import { ReportesStatePanel } from '../shared/reportes-state-panel/reportes-state-panel';

@Component({
  selector: 'app-resumen-actividad',
  imports: [MatCardModule, ReportesStatePanel],
  templateUrl: './resumen-actividad.html',
  styleUrl: './resumen-actividad.css',
})
export class ResumenActividad {
  private readonly service = inject(ReportesService);
  protected readonly report = reportQuery(() => this.service.resumen());
  protected readonly summary = computed<ActivitySummary | null>(() => {
    const data = this.report.state().data;
    return data
      ? {
          completedTrips: data.viajesComoConductor + data.viajesComoPasajero,
          driverTrips: data.viajesComoConductor,
          passengerTrips: data.viajesComoPasajero,
          cancelledTrips: data.viajesCancelados,
          penalties: data.penalidadesAcumuladas,
        }
      : null;
  });
}
