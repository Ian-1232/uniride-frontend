import { prepararPerfil } from '../../testing/perfil-fixtures';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Type } from '@angular/core';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '../../core/services/auth.service';
import { jwtInterceptor } from '../../core/interceptors/jwt.interceptor';
import { ReportesService } from '../../core/services/reportes.service';
import { routes } from '../../app.routes';
import { ResumenActividad } from './resumen-actividad/resumen-actividad';
import { FrecuenciaSemanal } from './frecuencia-semanal/frecuencia-semanal';
import { RutasFrecuentes } from './rutas-frecuentes/rutas-frecuentes';

// Fixtures belong exclusively to tests. All traffic is intercepted by HttpTestingController.
const summary = { viajesComoConductor: 17, viajesComoPasajero: 6, viajesCancelados: 4, penalidadesAcumuladas: 9 };
const week = {
  suficientesDatos: true, mensaje: null,
  viajesPorDia: ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'].map((dia, i) => ({ dia, cantidad: [0, 2, 7, 11, 34, 5, 1][i] })),
  canceladosPorMi: 8, canceladosPorTerceros: 13,
};
const ranking = {
  suficientesDatos: true, mensaje: null,
  ranking: [
    { origen: 'Ruta A', destino: 'Campus A', cantidad: 7, penalidades: 4 },
    { origen: 'Ruta B', destino: 'Campus B', cantidad: 21, penalidades: 0 },
    { origen: 'Ruta C', destino: 'Campus C', cantidad: 9, penalidades: 2 },
  ],
};

describe('Reportes HTTP integration', () => {
  let http: HttpTestingController;
  let auth: AuthService;
  let token: string;
  beforeEach(() => {
    localStorage.clear(); sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [ResumenActividad, FrecuenciaSemanal, RutasFrecuentes],
      providers: [provideRouter(routes), provideHttpClient(withInterceptors([jwtInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    authenticate();
  });
  afterEach(() => {
    http.verify(); auth.clearSession();
    localStorage.clear(); sessionStorage.clear();
  });
  function authenticate(rol: 'CONDUCTOR' | 'PASAJERO' = 'CONDUCTOR') {
    token = 'eyJhbGciOiJIUzI1NiJ9.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })) + '.signature';
    auth.login({ correo: 'reportes@upc.edu.pe', contrasena: 'TestPassword1!' }).subscribe();
    http.expectOne('/api/auth/login').flush({ token, mensaje: 'OK', usuario: { id: 8, correo: 'reportes@upc.edu.pe', nombre: 'Test', rol, cuentaVerificada: true } });
    prepararPerfil();
  }
  function create<T>(component: Type<T>) {
    const fixture = TestBed.createComponent(component);
    fixture.detectChanges();
    return fixture;
  }
  function element<T>(fixture: ComponentFixture<T>): HTMLElement { return fixture.nativeElement; }
  function retry<T>(fixture: ComponentFixture<T>) {
    const button = element(fixture).querySelector('app-reportes-state-panel button') as HTMLButtonElement;
    expect(button.textContent).toContain('Reintentar');
    button.click(); fixture.detectChanges();
  }

  it('US19 loads the authenticated endpoint, totals only completed trips and separates incidents', () => {
    const fixture = create(ResumenActividad);
    expect(element(fixture).textContent).toContain('Cargando actividad');
    expect(element(fixture).querySelector('.summary-grid')).toBeNull();
    const req = http.expectOne('/api/estadisticas');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    req.flush(summary); fixture.detectChanges();
    expect(element(fixture).querySelector('.total-card strong')?.textContent).toBe('23');
    expect(element(fixture).querySelector('.metric-card--driver strong')?.textContent).toBe('17');
    expect(element(fixture).querySelector('.metric-card--passenger strong')?.textContent).toBe('6');
    expect(element(fixture).querySelector('.metric-card--cancelled strong')?.textContent).toBe('4');
    expect(element(fixture).querySelector('.metric-card--penalties strong')?.textContent).toBe('9');
  });
  it('US19 renders real zeros without fallback values', () => {
    const fixture = create(ResumenActividad);
    http.expectOne('/api/estadisticas').flush({ viajesComoConductor: 0, viajesComoPasajero: 0, viajesCancelados: 0, penalidadesAcumuladas: 0 });
    fixture.detectChanges();
    expect([...element(fixture).querySelectorAll('.summary-grid strong')].map(el => el.textContent)).toEqual(['0', '0', '0', '0', '0']);
  });
  it('US20 displays seven actual counts, normalized labels, historical total and dynamic heights', () => {
    const fixture = create(FrecuenciaSemanal);
    http.expectOne('/api/estadisticas/semana').flush(week); fixture.detectChanges();
    expect(element(fixture).querySelectorAll('.bar').length).toBe(7);
    expect([...element(fixture).querySelectorAll('.bar-value')].map(el => Number(el.textContent))).toEqual([0, 2, 7, 11, 34, 5, 1]);
    expect(element(fixture).textContent).toContain('Miércoles');
    expect(element(fixture).textContent).toContain('Sábado');
    expect(element(fixture).textContent).toContain('Total del historial: 60');
    expect(element(fixture).querySelector('.chart')?.getAttribute('aria-label')).toContain('60 viajes');
    expect(element(fixture).querySelector('.chart-scale')?.textContent).toContain('35');
    const bars = element(fixture).querySelectorAll<HTMLElement>('.bar');
    expect(bars[0].style.height).toBe('0%');
    expect(parseFloat(bars[4].style.height)).toBeCloseTo(34 / 35 * 100);
    expect(element(fixture).querySelector('.cancellation-card--mine strong')?.textContent).toBe('8');
    expect(element(fixture).querySelector('.cancellation-card--others strong')?.textContent).toBe('13');
    expect(element(fixture).textContent).toContain('no se limita a la semana actual');
  });
  it('US20 displays the backend insufficient-data message and actual cancellations without a chart', () => {
    const fixture = create(FrecuenciaSemanal);
    http.expectOne('/api/estadisticas/semana').flush({ ...week, suficientesDatos: false, mensaje: 'Tienes 2 viajes; necesitas al menos 5.', viajesPorDia: [] });
    fixture.detectChanges();
    expect(element(fixture).textContent).toContain('Tienes 2 viajes; necesitas al menos 5.');
    expect(element(fixture).querySelector('.chart')).toBeNull();
    expect(element(fixture).querySelector('.cancellation-card--mine strong')?.textContent).toBe('8');
    expect(element(fixture).querySelector('.cancellation-card--others strong')?.textContent).toBe('13');
  });
  it('US20 does not produce invalid bar heights when all returned counts are zero', () => {
    const fixture = create(FrecuenciaSemanal);
    http.expectOne('/api/estadisticas/semana').flush({ ...week, viajesPorDia: week.viajesPorDia.map(day => ({ ...day, cantidad: 0 })) });
    fixture.detectChanges();
    expect([...element(fixture).querySelectorAll<HTMLElement>('.bar')].every(el => el.style.height === '0%')).toBe(true);
  });
  it('US21 sorts a copy, assigns positions and preserves counts and penalties in both layouts', () => {
    const fixture = create(RutasFrecuentes);
    expect(element(fixture).textContent).toContain('Cargando rutas');
    http.expectOne('/api/estadisticas/rutas').flush(ranking); fixture.detectChanges();
    const rows = element(fixture).querySelectorAll('tbody tr');
    expect(rows.length).toBe(3);
    expect(rows[0].textContent).toContain('Ruta B');
    expect(rows[0].querySelector('.position')?.textContent).toBe('1');
    expect(rows[0].querySelector('.penalty-badge')?.textContent?.trim()).toBe('0');
    expect(rows[2].textContent).toContain('Ruta A');
    expect(rows[2].querySelector('.penalty-badge')?.textContent?.trim()).toBe('4');
    expect([...element(fixture).querySelectorAll('.mobile-ranking .position')].map(el => el.textContent)).toEqual(['1', '2', '3']);
    expect(element(fixture).querySelectorAll('.mobile-ranking .route-card').length).toBe(3);
    expect(ranking.ranking[0].origen).toBe('Ruta A');
  });
  it('US21 shows insufficient data and the server message instead of demonstration routes', () => {
    const fixture = create(RutasFrecuentes);
    http.expectOne('/api/estadisticas/rutas').flush({ suficientesDatos: false, mensaje: 'Completa 5 viajes como conductor.', ranking: [] });
    fixture.detectChanges();
    expect(element(fixture).textContent).toContain('Completa 5 viajes como conductor.');
    expect(element(fixture).querySelector('table')).toBeNull();
    expect(element(fixture).querySelector('.route-card')).toBeNull();
  });
  it('US21 handles an empty ranking even with suficientesDatos=true', () => {
    const fixture = create(RutasFrecuentes);
    http.expectOne('/api/estadisticas/rutas').flush({ suficientesDatos: true, mensaje: null, ranking: [] });
    fixture.detectChanges();
    expect(element(fixture).textContent).toContain('Sin rutas para mostrar');
    expect(element(fixture).querySelector('table')).toBeNull();
  });

  for (const [component, url, response, selector] of [
    [ResumenActividad, '/api/estadisticas', summary, '.summary-grid'],
    [FrecuenciaSemanal, '/api/estadisticas/semana', week, '.chart'],
    [RutasFrecuentes, '/api/estadisticas/rutas', ranking, 'table'],
  ] as const) {
    it.each([0, 403, 500])(`${component.name} handles HTTP %s without fabricated data and retries successfully`, status => {
      const fixture = create(component as typeof ResumenActividad);
      const req = http.expectOne(url);
      if (status === 0) req.error(new ProgressEvent('error'));
      else req.flush({ mensaje: 'Internal sensitive detail' }, { status, statusText: 'Error' });
      fixture.detectChanges();
      expect(element(fixture).querySelector(selector)).toBeNull();
      expect(element(fixture).textContent).not.toContain('Internal sensitive detail');
      expect(element(fixture).textContent).toContain(status === 0 ? 'conectar' : status === 403 ? 'permiso' : 'servidor');
      retry(fixture);
      expect(element(fixture).querySelector('mat-spinner')).toBeTruthy();
      http.expectOne(url).flush(response); fixture.detectChanges();
      expect(element(fixture).querySelector(selector)).toBeTruthy();
      http.expectNone(url);
    });
    it(`${component.name} cancels pending HTTP on destruction`, () => {
      const fixture = create(component as typeof ResumenActividad);
      const req = http.expectOne(url); fixture.destroy();
      expect(req.cancelled).toBe(true);
    });
  }
  it('repeated retry emissions during loading do not duplicate requests', () => {
    const fixture = create(ResumenActividad);
    // Exercise the same callback bound to the state panel, while the first HTTP is pending.
    const report = (fixture.componentInstance as unknown as { report: { retry(): void } }).report;
    report.retry(); report.retry();
    http.expectOne('/api/estadisticas').flush(summary);
  });
  it('401 uses the existing interceptor to clear the session and navigate to login', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = create(ResumenActividad);
    http.expectOne('/api/estadisticas').flush({}, { status: 401, statusText: 'Unauthorized' }); fixture.detectChanges();
    expect(auth.isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/auth/login']);
    expect(element(fixture).textContent).toContain('Inicia sesión');
  });
  it('403 preserves the session and never redirects automatically', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
    const fixture = create(RutasFrecuentes);
    http.expectOne('/api/estadisticas/rutas').flush({}, { status: 403, statusText: 'Forbidden' }); fixture.detectChanges();
    expect(auth.isAuthenticated()).toBe(true); expect(navigate).not.toHaveBeenCalled();
    expect(element(fixture).querySelector('table')).toBeNull();
  });
  it('the service uses authenticated GETs without arbitrary user identifiers', () => {
    const service = TestBed.inject(ReportesService);
    service.resumen().subscribe(); service.semana().subscribe(); service.rutas().subscribe();
    for (const url of ['/api/estadisticas', '/api/estadisticas/semana', '/api/estadisticas/rutas']) {
      const req = http.expectOne(url);
      expect(req.request.method).toBe('GET'); expect(req.request.body).toBeNull();
      expect(req.request.params.keys()).toEqual([]);
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
      req.flush({});
    }
    TestBed.inject(HttpClient).get('https://external.example/estadisticas').subscribe();
    const external = http.expectOne('https://external.example/estadisticas');
    expect(external.request.headers.has('Authorization')).toBe(false); external.flush({});
  });
  it('anonymous visitors cannot open the ranking by URL', async () => {
    auth.clearSession();
    await RouterTestingHarness.create('/reportes/rutas');
    expect(TestBed.inject(Router).url).toBe('/auth/login');
    http.expectNone('/api/estadisticas/rutas');
  });
  it('passengers cannot open the ranking by URL', async () => {
    authenticate('PASAJERO');
    await RouterTestingHarness.create('/reportes/rutas');
    expect(TestBed.inject(Router).url).toBe('/pasajero/dashboard');
    http.expectNone('/api/estadisticas/rutas');
  });
  it('URL demonstration states do not replace the real loading or response', async () => {
    const harness = await RouterTestingHarness.create('/reportes/resumen?estado=incidencias');
    expect(harness.routeNativeElement?.querySelector('.summary-grid')).toBeNull();
    http.expectOne('/api/estadisticas').flush(summary); harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('.total-card strong')?.textContent).toBe('23');
  });
});
