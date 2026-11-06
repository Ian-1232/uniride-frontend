import { resolverDashboardVacio } from '../../../testing/dashboard-fixtures';
import { prepararPerfil } from '../../../testing/perfil-fixtures';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormGroup } from '@angular/forms';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '../../../core/services/auth.service';
import { ContribucionService } from '../../../core/services/contribucion.service';
import { jwtInterceptor } from '../../../core/interceptors/jwt.interceptor';
import { routes } from '../../../app.routes';
import { MISSING_PASSENGERS } from '../contribucion.models';
import { SugerenciaContribucion } from './sugerencia-contribucion';

// Contract fixtures exist only in tests; deliberately distinct amounts detect hardcoded calculations.
const suggestion = {
  viajeId: 74,
  origen: 'Campus Norte',
  destino: 'Biblioteca Universitaria',
  dia: 'Domingo',
  fecha: '2026-11-01',
  hora: '00:05:00',
  pasajeros: 7,
  esHoraPico: false,
  costoTotalEstimado: 123.45,
  aporteEstimado: 17.29,
  litrosGasolinaAprox: 3.2,
  sugerenciaFavor: 'Apoyo acordado con el conductor',
  nota: 'Nota referencial recibida del servidor.',
};
const endpoint = '/api/viajes/74/sugerencia-contribucion';

describe('US29 authenticated REST integration', () => {
  let http: HttpTestingController;
  let auth: AuthService;
  let harness: RouterTestingHarness;
  let component: SugerenciaContribucion;
  let token: string;
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(withInterceptors([jwtInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    authenticate();
  });
  afterEach(() => {
    resolverDashboardVacio(http);
    http.verify();
    auth.clearSession();
    localStorage.clear();
    sessionStorage.clear();
  });
  function authenticate(rol = 'PASAJERO') {
    token =
      'eyJhbGciOiJIUzI1NiJ9.' +
      btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })) +
      '.signature';
    auth.login({ correo: 'pasajera@upc.edu.pe', contrasena: 'Password1!' }).subscribe();
    http
      .expectOne('/api/auth/login')
      .flush({
        token,
        mensaje: 'OK',
        usuario: {
          id: 18,
          nombre: 'Lucia',
          apellidos: 'Torres',
          correo: 'pasajera@upc.edu.pe',
          rol,
          cuentaVerificada: true,
        },
      });
    prepararPerfil();
  }
  async function render(path = '/contribucion/sugerencia/74') {
    harness = await RouterTestingHarness.create(path);
    component = harness.fixture.debugElement.query(
      By.directive(SugerenciaContribucion),
    )?.componentInstance;
    harness.detectChanges();
  }
  function root(): HTMLElement {
    return harness.routeNativeElement!;
  }
  function text() {
    return root().textContent ?? '';
  }
  function form(): FormGroup {
    return (component as unknown as { form: FormGroup }).form;
  }
  function request(id = 74) {
    return http.expectOne((req) => req.url === '/api/viajes/' + id + '/sugerencia-contribucion');
  }
  function submit(value: number | null) {
    form().controls['pasajeros'].setValue(value);
    harness.detectChanges();
    root()
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    harness.detectChanges();
  }
  function retry() {
    (root().querySelector('app-contribucion-state-panel button') as HTMLButtonElement).click();
    harness.detectChanges();
  }
  async function missing() {
    await render();
    request().flush({ mensaje: MISSING_PASSENGERS }, { status: 400, statusText: 'Bad Request' });
    harness.detectChanges();
  }
  it('automatically GETs without pasajeros, sends Bearer and renders only the backend values', async () => {
    await render();
    expect(text()).toContain('Cargando sugerencia');
    expect(root().querySelector('.amount-value')).toBeNull();
    const req = request();
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    expect(req.request.headers.get('Authorization')).toBe('Bearer ' + token);
    expect(req.request.body).toBeNull();
    req.flush(suggestion);
    harness.detectChanges();
    expect(root().querySelector('.amount-value')?.textContent).toContain('S/ 17.29');
    expect(text()).toContain('S/ 123.45');
    expect(text()).toContain('3.20 L');
    expect(text()).toContain('Domingo 1/11/2026');
    expect(text()).toContain('00:05');
    expect(text()).toContain(suggestion.sugerenciaFavor);
    expect(text()).toContain(suggestion.nota);
    expect(text()).toContain('7 pasajeros');
    expect(text()).toContain('Cantidad confirmada por el viaje');
    expect(text()).not.toContain('S/ 6.00');
    expect(text()).not.toContain('S/ 12.00');
    expect(root().querySelector('input')).toBeNull();
    expect(root().querySelector('.ur-status--warning')).toBeNull();
  });
  it('shows returned peak-hour status and never computes the contribution from a local tariff', async () => {
    await render();
    request().flush({ ...suggestion, esHoraPico: true, pasajeros: 1, aporteEstimado: 51.07 });
    harness.detectChanges();
    expect(text()).toContain('Hora pico');
    expect(text()).toContain('51.07');
    expect(text()).toContain('123.45');
    expect(text()).toContain('1 pasajero');
  });
  it('only the documented missing-passenger error opens an empty form, without fictitious trip data', async () => {
    await missing();
    expect(text()).toContain(MISSING_PASSENGERS);
    expect(form().controls['pasajeros'].value).toBeNull();
    expect(root().querySelector('form')).toBeTruthy();
    expect(root().querySelector('.trip-card')).toBeNull();
    expect(root().querySelector('.amount-value')).toBeNull();
    expect(text()).not.toContain('San Borja');
  });
  it.each([1, 2, 3, 19, 100])(
    'queries the real endpoint with any positive integer %s',
    async (pasajeros) => {
      await missing();
      submit(pasajeros);
      const req = request();
      expect(req.request.params.get('pasajeros')).toBe(String(pasajeros));
      expect(req.request.params.keys()).toEqual(['pasajeros']);
      req.flush({ ...suggestion, pasajeros });
      harness.detectChanges();
      expect(text()).toContain('17.29');
      expect(root().querySelector('.passenger-count')?.textContent).toContain(String(pasajeros));
      expect(root().querySelector('input')).toBeNull();
    },
  );
  it.each([null, 0, -3, 1.5, NaN, Infinity])(
    'does not query with invalid passenger count %s',
    async (value) => {
      await missing();
      submit(value);
      expect(form().invalid).toBe(true);
      http.expectNone((req) => req.url.endsWith('/sugerencia-contribucion'));
      expect(root().querySelector('.amount-value')).toBeNull();
    },
  );
  it('honors the backend when it overrides the supplied passenger count', async () => {
    await missing();
    submit(19);
    request().flush({ ...suggestion, pasajeros: 5 });
    harness.detectChanges();
    expect(root().querySelector('.passenger-count')?.textContent).toContain('5 pasajeros');
    expect(root().querySelector('input')).toBeNull();
    expect(text()).toContain('17.29');
  });
  it('does not mistake an unrelated initial HTTP 400 for missing passengers', async () => {
    await render();
    request().flush(
      { mensaje: 'Private server details' },
      { status: 400, statusText: 'Bad Request' },
    );
    harness.detectChanges();
    expect(text()).toContain('Revisa la cantidad');
    expect(text()).not.toContain('Private server');
    expect(root().querySelector('form')).toBeNull();
  });
  it('retains a manual quantity after a server validation error and lets it be corrected', async () => {
    await missing();
    submit(2147483648);
    request().flush({}, { status: 400, statusText: 'Bad Request' });
    harness.detectChanges();
    expect(form().controls['pasajeros'].value).toBe(2147483648);
    expect(root().querySelector('input')).toBeTruthy();
    submit(8);
    request().flush({ ...suggestion, pasajeros: 8 });
    harness.detectChanges();
    expect(text()).toContain('8 pasajeros');
  });
  it.each([0, 403, 404, 409, 500])(
    'handles HTTP %s without an amount and retries via HTTP',
    async (status) => {
      await render();
      const req = request();
      if (!status) req.error(new ProgressEvent('error'));
      else req.flush({ mensaje: 'Private SQL detail' }, { status, statusText: 'Error' });
      harness.detectChanges();
      expect(root().querySelector('.amount-value')).toBeNull();
      expect(text()).not.toContain('Private SQL');
      expect(text()).toContain(
        status === 404
          ? 'Viaje no encontrado'
          : status === 409
            ? 'Viaje no disponible'
            : status === 403
              ? 'Acceso restringido'
              : status === 0
                ? 'conectar'
                : 'Error de consulta',
      );
      if (status === 403) expect(auth.isAuthenticated()).toBe(true);
      retry();
      const next = request();
      expect(next.request.params.keys()).toEqual([]);
      next.flush(suggestion);
      harness.detectChanges();
      expect(text()).toContain('17.29');
    },
  );
  it('retries a manual quantity instead of dropping the parameter', async () => {
    await missing();
    submit(9);
    request().error(new ProgressEvent('error'));
    harness.detectChanges();
    expect(form().controls['pasajeros'].value).toBe(9);
    retry();
    const req = request();
    expect(req.request.params.get('pasajeros')).toBe('9');
    req.flush({ ...suggestion, pasajeros: 9 });
    harness.detectChanges();
    expect(text()).toContain('9 pasajeros');
  });
  it('401 uses the existing interceptor logout and never shows an amount', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await render();
    request().flush({}, { status: 401, statusText: 'Unauthorized' });
    harness.detectChanges();
    expect(auth.isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/auth/login']);
    expect(text()).toContain('Inicia sesión');
    expect(root().querySelector('.amount-value')).toBeNull();
  });
  it('prevents duplicate clicks during the active request', async () => {
    await missing();
    submit(7);
    (component as unknown as { submit(): void; retry(): void }).submit();
    (component as unknown as { retry(): void }).retry();
    request().flush(suggestion);
    harness.detectChanges();
    http.expectNone((req) => req.url.endsWith('/sugerencia-contribucion'));
  });
  it('cancels the obsolete request when the route ID changes', async () => {
    await render();
    const pending = request();
    await harness.navigateByUrl('/contribucion/sugerencia/99');
    expect(pending.cancelled).toBe(true);
    request(99).flush({ ...suggestion, viajeId: 99, origen: 'Nuevo viaje' });
    harness.detectChanges();
    expect(text()).toContain('Nuevo viaje');
    expect(text()).not.toContain('Campus Norte');
  });
  it('cancels a pending manual request when leaving the screen', async () => {
    await missing();
    submit(6);
    const pending = request();
    await harness.navigateByUrl('/pasajero/dashboard');
    expect(pending.cancelled).toBe(true);
    expect(root().querySelector('.amount-value')).toBeNull();
  });
  it.each(['0', '-1', 'abc', '1.2', '1e3', '9007199254740999'])(
    'rejects invalid route ID %s without HTTP',
    async (id) => {
      await render('/contribucion/sugerencia/' + id);
      expect(text()).toContain('Viaje no encontrado');
      http.expectNone((req) => req.url.endsWith('/sugerencia-contribucion'));
    },
  );
  it.each(['disponible', 'unico-pasajero', 'pasajeros-confirmados', 'insuficiente', 'error'])(
    'ignores ?estado=%s',
    async (estado) => {
      await render('/contribucion/sugerencia/74?estado=' + estado);
      expect(text()).toContain('Cargando');
      expect(root().querySelector('.amount-value')).toBeNull();
      request().flush(suggestion);
      harness.detectChanges();
      expect(text()).toContain('17.29');
    },
  );
  it('the shell uses the session user and no hardcoded trip links', async () => {
    await render();
    request().flush(suggestion);
    harness.detectChanges();
    expect(text()).toContain('Lucia');
    expect(text()).not.toContain('Juan Pérez');
    expect(root().querySelector('a[href="/contribucion/sugerencia/35"]')).toBeNull();
    expect(root().querySelector('.return-button')?.getAttribute('href')).toBe(
      '/pasajero/viajes/mis-viajes',
    );
    expect(root().querySelector('a[href="/pasajero/viajes/74"]')).toBeNull();
  });
  it.each(['anonymous', 'CONDUCTOR'])('preserves route restrictions for %s', async (role) => {
    if (role === 'anonymous') auth.clearSession();
    else authenticate(role);
    await render();
    expect(TestBed.inject(Router).url).toBe(
      role === 'anonymous' ? '/auth/login' : '/conductor/dashboard',
    );
    http.expectNone((req) => req.url.endsWith('/sugerencia-contribucion'));
  });
  it('rejects a mismatched trip or malformed estimated values without fabricated fallback', async () => {
    await render();
    request().flush({ ...suggestion, viajeId: 99 });
    harness.detectChanges();
    expect(root().querySelector('.amount-value')).toBeNull();
    retry();
    request().flush({ ...suggestion, aporteEstimado: null });
    harness.detectChanges();
    expect(root().querySelector('.amount-value')).toBeNull();
    expect(text()).toContain('respuesta de estimación inválida');
  });
  it('the service has no user ID or manual Authorization additions', () => {
    TestBed.inject(ContribucionService).sugerencia(208, 4).subscribe();
    const req = request(208);
    expect(req.request.params.keys()).toEqual(['pasajeros']);
    expect(req.request.body).toBeNull();
    expect(req.request.headers.get('Authorization')).toBe('Bearer ' + token);
    req.flush({ ...suggestion, viajeId: 208, pasajeros: 4 });
  });
});
