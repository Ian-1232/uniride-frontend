import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { map, switchMap, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Page } from '../models/ruta.model';
import {
  CoordinacionViaje,
  DetalleSolicitud,
  DetalleSolicitudRespuesta,
  EstadoSolicitud,
  SolicitudRecibida,
  ViajeRespuesta,
} from '../models/coordinacion.models';
import { RutasService } from './rutas.service';
import { todasLasPaginas } from './consulta';

@Injectable({ providedIn: 'root' })
export class CoordinacionService {
  private readonly http = inject(HttpClient);
  private readonly rutas = inject(RutasService);
  private readonly url = environment.apiUrl;

  viaje(id: number) {
    // ponytail: se recorren los viajes propios porque la API no ofrece GET por ID;
    // sustituir por esa consulta si se añade para reducir peticiones en cuentas grandes.
    return this.rutas.viajesPropios().pipe(
      map((viajes) => {
        const encontrado = viajes.find((viaje) => viaje.id === id);
        if (!encontrado) throw new HttpErrorResponse({ status: 404 });
        const { ruta, ...viaje } = encontrado;
        return {
          viaje: viaje as ViajeRespuesta,
          origen: ruta.origen,
          destino: ruta.destino,
          puntosReferencia: ruta.puntosReferencia,
          notaContribucion: ruta.notaContribucion ?? null,
          capacidadMaxima: ruta.capacidadMaxima,
          cuposDisponibles: Math.max(0, ruta.capacidadMaxima - (viaje.pasajeros ?? 0)),
        } satisfies CoordinacionViaje;
      }),
      timeout(15000),
    );
  }

  solicitudes(viajeId: number, estado: EstadoSolicitud | '' = '', page = 0, size = 10) {
    const params: Record<string, string | number> = { page, size };
    if (estado) params['estado'] = estado;
    return this.http
      .get<Page<SolicitudRecibida>>(`${this.url}/viajes/${viajeId}/solicitudes`, { params })
      .pipe(timeout(15000));
  }

  detalleSolicitud(id: number) {
    return this.http
      .get<DetalleSolicitudRespuesta>(`${this.url}/solicitudes/recibidas/${id}/detalle`)
      .pipe(
        switchMap((detalle) =>
          todasLasPaginas((pagina) => this.solicitudes(detalle.viajeId, '', pagina, 100)).pipe(
            map((solicitudes) => {
              const solicitud = solicitudes.find((item) => item.id === id);
              if (!solicitud) throw new HttpErrorResponse({ status: 404 });
              return {
                ...detalle,
                estado: solicitud.estado,
                mensajeSolicitud: solicitud.mensaje,
                preferenciaCompensacion: solicitud.preferenciaCompensacion,
                motivoRechazo: solicitud.motivoRechazo,
                acuerdoTerminos: solicitud.acuerdoTerminos,
                acuerdoEstado: solicitud.acuerdoEstado,
              } satisfies DetalleSolicitud;
            }),
          ),
        ),
        timeout(15000),
      );
  }

  aceptar(id: number) {
    return this.http
      .put<SolicitudRecibida>(`${this.url}/solicitudes/${id}/aceptar`, {})
      .pipe(timeout(15000));
  }

  rechazar(ids: number[], motivo: string) {
    const body = { motivo: motivo.trim() || null };
    return ids.length === 1
      ? this.http
          .put<unknown>(`${this.url}/solicitudes/${ids[0]}/rechazar`, body)
          .pipe(timeout(15000))
      : this.http
          .put<unknown>(`${this.url}/solicitudes/rechazar-multiples`, { ...body, ids })
          .pipe(timeout(15000));
  }

  cambiarViaje(id: number, accion: 'confirmar' | 'iniciar' | 'completar' | 'cancelar') {
    return this.http
      .put<ViajeRespuesta>(`${this.url}/viajes/${id}/${accion}`, {})
      .pipe(timeout(15000));
  }
}
