import { Component, computed, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { ReportesService } from '../../../core/services/reportes.service';
import { WeeklyTripCount } from '../reportes.models';
import { reportQuery } from '../shared/report-query';
import { ReportesStatePanel } from '../shared/reportes-state-panel/reportes-state-panel';

@Component({
  selector: 'app-frecuencia-semanal',
  imports: [MatCardModule, ReportesStatePanel],
  templateUrl: './frecuencia-semanal.html',
  styleUrl: './frecuencia-semanal.css',
})
export class FrecuenciaSemanal {
  private readonly service = inject(ReportesService);
  protected readonly report = reportQuery(() => this.service.semana());
  protected readonly data = computed(() => this.report.state().data);
  protected readonly trips = computed<readonly WeeklyTripCount[]>(() => {
    const data = this.data();
    if (!data?.suficientesDatos) return [];
    return data.viajesPorDia.map(day => ({
      day: day.dia.replace('Miercoles', 'Miércoles').replace('Sabado', 'Sábado'),
      shortDay: day.dia.startsWith('Mi') ? 'X' : day.dia[0],
      count: day.cantidad,
    }));
  });
  protected readonly totalTrips = computed(() => this.trips().reduce((sum, day) => sum + day.count, 0));
  protected readonly scaleMax = computed(() => {
    const max = Math.max(0, ...this.trips().map(day => day.count));
    return Math.max(1, Math.ceil(max / 5)) * 5;
  });
  protected readonly scale = computed(() => Array.from({ length: 6 }, (_, index) => this.scaleMax() * (5 - index) / 5));
}
