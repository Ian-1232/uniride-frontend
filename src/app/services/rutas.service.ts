import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
  CrearRutaRequest,
  CrearViajeRequest,
  EstadoRuta,
  Pagina,
  Ruta,
  Viaje,
} from '../models/ruta.model';
import { API_BASE_URL } from './api';

export { mensajeError } from './api';

@Injectable({ providedIn: 'root' })
export class RutasService {
  private readonly http = inject(HttpClient);

  listarRutas(page = 0, size = 10, estado?: EstadoRuta): Observable<Pagina<Ruta>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (estado) {
      params = params.set('estado', estado);
    }
    return this.http.get<Pagina<Ruta>>(`${API_BASE_URL}/rutas`, { params });
  }

  obtenerRuta(id: number): Observable<Ruta> {
    return this.listarRutas(0, 100).pipe(
      map((pagina) => {
        const ruta = pagina.content.find((item) => item.id === id);
        if (!ruta) {
          throw new Error('La ruta no existe o no te pertenece.');
        }
        return ruta;
      }),
    );
  }

  crearRuta(cuerpo: CrearRutaRequest): Observable<Ruta> {
    return this.http.post<Ruta>(`${API_BASE_URL}/rutas`, cuerpo);
  }

  actualizarRuta(id: number, cuerpo: CrearRutaRequest): Observable<Ruta> {
    return this.http.put<Ruta>(`${API_BASE_URL}/rutas/${id}`, cuerpo);
  }

  eliminarRuta(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/rutas/${id}`);
  }

  listarViajes(rutaId: number, page = 0, size = 10): Observable<Pagina<Viaje>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Pagina<Viaje>>(`${API_BASE_URL}/rutas/${rutaId}/viajes`, { params });
  }

  crearViaje(rutaId: number, cuerpo: CrearViajeRequest): Observable<Viaje> {
    return this.http.post<Viaje>(`${API_BASE_URL}/rutas/${rutaId}/viajes`, cuerpo);
  }
}
