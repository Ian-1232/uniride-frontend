import { resolverDashboardVacio } from '../../../testing/dashboard-fixtures';
import { prepararPerfil } from '../../../testing/perfil-fixtures';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormControl, FormGroup } from '@angular/forms';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { PageEvent } from '@angular/material/paginator';
import { AuthService } from '../../../core/services/auth.service';
import { jwtInterceptor } from '../../../core/interceptors/jwt.interceptor';
import { routes } from '../../../app.routes';
import { ViajesPasajeroService } from '../../../core/services/viajes-pasajero.service';
import { SolicitudesPasajeroService } from '../../../core/services/solicitudes-pasajero.service';
import { ViajePasajeroContextoService } from '../../../core/services/viaje-pasajero-contexto.service';
import { BuscarViaje } from './buscar-viaje/buscar-viaje';
import { MisViajes } from './mis-viajes/mis-viajes';
import { desdeBusqueda, desdeSolicitud, EstadoSolicitud } from './viajes.models';
import { busquedaFixture, solicitudFixture, historialFixture, pageFixture } from './viajes.testing';

const searchUrl = '/api/viajes/buscar/resumen';
const listUrl = '/api/solicitudes/resumen';
const historyUrl = '/api/solicitudes/historial';
const postUrl = '/api/solicitudes/viajes/74';
const cancelUrl = '/api/solicitudes/308/cancelar';
type SearchUI = { form: FormGroup; search(): void; page(event: PageEvent): void };
type ListUI = {
  estado: FormControl<EstadoSolicitud | ''>;
  vista: FormControl<string>;
  page(event: PageEvent): void;
};
type JoinUI = { form: FormGroup; enviar(): void; metodosPreferidos: readonly { id: number }[] };
type CancelUI = { confirmar(): void };

describe('Passenger trips REST integration', () => {
  let http: HttpTestingController;
  let auth: AuthService;
  let harness: RouterTestingHarness;
  let token: string;
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(withInterceptors([jwtInterceptor])),
        provideHttpClientTesting(),
        provideNoopAnimations(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    authenticate();
  });
  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
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
    auth.login({ correo: 'prueba@upc.edu.pe', contrasena: 'Password1!' }).subscribe();
    http.expectOne('/api/auth/login').flush({
      token,
      mensaje: 'OK',
      usuario: {
        id: 7,
        nombre: 'Pasajera',
        apellidos: 'Prueba',
        correo: 'prueba@upc.edu.pe',
        rol,
        cuentaVerificada: true,
      },
    });
    prepararPerfil();
  }
  async function render(path: string) {
    harness = await RouterTestingHarness.create(path);
    harness.detectChanges();
  }
  function root(): HTMLElement {
    return harness.routeNativeElement!;
  }
  function text() {
    return root().textContent ?? '';
  }
  function req(url: string) {
    return http.expectOne((r) => r.url === url);
  }
  function flushSearch(content = [busquedaFixture], page = 0, total = content.length, size = 10) {
    req(searchUrl).flush({
      viajes: pageFixture(content, page, total, size),
      mensaje: null,
      sugerencia: null,
    });
    harness.detectChanges();
  }
  function flushList(content = [solicitudFixture], page = 0, total = content.length, size = 10) {
    req(listUrl).flush({ solicitudes: pageFixture(content, page, total, size), mensaje: null });
    harness.detectChanges();
  }
  function button(label: string, scope: ParentNode = root()) {
    const found = Array.from(scope.querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent?.trim() === label,
    );
    expect(found, label).toBeTruthy();
    return found!;
  }
  function click(label: string, scope: ParentNode = root()) {
    button(label, scope).click();
    harness.detectChanges();
  }
  function searchUI() {
    return harness.fixture.debugElement.query(By.directive(BuscarViaje))
      .componentInstance as SearchUI;
  }
  function listUI() {
    return harness.fixture.debugElement.query(By.directive(MisViajes)).componentInstance as ListUI;
  }
  async function chosenTrip() {
    TestBed.inject(ViajePasajeroContextoService).seleccionar({
      viaje: desdeBusqueda(busquedaFixture),
    });
    await render('/pasajero/viajes/74');
    flushList([], 0, 0, 100);
  }
  async function pendingTrip() {
    await render('/pasajero/viajes/74');
    flushList();
  }
  function dialogRoot(): HTMLElement {
    return document.querySelector('mat-dialog-container')!;
  }
  function joinUI() {
    return TestBed.inject(MatDialog).openDialogs[0].componentInstance as JoinUI;
  }
  async function openJoin(methods: object[] = []) {
    await chosenTrip();
    click('Unirse al viaje');
    req('/api/metodos-compensacion').flush(methods);
    TestBed.tick();
    await harness.fixture.whenStable();
    harness.detectChanges();
    return joinUI();
  }
  async function openCancel() {
    await pendingTrip();
    click('Cancelar solicitud');
    TestBed.tick();
    await harness.fixture.whenStable();
    harness.detectChanges();
    return TestBed.inject(MatDialog).openDialogs[0].componentInstance as CancelUI;
  }

  it('GETs search on entry, adds JWT through the existing interceptor and renders only real DTO fields', async () => {
    await render('/pasajero/viajes/buscar?estado=exito');
    expect(text()).toContain('Buscando viajes');
    expect(root().querySelector('app-viaje-card')).toBeNull();
    const request = req(searchUrl);
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe('Bearer ' + token);
    expect(request.request.params.keys().sort()).toEqual(['cercania', 'page', 'size']);
    request.flush({
      viajes: pageFixture([busquedaFixture], 0, 31),
      mensaje: null,
      sugerencia: null,
    });
    harness.detectChanges();
    expect(text()).toContain('Campus Norte');
    expect(text()).toContain('Conductora Prueba');
    expect(text()).toContain('Capacidad total: 6');
    expect(text()).toContain('31 viajes');
    expect(text()).not.toContain('cupos libres');
    expect(text()).not.toContain('Juan');
  });
  it('sends trimmed optional filters, LocalTime and actual pagination metadata', async () => {
    await render('/pasajero/viajes/buscar');
    flushSearch();
    searchUI().form.setValue({
      origen: ' Campus ',
      destino: ' Biblioteca ',
      dia: 'Miercoles',
      hora: '00:05',
      cercania: true,
    });
    await vi.waitFor(() => {
      const r = req(searchUrl);
      expect(r.request.params.get('origen')).toBe('Campus');
      expect(r.request.params.get('destino')).toBe('Biblioteca');
      expect(r.request.params.get('dia')).toBe('Miercoles');
      expect(r.request.params.get('hora')).toBe('00:05');
      expect(r.request.params.get('cercania')).toBe('true');
      r.flush({
        viajes: pageFixture([busquedaFixture], 0, 31, 5),
        mensaje: null,
        sugerencia: null,
      });
    });
    searchUI().page({ pageIndex: 2, pageSize: 5, length: 31 });
    const r = req(searchUrl);
    expect(r.request.params.get('page')).toBe('2');
    expect(r.request.params.get('size')).toBe('5');
    r.flush({ viajes: pageFixture([], 2, 31, 5), mensaje: null, sugerencia: null });
    harness.detectChanges();
    expect(text()).toContain('31 viajes');
    expect(text()).toContain('7 páginas');
  });
  it('cancels obsolete search requests and removes stale results immediately', async () => {
    await render('/pasajero/viajes/buscar');
    const first = req(searchUrl);
    searchUI().form.controls['origen'].setValue('Nueva');
    expect(first.cancelled).toBe(true);
    let second = first;
    await vi.waitFor(() => {
      second = req(searchUrl);
    });
    searchUI().form.controls['origen'].setValue('Final');
    expect(second.cancelled).toBe(true);
    await vi.waitFor(() => {
      const third = req(searchUrl);
      third.flush({ viajes: pageFixture([busquedaFixture]), mensaje: null, sugerencia: null });
    });
    harness.detectChanges();
    expect(text()).toContain('Campus Norte');
    searchUI().form.controls['destino'].setValue('Otra');
    harness.detectChanges();
    expect(root().querySelector('app-viaje-card')).toBeNull();
    await harness.navigateByUrl('/pasajero/dashboard');
    http.expectNone(searchUrl);
  });
  it('does not send an invalid hour or duplicate an in-flight query', async () => {
    await render('/pasajero/viajes/buscar');
    const first = req(searchUrl);
    searchUI().search();
    http.expectNone(searchUrl);
    searchUI().form.controls['hora'].setValue('25:99');
    expect(first.cancelled).toBe(true);
    expect(searchUI().form.invalid).toBe(true);
    http.expectNone(searchUrl);
  });
  it('renders the empty message and suggestion received from the backend', async () => {
    await render('/pasajero/viajes/buscar');
    req(searchUrl).flush({
      viajes: pageFixture([]),
      mensaje: 'Sin coincidencias',
      sugerencia: 'Prueba otro horario',
    });
    harness.detectChanges();
    expect(text()).toContain('Sin coincidencias');
    expect(text()).toContain('Prueba otro horario');
    expect(root().querySelector('app-viaje-card')).toBeNull();
  });
  it.each([0, 400, 403, 404, 409, 500])(
    'handles search status %i safely and retries via real HTTP',
    async (status) => {
      await render('/pasajero/viajes/buscar');
      req(searchUrl).flush({ mensaje: 'SQL secret' }, { status, statusText: 'Failure' });
      harness.detectChanges();
      expect(text()).toContain('No se pudo buscar');
      expect(text()).not.toContain('SQL secret');
      click('Reintentar');
      flushSearch();
      expect(text()).toContain('Campus Norte');
    },
  );
  it('uses shared 401 logout and redirects without another protected request', async () => {
    await render('/pasajero/viajes/buscar');
    req(searchUrl).flush({}, { status: 401, statusText: 'Unauthorized' });
    await harness.fixture.whenStable();
    expect(auth.isAuthenticated()).toBe(false);
    expect(TestBed.inject(Router).url).toContain('/auth/login');
    http.expectNone(searchUrl);
  });
  it('retries the failed search page with the same filters and pagination', async () => {
    await render('/pasajero/viajes/buscar');
    flushSearch();
    searchUI().page({ pageIndex: 2, pageSize: 5, length: 31 });
    req(searchUrl).error(new ProgressEvent('error'));
    harness.detectChanges();
    click('Reintentar');
    const r = req(searchUrl);
    expect(r.request.params.get('page')).toBe('2');
    expect(r.request.params.get('size')).toBe('5');
    r.flush({ viajes: pageFixture([], 2, 31, 5), mensaje: null, sugerencia: null });
  });
  it('navigates from a real search result to detail and links US29 with the real id', async () => {
    await render('/pasajero/viajes/buscar');
    flushSearch();
    click('Ver más');
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/pasajero/viajes/74');
    const r = req(listUrl);
    expect(r.request.params.get('size')).toBe('100');
    r.flush({ solicitudes: pageFixture([]), mensaje: null });
    harness.detectChanges();
    expect(text()).toContain('Conductora Prueba');
    expect(text()).toContain('Ocupación no informada');
    expect(text()).toContain('Referencias de ruta');
    expect(root().querySelector('a[href="/contribucion/sugerencia/74"]')).toBeTruthy();
    expect(button('Unirse al viaje').disabled).toBe(false);
    http.expectNone('/api/viajes/74');
  });
  it('falls back clearly on a direct reload without recoverable detail and never invents GET by id', async () => {
    await render('/pasajero/viajes/74');
    flushList([], 0, 0, 100);
    expect(text()).toContain('No se pudo recuperar este detalle');
    expect(root().querySelector('a[href="/pasajero/viajes/buscar"]')).toBeTruthy();
    expect(text()).not.toContain('Campus Norte');
    http.expectNone('/api/viajes/74');
  });
  it.each(['0', '-2', 'abc', '9007199254740993'])(
    'rejects invalid route id %s without any HTTP',
    async (id) => {
      await render('/pasajero/viajes/' + id);
      expect(text()).toContain('No se pudo recuperar este detalle');
      http.expectNone(listUrl);
    },
  );
  it('recovers detail from own requests without inventing the driver or availability', async () => {
    await pendingTrip();
    expect(text()).toContain('Campus Norte');
    expect(text()).toContain('Información del conductor no disponible');
    expect(text()).not.toContain('Conductora Prueba');
    expect(text()).not.toContain('Capacidad total');
    expect(button('Cancelar solicitud')).toBeTruthy();
    expect(text()).not.toContain('Unirse al viaje');
  });
  it('bounds request recovery to one page and blocks actions if own request status is unknown', async () => {
    TestBed.inject(ViajePasajeroContextoService).seleccionar({
      viaje: desdeBusqueda(busquedaFixture),
    });
    await render('/pasajero/viajes/74');
    flushList([], 0, 205, 100);
    expect(text()).toContain('Verificación limitada');
    expect(text()).not.toContain('Unirse al viaje');
    http.expectNone(listUrl);
  });
  it('cancels obsolete detail requests when the route id changes', async () => {
    await render('/pasajero/viajes/74');
    const first = req(listUrl);
    await harness.navigateByUrl('/pasajero/viajes/75');
    expect(first.cancelled).toBe(true);
    flushList([], 0, 0, 100);
    expect(text()).not.toContain('Campus Norte');
  });
  it('retries a detail query without exposing stale data after HTTP failure', async () => {
    await render('/pasajero/viajes/74');
    req(listUrl).flush({}, { status: 500, statusText: 'Failure' });
    harness.detectChanges();
    expect(text()).toContain('No se pudo consultar');
    click('Reintentar');
    flushList();
    expect(text()).toContain('Campus Norte');
  });
  it('loads own requests, preserves four states and refreshes the actual filtered page', async () => {
    await render('/pasajero/viajes/mis-viajes');
    flushList(
      ['PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'CANCELADA'].map((estado, i) => ({
        ...solicitudFixture,
        id: 308 + i,
        estado: estado as EstadoSolicitud,
      })),
    );
    for (const label of ['Pendiente', 'Aceptada', 'Rechazada', 'Cancelada'])
      expect(text()).toContain(label);
    listUI().estado.setValue('RECHAZADA');
    const r = req(listUrl);
    expect(r.request.params.get('estado')).toBe('RECHAZADA');
    r.flush({
      solicitudes: pageFixture([{ ...solicitudFixture, estado: 'RECHAZADA' }], 0, 27, 5),
      mensaje: null,
    });
    harness.detectChanges();
    listUI().page({ pageIndex: 3, pageSize: 5, length: 27 });
    const next = req(listUrl);
    expect(next.request.params.get('page')).toBe('3');
    expect(next.request.params.get('size')).toBe('5');
    next.flush({ solicitudes: pageFixture([], 3, 27, 5), mensaje: 'Sin registros en esta página' });
    harness.detectChanges();
    expect(text()).toContain('27 solicitudes');
    expect(text()).toContain('Sin registros en esta página');
  });
  it('retries an empty/error request list with a new HTTP query', async () => {
    await render('/pasajero/viajes/mis-viajes');
    req(listUrl).error(new ProgressEvent('error'));
    harness.detectChanges();
    click('Reintentar');
    flushList([]);
    expect(text()).toContain('No hay solicitudes en esta página');
  });
  it('loads history and own penalties, keeps records read-only and reuses the exact source page', async () => {
    await render('/pasajero/viajes/mis-viajes');
    flushList();
    listUI().vista.setValue('historial');
    req(historyUrl).flush({ solicitudes: pageFixture([historialFixture]), mensaje: null });
    harness.detectChanges();
    expect(text()).toContain('Penalidad propia de prueba');
    expect(text()).toContain('COMPLETADO');
    click('Ver detalle');
    await harness.fixture.whenStable();
    req(historyUrl).flush({ solicitudes: pageFixture([historialFixture]), mensaje: null });
    harness.detectChanges();
    expect(text()).toContain('Solo lectura');
    expect(text()).not.toContain('Cancelar solicitud');
    expect(text()).not.toContain('Unirse al viaje');
  });
  it('retains request selection across a paginated list navigation', async () => {
    TestBed.inject(ViajePasajeroContextoService).seleccionar({
      viaje: desdeSolicitud(solicitudFixture),
      solicitud: solicitudFixture,
      consulta: { historial: false, estado: 'PENDIENTE', page: 3, size: 5 },
    });
    await render('/pasajero/viajes/74');
    const r = req(listUrl);
    expect(r.request.params.get('page')).toBe('3');
    expect(r.request.params.get('estado')).toBe('PENDIENTE');
    r.flush({ solicitudes: pageFixture([solicitudFixture], 3, 27, 5), mensaje: null });
    harness.detectChanges();
    expect(text()).toContain('Cancelar solicitud');
  });
  it('requires preference but permits optional null personal method', async () => {
    const ui = await openJoin();
    ui.enviar();
    http.expectNone(postUrl);
    expect(ui.form.invalid).toBe(true);
    ui.form.controls['preferencia'].setValue('FAVOR');
    ui.enviar();
    const r = req(postUrl);
    expect(r.request.method).toBe('POST');
    expect(r.request.body).toEqual({
      preferenciaCompensacion: 'FAVOR',
      metodoCompensacionId: null,
    });
    expect(r.request.headers.get('Authorization')).toBe('Bearer ' + token);
    r.flush({}, { status: 409, statusText: 'Conflict' });
  });
  it('filters personal methods to active matching types and rejects invalid selections', async () => {
    const ui = await openJoin([
      { id: 901, tipo: 'DINERO', descripcion: 'Transferencia', activo: true },
      { id: 902, tipo: 'DINERO', descripcion: 'Inactivo', activo: false },
      { id: 903, tipo: 'FAVOR', descripcion: 'Favor', activo: true },
    ]);
    ui.form.controls['preferencia'].setValue('DINERO');
    expect(ui.metodosPreferidos.map((m) => m.id)).toEqual([901]);
    for (const id of [902, 903, 999]) {
      ui.form.controls['metodo'].setValue(id);
      ui.enviar();
      http.expectNone(postUrl);
    }
    ui.form.controls['metodo'].setValue(901);
    ui.form.controls['mensaje'].setValue('  Hola conductor  ');
    ui.enviar();
    ui.enviar();
    const r = req(postUrl);
    expect(r.request.body).toEqual({
      preferenciaCompensacion: 'DINERO',
      metodoCompensacionId: 901,
      mensaje: 'Hola conductor',
    });
    http.expectNone(postUrl);
    r.flush({}, { status: 400, statusText: 'Bad Request' });
    expect(ui.form.controls['mensaje'].value).toBe('  Hola conductor  ');
  });
  it('allows null method after a methods lookup failure and offers actual retry', async () => {
    await chosenTrip();
    click('Unirse al viaje');
    req('/api/metodos-compensacion').error(new ProgressEvent('error'));
    TestBed.tick();
    click('Reintentar métodos', dialogRoot());
    req('/api/metodos-compensacion').flush([]);
    const ui = joinUI();
    ui.form.controls['preferencia'].setValue('GASOLINA');
    ui.enviar();
    const r = req(postUrl);
    expect(r.request.body.metodoCompensacionId).toBeNull();
    r.flush({}, { status: 409, statusText: 'Conflict' });
  });
  it('closes the dialog only after HTTP 201 and re-queries persisted state', async () => {
    const ui = await openJoin();
    ui.form.controls['preferencia'].setValue('DINERO');
    ui.enviar();
    ui.enviar();
    const r = req(postUrl);
    expect(TestBed.inject(MatDialog).openDialogs.length).toBe(1);
    expect(text()).not.toContain('Solicitud registrada correctamente');
    expect(TestBed.inject(MatDialog).openDialogs[0].disableClose).toBe(true);
    r.flush(solicitudFixture, { status: 201, statusText: 'Created' });
    await harness.fixture.whenStable();
    flushList();
    expect(text()).toContain('Solicitud registrada correctamente');
    expect(text()).toContain('Cancelar solicitud');
    expect(text()).not.toContain('Unirse al viaje');
  });
  it.each([0, 400, 403, 404, 409, 500])(
    'keeps the join dialog and values after POST status %i, with no false success',
    async (status) => {
      const ui = await openJoin();
      ui.form.patchValue({ preferencia: 'DINERO', mensaje: 'Conservar texto' });
      ui.enviar();
      const r = req(postUrl);
      if (status === 0) r.error(new ProgressEvent('error'));
      else r.flush({ mensaje: 'SQL secret' }, { status, statusText: 'Failure' });
      TestBed.tick();
      expect(ui.form.enabled).toBe(true);
      expect(ui.form.controls['mensaje'].value).toBe('Conservar texto');
      expect(TestBed.inject(MatDialog).openDialogs.length).toBe(1);
      expect(dialogRoot().textContent).not.toContain('SQL secret');
      expect(text()).not.toContain('Solicitud registrada correctamente');
      ui.enviar();
      req(postUrl).flush({}, { status: 409, statusText: 'Conflict' });
    },
  );
  it('does not DELETE or cancel anything when the confirmation dialog is dismissed', async () => {
    await openCancel();
    click('Conservar solicitud', dialogRoot());
    await harness.fixture.whenStable();
    http.expectNone((r) => r.method === 'PUT' || r.method === 'DELETE');
    expect(text()).toContain('Pendiente');
  });
  it('closes an obsolete dialog when the route id changes and does not submit the old trip', async () => {
    await openJoin();
    await harness.navigateByUrl('/pasajero/viajes/75');
    await harness.fixture.whenStable();
    flushList([], 0, 0, 100);
    expect(TestBed.inject(MatDialog).openDialogs.length).toBe(0);
    http.expectNone(postUrl);
    expect(text()).not.toContain('Campus Norte');
    expect(text()).not.toContain('Solicitud registrada correctamente');
  });
  it('handles a POST 401 through the shared interceptor, destroys the dialog and keeps no success', async () => {
    const ui = await openJoin();
    ui.form.controls['preferencia'].setValue('DINERO');
    ui.enviar();
    req(postUrl).flush({}, { status: 401, statusText: 'Unauthorized' });
    await harness.fixture.whenStable();
    expect(auth.isAuthenticated()).toBe(false);
    expect(TestBed.inject(Router).url).toContain('/auth/login');
    expect(TestBed.inject(MatDialog).openDialogs.length).toBe(0);
    http.expectNone(listUrl);
  });
  it('handles a cancellation 403 without clearing session or hiding the pending request', async () => {
    const ui = await openCancel();
    ui.confirmar();
    req(cancelUrl).flush({}, { status: 403, statusText: 'Forbidden' });
    TestBed.tick();
    expect(dialogRoot().textContent).toContain('No tienes permiso');
    expect(auth.isAuthenticated()).toBe(true);
    expect(text()).toContain('Pendiente');
    expect(text()).not.toContain('Solicitud cancelada correctamente');
  });
  it('cancels only the confirmed request id, blocks duplicate PUTs and refreshes persisted state', async () => {
    const ui = await openCancel();
    ui.confirmar();
    ui.confirmar();
    const r = req(cancelUrl);
    expect(r.request.method).toBe('PUT');
    expect(r.request.body).toEqual({});
    http.expectNone('/api/viajes/74/cancelar');
    http.expectNone('/api/solicitudes/74/cancelar');
    http.expectNone(cancelUrl);
    const cancelled = { ...solicitudFixture, estado: 'CANCELADA' as const };
    r.flush(cancelled);
    await harness.fixture.whenStable();
    flushList([cancelled]);
    expect(text()).toContain('Solicitud cancelada correctamente');
    expect(text()).toContain('Cancelada');
  });
  it.each([0, 409, 500])(
    'retains the request after cancellation status %i and allows a real retry',
    async (status) => {
      const ui = await openCancel();
      ui.confirmar();
      const r = req(cancelUrl);
      if (status === 0) r.error(new ProgressEvent('error'));
      else r.flush({}, { status, statusText: 'Failure' });
      TestBed.tick();
      expect(dialogRoot().textContent).toContain('No se pudo cancelar');
      expect(text()).toContain('Pendiente');
      ui.confirmar();
      req(cancelUrl).flush({}, { status: 409, statusText: 'Conflict' });
    },
  );
  it('handles a missing request by offering refresh, without pretending it was cancelled', async () => {
    const ui = await openCancel();
    ui.confirmar();
    req(cancelUrl).flush({}, { status: 404, statusText: 'Not Found' });
    TestBed.tick();
    click('Actualizar datos', dialogRoot());
    await harness.fixture.whenStable();
    flushList([]);
    expect(text()).not.toContain('Solicitud cancelada correctamente');
  });
  it('never wires accepted requests to whole-trip cancellation', async () => {
    await render('/pasajero/viajes/74');
    flushList([{ ...solicitudFixture, estado: 'ACEPTADA' }]);
    expect(text()).not.toContain('Cancelar solicitud');
    expect(text()).not.toContain('Unirse al viaje');
    http.expectNone((r) => r.method === 'PUT');
  });
  it('clears ephemeral selected details when the authenticated session changes', () => {
    const context = TestBed.inject(ViajePasajeroContextoService);
    context.seleccionar({ viaje: desdeBusqueda(busquedaFixture) });
    expect(context.obtener(74)).toBeDefined();
    auth.clearSession();
    expect(context.obtener(74)).toBeUndefined();
    authenticate();
    expect(context.obtener(74)).toBeUndefined();
  });
  it.each(['anonymous', 'CONDUCTOR'])(
    'preserves role guards for %s without passenger HTTP access',
    async (role) => {
      if (role === 'anonymous') auth.clearSession();
      else authenticate(role);
      await render('/pasajero/viajes/buscar');
      expect(TestBed.inject(Router).url).toBe(
        role === 'anonymous' ? '/auth/login' : '/conductor/dashboard',
      );
      http.expectNone(searchUrl);
    },
  );
  it('uses existing typed services for optional filters and history pagination', () => {
    TestBed.inject(ViajesPasajeroService)
      .buscar({ origen: ' ', destino: '', cercania: false }, 2, 20)
      .subscribe();
    const search = req(searchUrl);
    expect(search.request.params.has('origen')).toBe(false);
    expect(search.request.params.has('destino')).toBe(false);
    search.flush({ viajes: pageFixture([]), mensaje: null, sugerencia: null });
    TestBed.inject(SolicitudesPasajeroService).historial(3, 5).subscribe();
    const history = req(historyUrl);
    expect(history.request.params.get('page')).toBe('3');
    expect(history.request.params.get('size')).toBe('5');
    expect(history.request.headers.get('Authorization')).toBe('Bearer ' + token);
    history.flush({ solicitudes: pageFixture([]), mensaje: null });
  });
});
