import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { RoleType } from '../core/models/auth.models';
import { Ruta, Viaje } from '../core/models/ruta.models';
import { EstadisticasRespuesta, AnalisisSemanalRespuesta } from '../core/models/reportes.models';
import { solicitudFixture } from '../pages/pasajero/viajes/viajes.testing';

/** Test-only resources for dashboards and regression tests that navigate into them. */
export const ESTADISTICAS_DASHBOARD: EstadisticasRespuesta = {
  viajesComoConductor: 17,
  viajesComoPasajero: 8,
  viajesCancelados: 3,
  penalidadesAcumuladas: 2,
};
export const SEMANA_DASHBOARD: AnalisisSemanalRespuesta = {
  suficientesDatos: true,
  mensaje: null,
  viajesPorDia: ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'].map(
    (dia, i) => ({ dia, cantidad: [1, 7, 2, 4, 0, 3, 5][i] }),
  ),
  canceladosPorMi: 2,
  canceladosPorTerceros: 1,
};
export const RUTA_DASHBOARD: Ruta = {
  id: 86,
  origen: 'Origen de prueba',
  destino: 'Destino de prueba',
  capacidadMaxima: 6,
  puntosReferencia: 'Referencia de prueba',
  notaContribucion: null,
  estado: 'ACTIVA',
};
export const VIAJE_DASHBOARD: Viaje = {
  id: 791,
  rutaId: 86,
  fecha: '2027-01-01',
  hora: '09:00:30',
  estado: 'PROGRAMADO',
  confirmado: false,
  pasajeros: 2,
};
export const SOLICITUD_DASHBOARD = {
  ...solicitudFixture,
  estado: 'ACEPTADA' as const,
  hora: '09:00:30',
};
export function paginaDashboard<T>(
  content: readonly T[],
  number = 0,
  totalElements = content.length,
  totalPages = totalElements ? 1 : 0,
) {
  return { content, number, totalElements, totalPages, size: 100 };
}
export function loginDashboard(auth: AuthService, http: HttpTestingController, rol: RoleType) {
  const token =
    'eyJhbGciOiJIUzI1NiJ9.' +
    btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })) +
    '.signature';
  auth.login({ correo: 'dashboard@upc.edu.pe', contrasena: 'Password1!' }).subscribe();
  http.expectOne('/api/auth/login').flush({
    token,
    mensaje: 'OK',
    usuario: {
      id: 7,
      nombre: 'Usuario',
      correo: 'dashboard@upc.edu.pe',
      rol,
      cuentaVerificada: true,
    },
  });
  return token;
}

/** Only empties the known dashboard reads in tests whose subject is another module.
 * The dashboard specs instead assert and flush every request explicitly.
 */
export function resolverDashboardVacio(http: HttpTestingController): void {
  const dashboardActivo = /^\/(conductor|pasajero)\/dashboard(?:[?#]|$)/.test(
    TestBed.inject(Router).url,
  );
  const responses: Record<string, object> = {
    '/api/rutas': paginaDashboard([]),
    '/api/solicitudes/resumen': { solicitudes: paginaDashboard([]), mensaje: null },
    '/api/viajes/buscar/resumen': { viajes: paginaDashboard([]), mensaje: null, sugerencia: null },
    '/api/estadisticas': {
      viajesComoConductor: 0,
      viajesComoPasajero: 0,
      viajesCancelados: 0,
      penalidadesAcumuladas: 0,
    },
    '/api/estadisticas/semana': {
      suficientesDatos: false,
      mensaje: 'Sin datos de prueba',
      viajesPorDia: [],
      canceladosPorMi: 0,
      canceladosPorTerceros: 0,
    },
    '/api/estadisticas/rutas': {
      suficientesDatos: false,
      mensaje: 'Sin datos de prueba',
      ranking: [],
    },
    '/api/metodos-compensacion': [],
  };
  for (const r of http.match((r) => r.method === 'GET' && Object.hasOwn(responses, r.url))) {
    if (r.cancelled) continue;
    if (!dashboardActivo)
      throw new Error('Lectura pendiente ajena a un dashboard activo: ' + r.request.url);
    r.flush(responses[r.request.url]);
  }
}
