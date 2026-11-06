import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AnalisisSemanalRespuesta, EstadisticasRespuesta, RankingRutasRespuesta } from '../../pages/reportes/reportes.models';

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/estadisticas`;

  resumen() { return this.http.get<EstadisticasRespuesta>(this.url); }
  semana() { return this.http.get<AnalisisSemanalRespuesta>(`${this.url}/semana`); }
  rutas() { return this.http.get<RankingRutasRespuesta>(`${this.url}/rutas`); }
}
