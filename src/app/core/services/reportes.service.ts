import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { HistoryExportFilters, localIsoDate } from '../models/exportar-historial.models';
import { environment } from '../../../environments/environment';
import {
  AnalisisSemanalRespuesta,
  EstadisticasRespuesta,
  RankingRutasRespuesta,
} from '../models/reportes.models';

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/estadisticas`;

  resumen() {
    return this.http.get<EstadisticasRespuesta>(this.url);
  }
  semana() {
    return this.http.get<AnalisisSemanalRespuesta>(`${this.url}/semana`);
  }
  rutas() {
    return this.http.get<RankingRutasRespuesta>(`${this.url}/rutas`);
  }

  exportarHistorial(filters: HistoryExportFilters) {
    let params = new HttpParams().set('tipo', filters.tipo);
    if (filters.desde) params = params.set('desde', localIsoDate(filters.desde));
    if (filters.hasta) params = params.set('hasta', localIsoDate(filters.hasta));
    return this.http.get(`${environment.apiUrl}/historial/pdf`, {
      params,
      responseType: 'blob',
      observe: 'response',
    });
  }
}
