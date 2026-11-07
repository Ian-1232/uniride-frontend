import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MetodosCompensacionService } from '../../../core/services/metodos-compensacion.service';
import { consultaDashboard } from '../dashboard-query';
import { ETIQUETAS_COMPENSACION } from '../../../core/models/viajes.models';
import { ReportesStatePanel } from '../../reportes/shared/reportes-state-panel/reportes-state-panel';

@Component({
  selector: 'app-dashboard-metodos',
  imports: [RouterLink, ReportesStatePanel],
  templateUrl: './dashboard-metodos.html',
  styleUrl: '../dashboard.css',
})
export class DashboardMetodos {
  private readonly service = inject(MetodosCompensacionService);
  readonly consulta = consultaDashboard(() => this.service.listar());
  readonly etiquetas = ETIQUETAS_COMPENSACION;
}
