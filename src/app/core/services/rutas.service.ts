import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { forkJoin, map, Observable, of, switchMap, timeout } from 'rxjs';
import { ViajeRespuesta } from '../models/coordinacion.models';
import { environment } from '../../../environments/environment';
import { Page, Ruta, RutaRequest, Viaje, ViajeConRuta } from '../models/ruta.model';
import { todasLasPaginas } from './consulta';

/** Cuerpo ViajeRequest de POST /rutas/{rutaId}/viajes y PUT /viajes/{id}. */
export interface SalidaViaje {
  fecha: string;
  hora: string;
}

@Injectable({ providedIn: 'root' })
export class RutasService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/rutas`;

  listar(page = 0, size = 100): Observable<Page<Ruta>> {
    return this.http.get<Page<Ruta>>(this.url, { params: { page, size } });
  }

  todas(): Observable<Ruta[]> {
    return todasLasPaginas((pagina) => this.listar(pagina, 100));
  }

  todosLosViajes(rutaId: number): Observable<Viaje[]> {
    return todasLasPaginas((pagina) => this.viajes(rutaId, pagina, 100));
  }

  viajesPropios(): Observable<ViajeConRuta[]> {
    return this.todas().pipe(
      switchMap((rutas) =>
        rutas.length === 0
          ? of([])
          : forkJoin(
              rutas.map((ruta) =>
                this.todosLosViajes(ruta.id).pipe(
                  map((viajes) => viajes.map((viaje) => ({ ...viaje, ruta }))),
                ),
              ),
            ).pipe(map((grupos) => grupos.flat())),
      ),
    );
  }

  /** La API no expone GET /rutas/{id}: se resuelve sobre el listado propio (US09). */
  obtener(id: number): Observable<Ruta> {
    return this.todas().pipe(
      map((rutas) => {
        const ruta = rutas.find((item) => item.id === id);
        if (!ruta) throw new HttpErrorResponse({ status: 404, url: `${this.url}/${id}` });
        return ruta;
      }),
    );
  }

  crear(ruta: RutaRequest): Observable<Ruta> {
    return this.http.post<Ruta>(this.url, ruta);
  }

  actualizar(id: number, ruta: RutaRequest, confirmarImpacto = false): Observable<Ruta> {
    return this.http.put<Ruta>(`${this.url}/${id}`, ruta, { params: { confirmarImpacto } });
  }

  /** El diálogo de la pantalla es el reconocimiento de impacto de US08. */
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`, { params: { confirmar: true } });
  }

  viajes(rutaId: number, page = 0, size = 100): Observable<Page<Viaje>> {
    return this.http.get<Page<Viaje>>(`${this.url}/${rutaId}/viajes`, { params: { page, size } });
  }

  crearViaje(rutaId: number, salida: SalidaViaje): Observable<Viaje> {
    return this.http.post<Viaje>(`${this.url}/${rutaId}/viajes`, salida);
  }

  actualizarHorario(
    viajeId: number,
    salida: SalidaViaje,
    confirmarImpacto = false,
  ): Observable<ViajeRespuesta> {
    return this.http
      .put<ViajeRespuesta>(
        `${environment.apiUrl}/viajes/${viajeId}`,
        {
          fecha: salida.fecha,
          hora: salida.hora,
        },
        { params: { confirmarImpacto }, observe: 'response' },
      )
      .pipe(
        timeout(15000),
        map((response) => {
          if (response.status !== 200 || !response.body || response.body.id !== viajeId)
            throw new Error('No se pudo confirmar la reprogramación');
          return response.body;
        }),
      );
  }
}
