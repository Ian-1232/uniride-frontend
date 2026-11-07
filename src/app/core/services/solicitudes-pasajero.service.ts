import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  EstadoSolicitud,
  SolicitudRequest,
  SolicitudRespuesta,
  SolicitudesResumenRespuesta,
  SolicitudesHistorialResumenRespuesta,
} from '../models/viajes.models';

@Injectable({ providedIn: 'root' })
export class SolicitudesPasajeroService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/solicitudes`;
  listar(estado?: EstadoSolicitud, page = 0, size = 10) {
    let params = new HttpParams().set('page', page).set('size', size);
    if (estado) params = params.set('estado', estado);
    return this.http
      .get<SolicitudesResumenRespuesta>(`${this.url}/resumen`, { params })
      .pipe(timeout(15000));
  }
  historial(page = 0, size = 10) {
    return this.http
      .get<SolicitudesHistorialResumenRespuesta>(`${this.url}/historial`, {
        params: new HttpParams().set('page', page).set('size', size),
      })
      .pipe(timeout(15000));
  }
  crear(viajeId: number, request: SolicitudRequest) {
    return this.http
      .post<SolicitudRespuesta>(`${this.url}/viajes/${viajeId}`, request)
      .pipe(timeout(15000));
  }
  cancelar(solicitudId: number) {
    return this.http
      .put<SolicitudRespuesta>(`${this.url}/${solicitudId}/cancelar`, {})
      .pipe(timeout(15000));
  }
}
