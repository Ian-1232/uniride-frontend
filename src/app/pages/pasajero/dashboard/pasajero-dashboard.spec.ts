import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { PasajeroDashboard } from './pasajero-dashboard';
import { AuthService } from '../../../core/services/auth.service';
import { jwtInterceptor } from '../../../core/interceptors/jwt.interceptor';
import { ViajePasajeroContextoService } from '../../../core/services/viaje-pasajero-contexto.service';
import {
  ESTADISTICAS_DASHBOARD,
  SEMANA_DASHBOARD,
  SOLICITUD_DASHBOARD,
  loginDashboard,
  paginaDashboard,
} from '../../../testing/dashboard-fixtures';
import { busquedaFixture } from '../viajes/viajes.testing';

const listUrl = '/api/solicitudes/resumen';
const searchUrl = '/api/viajes/buscar/resumen';
describe('Passenger dashboard REST', () => {
  let fixture: ComponentFixture<PasajeroDashboard>;
  let c: PasajeroDashboard;
  let http: HttpTestingController;
  let auth: AuthService;
  let token: string;
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2027-01-01T00:00:00-05:00'));
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [PasajeroDashboard],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([jwtInterceptor])),
        provideHttpClientTesting(),
        provideNoopAnimations(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    token = loginDashboard(auth, http, 'PASAJERO');
    fixture = TestBed.createComponent(PasajeroDashboard);
    c = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne('/api/estadisticas').flush(ESTADISTICAS_DASHBOARD);
    http.expectOne('/api/estadisticas/semana').flush(SEMANA_DASHBOARD);
    http.expectOne('/api/metodos-compensacion').flush([
      { id: 41, tipo: 'DINERO', descripcion: 'Método propio', activo: true },
      { id: 42, tipo: 'FAVOR', descripcion: 'Método inactivo', activo: false },
    ]);
    fixture.detectChanges();
  });
  afterEach(() => {
    http.verify();
    fixture.destroy();
    auth.clearSession();
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });
  function req(url: string) {
    return http.expectOne((r) => r.url === url);
  }
  function accepted(content = [SOLICITUD_DASHBOARD]) {
    req(listUrl).flush({ solicitudes: paginaDashboard(content), mensaje: null });
    if (
      content.some(
        (s) => s.estado === 'ACEPTADA' && s.fecha === SOLICITUD_DASHBOARD.fecha && s.viajeId > 0,
      )
    )
      req('/api/solicitudes/historial').flush({ solicitudes: paginaDashboard([]), mensaje: null });
    fixture.detectChanges();
  }
  function search(content = [busquedaFixture], page = 0, total = content.length) {
    req(searchUrl).flush({
      viajes: { ...paginaDashboard(content, page, total, Math.ceil(total / 3)), size: 3 },
      mensaje: null,
      sugerencia: null,
    });
    fixture.detectChanges();
  }
  function text() {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }
  it('loads only allowed GET resources with JWT and keeps each section independent', () => {
    expect(text()).toContain('Cargando próximo viaje');
    expect(text()).toContain('Cargando viajes disponibles');
    expect(text()).toContain('Viajes como pasajero');
    const r = req(listUrl);
    expect(r.request.headers.get('Authorization')).toBe('Bearer ' + token);
    expect(r.request.params.get('estado')).toBe('ACEPTADA');
    expect(r.request.params.get('size')).toBe('100');
    r.flush({ solicitudes: paginaDashboard([]), mensaje: null });
    search([]);
    http.expectNone((r) => r.url.startsWith('/api/rutas') || r.method !== 'GET');
  });
  it('shows a real accepted request with local date and seconds without asserting driver confirmation', () => {
    accepted();
    search([]);
    expect(text()).toContain('Campus Norte');
    expect(text()).toContain('01/01/2027 · 09:00:30');
    expect(text()).toContain('Solicitud aceptada');
    expect(text()).toContain('no confirma la salida');
    for (const fake of [
      'Rodrigo Morales',
      'B7X-412',
      'Nissan',
      'S/ 380',
      'Asiento asignado',
      '100% puntualidad',
    ])
      expect(text()).not.toContain(fake);
  });
  it('shows a useful empty state and functional search link without synthetic trips', () => {
    accepted([]);
    search([]);
    expect(text()).toContain('Todavía no tienes un próximo viaje.');
    expect(fixture.nativeElement.querySelector('a[href="/pasajero/viajes/buscar"]')).toBeTruthy();
    expect(c.siguiente()).toBeNull();
  });
  it('reports incomplete request dates without Invalid Date, NaN or a fake next trip', () => {
    req(listUrl).flush({
      solicitudes: paginaDashboard([{ ...SOLICITUD_DASHBOARD, fecha: 'invalid' }]),
      mensaje: null,
    });
    search([]);
    fixture.detectChanges();
    expect(text()).toContain('datos de salida incompletos');
    expect(c.siguiente()).toBeNull();
    expect(text()).not.toMatch(/Invalid Date|NaN/);
    http.expectNone('/api/solicitudes/historial');
  });
  it.each([0, 403, 500])(
    'handles accepted-request error %i and retries HTTP without duplicating in-flight reads',
    (status) => {
      const r = req(listUrl);
      if (!status) r.error(new ProgressEvent('error'));
      else r.flush({ mensaje: 'SQL secret' }, { status, statusText: 'Failure' });
      search();
      fixture.detectChanges();
      expect(text()).toContain('No se pudo consultar tu próximo viaje');
      expect(text()).not.toContain('SQL secret');
      expect(text()).toContain('Conductora Prueba');
      c.proxima.retry();
      c.proxima.retry();
      accepted([]);
      expect(text()).toContain('Todavía no tienes un próximo viaje.');
    },
  );
  it('uses only available-trip DTO data and passes its real id/context to the existing detail flow', async () => {
    accepted([]);
    search();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const row = c.disponibles.state().data!.viajes.content[0];
    c.verDisponible(row);
    expect(navigate).toHaveBeenCalledWith(['/pasajero/viajes', 74]);
    expect(TestBed.inject(ViajePasajeroContextoService).obtener(74)?.viaje.conductorNombre).toBe(
      'Conductora Prueba',
    );
    expect(text()).toContain('Capacidad total: 6 pasajeros');
    expect(text()).not.toContain('6 cupos');
    http.expectNone((r) => r.method === 'POST' || r.method === 'PUT');
  });
  it('passes the selected accepted request and its actual source page to the existing cancellation/detail flow', () => {
    accepted();
    search([]);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    c.verSolicitud();
    expect(navigate).toHaveBeenCalledWith(['/pasajero/viajes', 74]);
    expect(TestBed.inject(ViajePasajeroContextoService).obtener(74)).toMatchObject({
      solicitud: SOLICITUD_DASHBOARD,
      consulta: { estado: 'ACEPTADA', page: 0, size: 100 },
      viaje: { estado: null },
    });
    expect(
      fixture.nativeElement.querySelector('a[href="/pasajero/viajes/mis-viajes"]'),
    ).toBeTruthy();
    http.expectNone((r) => r.method === 'PUT');
  });
  it('does not navigate using an invented object, invalid id or broken date', () => {
    accepted([]);
    search();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    c.verDisponible({ ...busquedaFixture, viajeId: 999 });
    c.verDisponible({ ...busquedaFixture, fecha: 'bad' });
    expect(navigate).not.toHaveBeenCalled();
  });
  it('does not invent driver metadata or expose nonfunctional filters', () => {
    accepted([]);
    req(searchUrl).flush({
      viajes: paginaDashboard([{ ...busquedaFixture, conductorNombre: null }]),
      mensaje: null,
      sugerencia: null,
    });
    fixture.detectChanges();
    expect(text()).not.toContain('Conductor:');
    expect(fixture.nativeElement.querySelector('input, select')).toBeNull();
    expect(text()).toContain('Abrir buscador');
  });
  it('cancels obsolete search pages, uses real totals and never retains old cards while loading', () => {
    accepted([]);
    const first = req(searchUrl);
    c.paginar({ pageIndex: 1, pageSize: 3, length: 7 });
    expect(first.cancelled).toBe(true);
    const second = req(searchUrl);
    expect(second.request.params.get('page')).toBe('1');
    expect(second.request.params.get('size')).toBe('3');
    expect(second.request.params.get('cercania')).toBe('false');
    second.flush({
      viajes: { ...paginaDashboard([busquedaFixture], 1, 7, 3), size: 3 },
      mensaje: null,
      sugerencia: null,
    });
    fixture.detectChanges();
    expect(text()).toContain('1 – 6 de 7'.replace('1 – 6', '4 – 6'));
    c.paginar({ pageIndex: 2, pageSize: 3, length: 7 });
    fixture.detectChanges();
    expect(text()).not.toContain('Conductora Prueba');
    search([], 2, 7);
  });
  it('shows the backend empty message and suggestion instead of demo recommendations', () => {
    accepted([]);
    req(searchUrl).flush({
      viajes: paginaDashboard([]),
      mensaje: 'Sin coincidencias de prueba',
      sugerencia: 'Amplía tus filtros de prueba',
    });
    fixture.detectChanges();
    expect(text()).toContain('Sin coincidencias de prueba');
    expect(text()).toContain('Amplía tus filtros de prueba');
    expect(text()).not.toContain('Según Tu Horario Académico');
  });
  it.each([0, 400, 403, 500])(
    'retries availability error %i without touching successful next-trip data',
    (status) => {
      accepted();
      const r = req(searchUrl);
      if (!status) r.error(new ProgressEvent('error'));
      else r.flush({}, { status, statusText: 'Failure' });
      fixture.detectChanges();
      expect(text()).toContain('Campus Norte');
      expect(text()).toContain('No se pudieron cargar los viajes');
      c.reintentarDisponibles();
      c.reintentarDisponibles();
      search();
      expect(text()).toContain('Conductora Prueba');
    },
  );
  it('shows backend metrics, actual method states and seven dynamic historical frequency bars', () => {
    accepted([]);
    search([]);
    expect(
      fixture.nativeElement.querySelector('[data-testid="completados"]').textContent.trim(),
    ).toBe('8');
    expect(
      fixture.nativeElement.querySelector('[data-testid="cancelados"]').textContent.trim(),
    ).toBe('3');
    expect(
      fixture.nativeElement.querySelector('[data-testid="penalidades"]').textContent.trim(),
    ).toBe('2');
    expect(text()).toContain('Método propio');
    expect(text()).toContain('Inactivo');
    expect(text()).toContain('Historial de viajes completados en ambos roles.');
    expect(fixture.nativeElement.querySelectorAll('.weekly-chart li').length).toBe(7);
    expect(
      (fixture.nativeElement.querySelectorAll('.bar-fill')[1] as HTMLElement).style.width,
    ).toBe('100%');
    http.expectNone('/api/estadisticas/rutas');
  });
  it('uses the shared 401 logout without a fake success or alternative token', () => {
    accepted([]);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    req(searchUrl).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/auth/login']);
    expect(auth.getToken()).toBeNull();
    expect(text()).not.toContain('Solicitud de cupo enviada');
  });
  it('cancels pending dashboard reads when destroyed', () => {
    const next = req(listUrl);
    const available = req(searchUrl);
    fixture.destroy();
    expect(next.cancelled && available.cancelled).toBe(true);
  });
});
