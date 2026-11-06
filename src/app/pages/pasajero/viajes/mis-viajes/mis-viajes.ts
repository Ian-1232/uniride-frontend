import { Component, computed, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { SolicitudesPasajeroService } from '../../../../core/services/solicitudes-pasajero.service';
import { ViajePasajeroContextoService } from '../../../../core/services/viaje-pasajero-contexto.service';
import { ReportesStatePanel } from '../../../reportes/shared/reportes-state-panel/reportes-state-panel';
import { ViajeCard } from '../shared/viaje-card/viaje-card';
import { pasajeroQuery } from '../shared/pasajero-query';
import {
  ConsultaSolicitudes,
  desdeSolicitud,
  ESTADOS_SOLICITUD,
  EstadoSolicitud,
  ETIQUETAS_SOLICITUD,
  Pagina,
  SolicitudHistorialRespuesta,
  SolicitudRespuesta,
} from '../viajes.models';
interface Row {
  solicitud: SolicitudRespuesta;
  historico?: SolicitudHistorialRespuesta;
}
interface Result {
  pagina: Pagina<Row>;
  mensaje: string | null;
}
@Component({
  selector: 'app-mis-viajes',
  imports: [
    RouterLink,
    ViajeCard,
    MatFormFieldModule,
    MatSelectModule,
    MatPaginatorModule,
    ReactiveFormsModule,
    ReportesStatePanel,
  ],
  templateUrl: './mis-viajes.html',
  styleUrl: './mis-viajes.css',
})
export class MisViajes {
  private readonly service = inject(SolicitudesPasajeroService);
  private readonly navigation = inject(ViajePasajeroContextoService);
  private readonly router = inject(Router);
  protected readonly estado = new FormControl<EstadoSolicitud | ''>('', { nonNullable: true });
  protected readonly vista = new FormControl<'solicitudes' | 'historial'>('solicitudes', {
    nonNullable: true,
  });
  protected readonly estados = ESTADOS_SOLICITUD;
  protected readonly labels = ETIQUETAS_SOLICITUD;
  protected readonly viajeDe = desdeSolicitud;
  private last: ConsultaSolicitudes = { historial: false, page: 0, size: 10 };
  protected readonly query = pasajeroQuery<ConsultaSolicitudes, Result>((q) =>
    q.historial
      ? this.service
          .historial(q.page, q.size)
          .pipe(
            map((r) => ({
              pagina: {
                ...r.solicitudes,
                content: r.solicitudes.content.map((historico) => ({
                  solicitud: historico.solicitud,
                  historico,
                })),
              },
              mensaje: r.mensaje,
            })),
          )
      : this.service
          .listar(q.estado, q.page, q.size)
          .pipe(
            map((r) => ({
              pagina: {
                ...r.solicitudes,
                content: r.solicitudes.content.map((solicitud) => ({ solicitud })),
              },
              mensaje: r.mensaje,
            })),
          ),
  );
  protected readonly data = computed(() => this.query.state().data);
  constructor() {
    this.load();
    this.estado.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.load());
    this.vista.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.load());
  }
  protected load(page = 0, size = this.last.size): void {
    this.last = {
      historial: this.vista.value === 'historial',
      estado: this.estado.value || undefined,
      page,
      size,
    };
    this.query.run(this.last);
  }
  protected retry(): void {
    this.query.run(this.last);
  }
  protected page(event: PageEvent): void {
    this.load(event.pageIndex, event.pageSize);
  }
  protected rows(estado: EstadoSolicitud) {
    return this.data()?.pagina.content.filter((row) => row.solicitud.estado === estado) ?? [];
  }
  protected verDetalle(row: Row): void {
    this.navigation.seleccionar({
      viaje: desdeSolicitud(row.solicitud, row.historico?.estadoViaje),
      solicitud: row.solicitud,
      historico: row.historico,
      consulta: this.last,
    });
    void this.router.navigate(['/pasajero/viajes', row.solicitud.viajeId]);
  }
}
