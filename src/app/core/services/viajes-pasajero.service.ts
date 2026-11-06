import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BusquedaResumenRespuesta,
  FiltroBusqueda,
} from '../../pages/pasajero/viajes/viajes.models';

@Injectable({ providedIn: 'root' })
export class ViajesPasajeroService {
  private readonly http = inject(HttpClient);
  buscar(filtros: FiltroBusqueda, page = 0, size = 10) {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('cercania', filtros.cercania ?? false);
    for (const key of ['origen', 'destino', 'dia', 'hora'] as const) {
      const value = filtros[key]?.trim();
      if (value) params = params.set(key, value);
    }
    return this.http
      .get<BusquedaResumenRespuesta>(`${environment.apiUrl}/viajes/buscar/resumen`, { params })
      .pipe(timeout(15000));
  }
}
