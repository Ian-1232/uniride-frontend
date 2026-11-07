import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { DashboardViajesService } from '../../../core/services/dashboard-viajes.service';
import { ViajesPasajeroService } from '../../../core/services/viajes-pasajero.service';
import { ViajePasajeroContextoService } from '../../../core/services/viaje-pasajero-contexto.service';
import { consultaDashboard } from '../../dashboard/dashboard-query';
import { crearPaginatorIntl } from '../../../core/services/paginator-intl';
import {
  BusquedaRespuesta,
  BusquedaResumenRespuesta,
  desdeBusqueda,
  desdeSolicitud,
} from '../../../core/models/viajes.models';
import { pasajeroQuery } from '../viajes/shared/pasajero-query';
import { ReportesStatePanel } from '../../reportes/shared/reportes-state-panel/reportes-state-panel';
import { DashboardMetricas } from '../../dashboard/dashboard-metricas/dashboard-metricas';
import { DashboardFrecuencia } from '../../dashboard/dashboard-frecuencia/dashboard-frecuencia';
import { DashboardMetodos } from '../../dashboard/dashboard-metodos/dashboard-metodos';
import {
  fechaDashboard,
  horaDashboard,
  idReal,
  salidaValida,
} from '../../../core/models/dashboard.models';

@Component({
  selector: 'app-pasajero-dashboard',
  imports: [
    RouterLink,
    MatButtonModule,
    MatPaginatorModule,
    ReportesStatePanel,
    DashboardMetricas,
    DashboardFrecuencia,
    DashboardMetodos,
  ],
  providers: [{ provide: MatPaginatorIntl, useFactory: () => crearPaginatorIntl('Viajes') }],
  templateUrl: './pasajero-dashboard.html',
  styleUrls: ['../../dashboard/dashboard.css', './pasajero-dashboard.css'],
})
export class PasajeroDashboard {
  private readonly service = inject(DashboardViajesService);
  private readonly busqueda = inject(ViajesPasajeroService);
  private readonly contexto = inject(ViajePasajeroContextoService);
  private readonly router = inject(Router);
  readonly proxima = consultaDashboard(() => this.service.proximaSolicitud());
  readonly disponibles = pasajeroQuery<number, BusquedaResumenRespuesta>((page) =>
    this.busqueda.buscar({}, page, 3),
  );
  readonly fecha = fechaDashboard;
  readonly hora = horaDashboard;
  readonly salidaValida = salidaValida;
  readonly idReal = idReal;
  private paginaActual = 0;
  readonly siguiente = computed(() => this.proxima.state().data?.proxima ?? null);
  constructor() {
    this.disponibles.run(0);
  }
  paginar(event: PageEvent): void {
    this.paginaActual = event.pageIndex;
    this.disponibles.run(this.paginaActual);
  }
  reintentarDisponibles(): void {
    this.disponibles.run(this.paginaActual);
  }
  verDisponible(dto: BusquedaRespuesta): void {
    if (
      !idReal(dto.viajeId) ||
      !salidaValida(dto) ||
      !this.disponibles.state().data?.viajes.content.some((v) => v === dto)
    )
      return;
    this.contexto.seleccionar({ viaje: desdeBusqueda(dto) });
    void this.router.navigate(['/pasajero/viajes', dto.viajeId]);
  }
  verSolicitud(): void {
    const actual = this.siguiente();
    if (!actual) return;
    this.contexto.seleccionar({
      viaje: desdeSolicitud(actual.solicitud),
      solicitud: actual.solicitud,
      consulta: actual.consulta,
    });
    void this.router.navigate(['/pasajero/viajes', actual.solicitud.viajeId]);
  }
}
