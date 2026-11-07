import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ConductorDashboard } from './conductor-dashboard';
import { AuthService } from '../../../core/services/auth.service';
import { jwtInterceptor } from '../../../core/interceptors/jwt.interceptor';
import {
  ESTADISTICAS_DASHBOARD,
  SEMANA_DASHBOARD,
  RUTA_DASHBOARD,
  VIAJE_DASHBOARD,
  loginDashboard,
  paginaDashboard,
} from '../../../testing/dashboard-fixtures';
import { Viaje } from '../../../core/models/ruta.models';

const rutasUrl = '/api/rutas';
const pendientesUrl = '/api/viajes/791/solicitudes';
describe('Driver dashboard REST', () => {
  let fixture: ComponentFixture<ConductorDashboard>;
  let c: ConductorDashboard;
  let http: HttpTestingController;
  let auth: AuthService;
  let token: string;
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2027-01-01T00:00:00-05:00'));
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [ConductorDashboard],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([jwtInterceptor])),
        provideHttpClientTesting(),
        provideNoopAnimations(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    token = loginDashboard(auth, http, 'CONDUCTOR');
    fixture = TestBed.createComponent(ConductorDashboard);
    c = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne('/api/estadisticas').flush(ESTADISTICAS_DASHBOARD);
    http.expectOne('/api/estadisticas/semana').flush(SEMANA_DASHBOARD);
    http.expectOne('/api/estadisticas/rutas').flush({
      suficientesDatos: true,
      mensaje: null,
      ranking: [
        { origen: 'Origen menos usado', destino: 'Campus', cantidad: 2, penalidades: 1 },
        { origen: 'Origen más usado', destino: 'Campus', cantidad: 9, penalidades: 0 },
      ],
    });
    http.expectOne('/api/metodos-compensacion').flush([]);
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
  function text() {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }
  function ownTrips(rows: Viaje[] = [VIAJE_DASHBOARD]) {
    req(rutasUrl).flush(paginaDashboard([RUTA_DASHBOARD]));
    req('/api/rutas/86/viajes').flush(paginaDashboard(rows));
    TestBed.tick();
    fixture.detectChanges();
  }
  function pending(total = 4) {
    const r = req(pendientesUrl);
    expect(r.request.params.get('estado')).toBe('PENDIENTE');
    expect(r.request.params.get('size')).toBe('1');
    r.flush(paginaDashboard([], 0, total, total ? total : 0));
    TestBed.tick();
    fixture.detectChanges();
  }
  it('loads own trips with the existing JWT and shows the real route, state and local seconds', () => {
    const r = req(rutasUrl);
    expect(r.request.headers.get('Authorization')).toBe('Bearer ' + token);
    expect(r.request.method).toBe('GET');
    r.flush(paginaDashboard([RUTA_DASHBOARD]));
    req('/api/rutas/86/viajes').flush(paginaDashboard([VIAJE_DASHBOARD]));
    TestBed.tick();
    fixture.detectChanges();
    pending();
    expect(text()).toContain('Origen de prueba');
    expect(text()).toContain('01/01/2027 · 09:00:30');
    expect(text()).toContain('Programado');
    expect(text()).toContain('Salida pendiente de confirmación');
    expect(text()).toContain('Capacidad total: 6');
    expect(text()).toContain('Pasajeros registrados: 2');
    expect(fixture.nativeElement.querySelector('a[href="/conductor/viajes/791"]')).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('a[href="/conductor/viajes/791/solicitudes"]'),
    ).toBeTruthy();
    for (const fake of [
      'Toyota',
      'ABC-123',
      'María López',
      'Carlos Gómez',
      'Sofía Morales',
      'Tráfico',
      '68%',
      'S/ 142',
    ])
      expect(text()).not.toContain(fake);
  });
  it('does not retrieve or invent an individual GET endpoint for the selected trip', () => {
    ownTrips();
    pending();
    http.expectNone('/api/viajes/791');
    http.expectNone((r) => r.method !== 'GET');
  });
  it('shows an empty state and working publication/routes links when there are no own routes', () => {
    req(rutasUrl).flush(paginaDashboard([]));
    TestBed.tick();
    fixture.detectChanges();
    expect(text()).toContain('Todavía no tienes un próximo viaje.');
    expect(fixture.nativeElement.querySelector('a[href="/conductor/rutas/publicar"]')).toBeTruthy();
    expect(c.proximo()).toBeNull();
    http.expectNone(pendientesUrl);
  });
  it.each(['COMPLETADO', 'CANCELADO', 'VENCIDO'] as const)(
    'never presents a %s trip as the next departure',
    (estado) => {
      ownTrips([{ ...VIAJE_DASHBOARD, estado }]);
      expect(c.proximo()).toBeNull();
      expect(text()).toContain('Todavía no tienes un próximo viaje.');
      http.expectNone(pendientesUrl);
    },
  );
  it('skips past scheduled trips and incomplete dates without rendering NaN', () => {
    ownTrips([
      { ...VIAJE_DASHBOARD, fecha: '2026-12-31' },
      { ...VIAJE_DASHBOARD, id: 792, fecha: '2027-02-30' },
    ]);
    expect(c.proximo()).toBeNull();
    expect(text()).not.toMatch(/Invalid Date|NaN/);
    http.expectNone(pendientesUrl);
  });
  it('displays an ongoing trip before future scheduled departures', () => {
    ownTrips([
      { ...VIAJE_DASHBOARD, fecha: '2026-12-31', estado: 'EN_PROGRESO', confirmado: true },
      { ...VIAJE_DASHBOARD, id: 792, hora: '07:00' },
    ]);
    pending();
    expect(text()).toContain('Viaje en progreso');
    expect(text()).toContain('Salida confirmada por ti');
    expect(c.proximo()?.id).toBe(791);
  });
  it('does not invent an optional passenger count, confirmation or vehicle when fields are absent', () => {
    ownTrips([{ ...VIAJE_DASHBOARD, pasajeros: undefined, confirmado: undefined }]);
    pending(0);
    expect(text()).not.toContain('Pasajeros registrados:');
    expect(text()).not.toContain('Salida confirmada por ti');
    expect(fixture.nativeElement.querySelector('.car-spec, .seats-visual')).toBeNull();
  });
  it('uses backend pending totals and does not repeat the request after its completion', () => {
    ownTrips();
    pending(19);
    expect(text()).toContain('19 solicitudes pendientes');
    TestBed.tick();
    fixture.detectChanges();
    http.expectNone(pendientesUrl);
  });
  it.each([0, 403, 404, 500])(
    'isolates pending-request error %i and performs a scoped real retry',
    (status) => {
      ownTrips();
      const r = req(pendientesUrl);
      if (!status) r.error(new ProgressEvent('error'));
      else r.flush({ mensaje: 'SQL secret' }, { status, statusText: 'Failure' });
      fixture.detectChanges();
      expect(text()).toContain('No se pudieron cargar las solicitudes');
      expect(text()).toContain('Origen de prueba');
      expect(text()).not.toContain('SQL secret');
      c.reintentarSolicitudes();
      c.reintentarSolicitudes();
      pending(0);
      http.expectNone(rutasUrl);
    },
  );
  it.each([0, 403, 500])(
    'retries own-route error %i without reloading successful statistics',
    (status) => {
      const r = req(rutasUrl);
      if (!status) r.error(new ProgressEvent('error'));
      else r.flush({ mensaje: 'SQL secret' }, { status, statusText: 'Failure' });
      fixture.detectChanges();
      expect(text()).toContain('No se pudieron cargar tus viajes');
      expect(text()).not.toContain('SQL secret');
      expect(
        fixture.nativeElement.querySelector('[data-testid="completados"]').textContent.trim(),
      ).toBe('17');
      c.viajes.retry();
      c.viajes.retry();
      ownTrips();
      pending();
      http.expectNone('/api/estadisticas');
    },
  );
  it('uses only real statistics and sorts the route ranking by completed count without fake percentages', () => {
    ownTrips();
    pending();
    expect(c.rutasFrecuentes().map((r) => r.cantidad)).toEqual([9, 2]);
    expect(text()).toContain('2 viajes completados · 1 penalidades');
    expect(text()).not.toContain('0% Cancelaciones');
    expect(
      fixture.nativeElement.querySelector('[data-testid="completados"]').textContent.trim(),
    ).toBe('17');
    expect(fixture.nativeElement.querySelectorAll('.weekly-chart li').length).toBe(7);
  });
  it.each([false, true])('handles insufficient or empty real ranking (%s)', (suficientesDatos) => {
    ownTrips();
    pending();
    c.ranking.retry();
    req('/api/estadisticas/rutas').flush({
      suficientesDatos,
      mensaje: 'Necesitas más viajes de prueba',
      ranking: [],
    });
    fixture.detectChanges();
    expect(text()).toContain(
      suficientesDatos ? 'No hay rutas en tu ranking.' : 'Necesitas más viajes de prueba',
    );
    expect(c.rutasFrecuentes()).toEqual([]);
  });
  it('retries ranking errors without disturbing the selected trip', () => {
    ownTrips();
    pending();
    c.ranking.retry();
    req('/api/estadisticas/rutas').flush({}, { status: 500, statusText: 'Failure' });
    fixture.detectChanges();
    expect(text()).toContain('No se pudo cargar el ranking');
    expect(c.proximo()?.id).toBe(791);
    c.ranking.retry();
    req('/api/estadisticas/rutas').flush({ suficientesDatos: true, mensaje: null, ranking: [] });
  });
  it('cancels old selected-trip requests while refreshing own routes and never shows their old count', () => {
    ownTrips();
    const old = req(pendientesUrl);
    c.viajes.retry();
    TestBed.tick();
    fixture.detectChanges();
    expect(old.cancelled).toBe(true);
    expect(text()).not.toContain('solicitudes pendientes para');
    req(rutasUrl).flush(paginaDashboard([]));
    TestBed.tick();
    fixture.detectChanges();
    expect(c.proximo()).toBeNull();
    http.expectNone(pendientesUrl);
  });
  it('cancels in-flight driver dashboard HTTP on destruction', () => {
    const old = req(rutasUrl);
    fixture.destroy();
    expect(old.cancelled).toBe(true);
  });
});
