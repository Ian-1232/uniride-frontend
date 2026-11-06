import { inject, Injectable } from '@angular/core';
import { defer, from, map, mergeMap, Observable, of, switchMap, toArray } from 'rxjs';
import { Page, ViajeConRuta } from '../models/ruta.model';
import { instanteSalida } from '../models/coordinacion.models';
import { todasLasPaginas } from './consulta';
import { RutasService } from './rutas.service';
import { SolicitudesPasajeroService } from './solicitudes-pasajero.service';
import {
  idReal,
  ProximaSolicitud,
  salidaValida,
  SolicitudDashboard,
} from '../../pages/dashboard/dashboard.models';

/** Reuses the existing traversal with a stable, finite snapshot; never silently truncates a dashboard. */
function paginas<T>(load: (page: number) => Observable<Page<T>>) {
  return defer(() => {
    let total = -1;
    let pages = -1;
    return todasLasPaginas((page) =>
      load(page).pipe(
        map((data) => {
          if (
            !Array.isArray(data.content) ||
            data.number !== page ||
            !Number.isSafeInteger(data.totalPages) ||
            data.totalPages < 0 ||
            !Number.isSafeInteger(data.totalElements) ||
            data.totalElements < 0
          )
            throw new Error('Página inválida');
          if (page === 0) {
            total = data.totalElements;
            pages = data.totalPages;
          }
          if (total !== data.totalElements || pages !== data.totalPages)
            throw new Error('El listado cambió durante la consulta');
          return data;
        }),
      ),
    ).pipe(
      map((rows) => {
        if (rows.length !== total) throw new Error('Listado incompleto');
        return rows;
      }),
    );
  });
}
@Injectable({ providedIn: 'root' })
export class DashboardViajesService {
  private readonly rutas = inject(RutasService);
  private readonly solicitudes = inject(SolicitudesPasajeroService);

  viajesConductor(): Observable<ViajeConRuta[]> {
    // viajesPropios() uses an unbounded forkJoin. Keep dashboard fan-out at two routes.
    return this.rutas.todas().pipe(
      switchMap((rutas) =>
        from(rutas).pipe(
          mergeMap(
            (ruta) =>
              this.rutas
                .todosLosViajes(ruta.id)
                .pipe(map((viajes) => viajes.map((v) => ({ ...v, ruta })))),
            2,
          ),
          toArray(),
          map((groups) => groups.flat()),
        ),
      ),
    );
  }

  proximaSolicitud(): Observable<ProximaSolicitud> {
    return paginas<SolicitudDashboard>((page) =>
      this.solicitudes.listar('ACEPTADA', page, 100).pipe(
        map((r) => ({
          ...r.solicitudes,
          content: r.solicitudes.content.map((solicitud) => ({
            solicitud,
            consulta: {
              historial: false,
              estado: 'ACEPTADA' as const,
              page: r.solicitudes.number,
              size: 100,
            },
          })),
        })),
      ),
    ).pipe(
      switchMap((rows) => {
        const incompletos = rows.filter(
          (r) =>
            !idReal(r.solicitud.viajeId) || !idReal(r.solicitud.id) || !salidaValida(r.solicitud),
        ).length;
        const futuras = rows.filter(
          (r) =>
            idReal(r.solicitud.viajeId) &&
            idReal(r.solicitud.id) &&
            r.solicitud.estado === 'ACEPTADA' &&
            salidaValida(r.solicitud) &&
            instanteSalida(r.solicitud) >= Date.now(),
        );
        if (!futuras.length) return of({ proxima: null, incompletos });
        // An ACEPTADA may belong to a VENCIDO trip. The own history is the available
        // contract exposing trip state; do not infer confirmation from acceptance.
        return paginas((page) =>
          this.solicitudes
            .historial(page, 100)
            .pipe(map((r) => ({ ...r.solicitudes, content: [...r.solicitudes.content] }))),
        ).pipe(
          map((historial) => {
            const terminados = new Set(
              historial
                .filter((r) => ['CANCELADO', 'COMPLETADO', 'VENCIDO'].includes(r.estadoViaje))
                .map((r) => r.solicitud.viajeId),
            );
            const proxima =
              futuras
                .filter(
                  (r) =>
                    !terminados.has(r.solicitud.viajeId) &&
                    instanteSalida(r.solicitud) >= Date.now(),
                )
                .sort(
                  (a, b) =>
                    instanteSalida(a.solicitud) - instanteSalida(b.solicitud) ||
                    a.solicitud.id - b.solicitud.id,
                )[0] ?? null;
            return { proxima, incompletos };
          }),
        );
      }),
    );
  }
}
