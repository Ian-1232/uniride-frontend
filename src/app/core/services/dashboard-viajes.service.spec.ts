import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DashboardViajesService } from './dashboard-viajes.service';
import {
  paginaDashboard,
  RUTA_DASHBOARD,
  SOLICITUD_DASHBOARD,
  VIAJE_DASHBOARD,
} from '../../testing/dashboard-fixtures';

describe('Dashboard read composition over existing REST services', () => {
  let http: HttpTestingController;
  let service: DashboardViajesService;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(DashboardViajesService);
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2027-01-01T00:00:00-05:00'));
  });
  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });
  function aceptadas() {
    const r = http.expectOne('/api/solicitudes/resumen?page=0&size=100&estado=ACEPTADA');
    expect(r.request.method).toBe('GET');
    return r;
  }
  it('reads all accepted pages and selects the closest future local departure, not the newest request', () => {
    const next = vi.fn();
    service.proximaSolicitud().subscribe(next);
    aceptadas().flush({
      solicitudes: paginaDashboard([{ ...SOLICITUD_DASHBOARD, id: 501, hora: '20:00' }], 0, 2, 2),
      mensaje: null,
    });
    http
      .expectOne('/api/solicitudes/resumen?page=1&size=100&estado=ACEPTADA')
      .flush({ solicitudes: paginaDashboard([SOLICITUD_DASHBOARD], 1, 2, 2), mensaje: null });
    http
      .expectOne('/api/solicitudes/historial?page=0&size=100')
      .flush({ solicitudes: paginaDashboard([]), mensaje: null });
    expect(next.mock.calls[0][0].proxima).toMatchObject({
      solicitud: SOLICITUD_DASHBOARD,
      consulta: { page: 1, size: 100, estado: 'ACEPTADA' },
    });
    http.expectNone((r) => r.method !== 'GET');
  });
  it('excludes future accepted requests belonging to an expired trip found in a later history page', () => {
    const next = vi.fn();
    service.proximaSolicitud().subscribe(next);
    aceptadas().flush({
      solicitudes: paginaDashboard([
        SOLICITUD_DASHBOARD,
        { ...SOLICITUD_DASHBOARD, id: 309, viajeId: 75, hora: '12:00' },
      ]),
      mensaje: null,
    });
    http
      .expectOne('/api/solicitudes/historial?page=0&size=100')
      .flush({ solicitudes: paginaDashboard([], 0, 1, 2), mensaje: null });
    http
      .expectOne('/api/solicitudes/historial?page=1&size=100')
      .flush({
        solicitudes: paginaDashboard(
          [
            {
              solicitud: SOLICITUD_DASHBOARD,
              estadoViaje: 'VENCIDO',
              soloLectura: true,
              penalidades: [],
            },
          ],
          1,
          1,
          2,
        ),
        mensaje: null,
      });
    expect(next.mock.calls[0][0].proxima.solicitud.viajeId).toBe(75);
  });
  it('does not fetch the full history when there is no eligible accepted departure', () => {
    const next = vi.fn();
    service.proximaSolicitud().subscribe(next);
    aceptadas().flush({
      solicitudes: paginaDashboard([
        { ...SOLICITUD_DASHBOARD, fecha: '2026-12-31' },
        { ...SOLICITUD_DASHBOARD, id: 309, fecha: '2027-02-30' },
        { ...SOLICITUD_DASHBOARD, id: 310, estado: 'RECHAZADA' },
      ]),
      mensaje: null,
    });
    expect(next).toHaveBeenCalledWith({ proxima: null, incompletos: 1 });
    http.expectNone((r) => r.url.includes('historial'));
  });
  it('rejects a changing pagination snapshot without showing a falsely complete next trip', () => {
    const error = vi.fn();
    service.proximaSolicitud().subscribe({ error });
    aceptadas().flush({
      solicitudes: paginaDashboard([SOLICITUD_DASHBOARD], 0, 2, 2),
      mensaje: null,
    });
    http
      .expectOne('/api/solicitudes/resumen?page=1&size=100&estado=ACEPTADA')
      .flush({ solicitudes: paginaDashboard([], 1, 1, 1), mensaje: null });
    expect(error).toHaveBeenCalled();
    http.expectNone((r) => r.url.includes('historial'));
  });
  it('does not show an accepted trip as current if the terminal-state history lookup fails', () => {
    const error = vi.fn();
    const next = vi.fn();
    service.proximaSolicitud().subscribe({ error, next });
    aceptadas().flush({ solicitudes: paginaDashboard([SOLICITUD_DASHBOARD]), mensaje: null });
    http
      .expectOne('/api/solicitudes/historial?page=0&size=100')
      .flush({}, { status: 500, statusText: 'Failure' });
    expect(error).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
  it('returns an empty driver collection without inventing a route or trip', () => {
    const next = vi.fn();
    service.viajesConductor().subscribe(next);
    http.expectOne('/api/rutas?page=0&size=100').flush(paginaDashboard([]));
    expect(next).toHaveBeenCalledWith([]);
    http.expectNone((r) => r.url.includes('/viajes'));
  });
  it('traverses real route/trip pages with at most two route requests in flight', () => {
    const next = vi.fn();
    service.viajesConductor().subscribe(next);
    http.expectOne('/api/rutas?page=0&size=100').flush(paginaDashboard([RUTA_DASHBOARD], 0, 3, 2));
    http.expectOne('/api/rutas?page=1&size=100').flush(
      paginaDashboard(
        [
          { ...RUTA_DASHBOARD, id: 87 },
          { ...RUTA_DASHBOARD, id: 88 },
        ],
        1,
        3,
        2,
      ),
    );
    const first = http.expectOne('/api/rutas/86/viajes?page=0&size=100');
    const second = http.expectOne('/api/rutas/87/viajes?page=0&size=100');
    http.expectNone('/api/rutas/88/viajes?page=0&size=100');
    first.flush(paginaDashboard([VIAJE_DASHBOARD], 0, 2, 2));
    http
      .expectOne('/api/rutas/86/viajes?page=1&size=100')
      .flush(paginaDashboard([{ ...VIAJE_DASHBOARD, id: 792 }], 1, 2, 2));
    http.expectOne('/api/rutas/88/viajes?page=0&size=100').flush(paginaDashboard([]));
    second.flush(paginaDashboard([]));
    expect(next.mock.calls[0][0].map((v: { id: number }) => v.id)).toEqual([791, 792]);
  });
  it('cancels in-flight route requests and does not start queued routes on unsubscribe', () => {
    const sub = service.viajesConductor().subscribe();
    http
      .expectOne('/api/rutas?page=0&size=100')
      .flush(
        paginaDashboard([
          RUTA_DASHBOARD,
          { ...RUTA_DASHBOARD, id: 87 },
          { ...RUTA_DASHBOARD, id: 88 },
        ]),
      );
    const first = http.expectOne('/api/rutas/86/viajes?page=0&size=100');
    const second = http.expectOne('/api/rutas/87/viajes?page=0&size=100');
    sub.unsubscribe();
    expect(first.cancelled && second.cancelled).toBe(true);
    http.expectNone('/api/rutas/88/viajes?page=0&size=100');
  });
});
