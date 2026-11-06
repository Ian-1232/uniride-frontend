import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Page, Ruta, RutaRequest, Viaje } from '../models/ruta.model';

/** Cuerpo de POST /api/rutas/{rutaId}/viajes (`ViajeRequest`). */
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

  /** La API no expone GET /rutas/{id}: se resuelve sobre el listado propio (US09). */
  obtener(id: number): Observable<Ruta> {
    return this.listar().pipe(
      map((pagina) => {
        const ruta = pagina.content.find((item) => item.id === id);
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
}
