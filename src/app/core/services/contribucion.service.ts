import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SugerenciaContribucionRespuesta } from '../models/contribucion.models';

@Injectable({ providedIn: 'root' })
export class ContribucionService {
  private readonly http = inject(HttpClient);

  sugerencia(viajeId: number, pasajeros?: number) {
    const params =
      pasajeros === undefined ? new HttpParams() : new HttpParams().set('pasajeros', pasajeros);
    return this.http
      .get<SugerenciaContribucionRespuesta>(
        `${environment.apiUrl}/viajes/${viajeId}/sugerencia-contribucion`,
        { params },
      )
      .pipe(timeout(15000));
  }
}
