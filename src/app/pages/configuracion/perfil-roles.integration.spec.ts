import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { jwtInterceptor } from '../../core/interceptors/jwt.interceptor';
import { AuthService } from '../../core/services/auth.service';
import { PerfilService } from '../../core/services/perfil.service';
import { perfilCompleto, fechaLocalValida, PerfilRespuesta } from '../../core/models/perfil.models';
import { RoleType } from '../../core/models/auth.models';
import { PerfilComponent } from '../auth/perfil/perfil';
import { InfoAdicionalComponent } from '../auth/info-adicional/info-adicional';
import { LoginComponent } from '../auth/login/login';
import { RoleSelector } from '../../shared/role-selector/role-selector';
import { PERFIL_TEST, prepararPerfil } from '../../testing/perfil-fixtures';

describe('US03-US05 profile, onboarding and shared navigation', () => {
  let http: HttpTestingController;
  let auth: AuthService;
  let harness: RouterTestingHarness;
  let token: string;
  const user = {
    id: 7,
    nombre: 'Nombre',
    apellidos: 'Prueba',
    correo: 'perfil@upc.edu.pe',
    cuentaVerificada: true,
  };
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
    login();
  });
  afterEach(() => {
    http.verify();
    auth.clearSession();
    localStorage.clear();
    sessionStorage.clear();
  });
  function login(rol: RoleType = 'CONDUCTOR') {
    token =
      'eyJhbGciOiJIUzI1NiJ9.' +
      btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })) +
      '.signature';
    auth.login({ correo: user.correo, contrasena: 'Password1!' }).subscribe();
    http.expectOne('/api/auth/login').flush({ token, mensaje: 'OK', usuario: { ...user, rol } });
  }
  async function open(
    path = '/configuracion/perfil',
    profile: PerfilRespuesta | null = PERFIL_TEST,
    status = 200,
    message = 'Aún no has completado tu perfil',
  ) {
    const navigation = RouterTestingHarness.create(path);
    await vi.waitFor(() => {
      const req = http.expectOne('/api/perfil');
      expect(req.request.headers.get('Authorization')).toBe('Bearer ' + token);
      expect(req.request.params.keys()).toEqual([]);
      if (status === 0) req.error(new ProgressEvent('error'));
      else
        req.flush(status === 200 ? profile : { mensaje: message }, {
          status,
          statusText: status === 200 ? 'OK' : 'Failure',
        });
    });
    harness = await navigation;
    harness.detectChanges();
  }
  function text(): string {
    return harness.routeNativeElement!.textContent ?? '';
  }
  function perfil() {
    return harness.fixture.debugElement.query(By.directive(PerfilComponent))
      .componentInstance as PerfilComponent;
  }
  function info() {
    return harness.fixture.debugElement.query(By.directive(InfoAdicionalComponent))
      .componentInstance as InfoAdicionalComponent;
  }
  function selector() {
    return harness.fixture.debugElement.query(By.directive(RoleSelector))
      .componentInstance as RoleSelector;
  }
  function click(label: string) {
    const button = Array.from(
      harness.routeNativeElement!.querySelectorAll<HTMLButtonElement>('button'),
    ).find((b) => b.textContent?.trim() === label);
    expect(button, label).toBeTruthy();
    button!.click();
    harness.detectChanges();
  }

  it('loads the real profile, including custom text outside the suggestion catalogs', async () => {
    await open();
    expect(perfil().perfilForm.controls.carrera.value).toBe(PERFIL_TEST.carrera);
    expect(perfil().perfilForm.controls.diasDisponibles.value).toBe('Lunes, Miércoles');
    expect(perfil().onboarding()).toBe(false);
    expect(text()).not.toContain('Saltar por ahora');
  });
  it('saves the complete PUT payload, local dates and selected days; updates the visible session name only after success', async () => {
    await open();
    const c = perfil();
    c.perfilForm.controls.nombre.setValue('  Nombre editado  ');
    c.toggleDia(c.diasSemana[6]);
    c.guardar();
    c.guardar();
    const req = http.expectOne('/api/perfil');
    expect(req.request.method).toBe('PUT');
    expect(req.request.headers.get('Authorization')).toBe('Bearer ' + token);
    expect(req.request.body).toEqual({
      nombre: 'Nombre editado',
      apellidos: PERFIL_TEST.apellidos,
      carrera: PERFIL_TEST.carrera,
      distrito: PERFIL_TEST.distrito,
      universidad: PERFIL_TEST.universidad,
      diasDisponibles: 'Lunes, Miércoles, Domingo',
      horariosDisponibles: PERFIL_TEST.horariosDisponibles,
      fechaInicioClases: '2026-08-04',
      fechaFinClases: '2026-12-19',
      metodoCompensacionFavorito: 'GASOLINA',
    });
    expect(auth.currentUser()?.nombre).toBe('Nombre');
    expect(c.success()).toBe('');
    req.flush({ ...PERFIL_TEST, ...req.request.body });
    harness.detectChanges();
    expect(auth.currentUser()?.nombre).toBe('Nombre editado');
    expect(text()).toContain('Tu perfil se guardó correctamente');
    expect(auth.getToken()).toBe(token);
    expect(c.perfilForm.enabled).toBe(true);
    http.expectNone('/api/perfil');
  });
  it.each([
    'nombre',
    'apellidos',
    'carrera',
    'distrito',
    'universidad',
    'diasDisponibles',
    'horariosDisponibles',
  ])('rejects whitespace-only %s without PUT', async (field) => {
    await open();
    perfil().perfilForm.get(field)!.setValue('   ');
    perfil().guardar();
    expect(perfil().perfilForm.invalid).toBe(true);
    http.expectNone((r) => r.method === 'PUT');
  });
  it.each([
    ['2026-12-20', '2026-08-01'],
    ['2026-02-30', '2026-12-19'],
    ['', '2026-12-19'],
  ])('rejects invalid academic dates %s / %s', async (start, end) => {
    await open();
    perfil().perfilForm.patchValue({ fechaInicioClases: start, fechaFinClases: end });
    perfil().guardar();
    expect(perfil().perfilForm.invalid).toBe(true);
    http.expectNone((r) => r.method === 'PUT');
  });
  it('requires a real compensation type for conductor and rejects obsolete values', async () => {
    await open();
    for (const value of [null, 'YAPE_PLIN', 'EFECTIVO']) {
      perfil().perfilForm.controls.metodoCompensacionFavorito.setValue(value as never);
      perfil().guardar();
      expect(perfil().perfilForm.invalid).toBe(true);
      http.expectNone((r) => r.method === 'PUT');
    }
  });
  it('permits null favorite compensation for passenger and sends it explicitly', async () => {
    login('PASAJERO');
    await open('/configuracion/perfil', { ...PERFIL_TEST, metodoCompensacionFavorito: null });
    expect(perfil().perfilForm.valid).toBe(true);
    perfil().guardar();
    const req = http.expectOne('/api/perfil');
    expect(req.request.body.metodoCompensacionFavorito).toBeNull();
    req.flush({ ...PERFIL_TEST, metodoCompensacionFavorito: null });
  });
  it.each([0, 400, 403, 409, 500])(
    'retains profile values and old session name after PUT error %i',
    async (status) => {
      await open();
      perfil().perfilForm.controls.nombre.setValue('Conservar edición');
      perfil().guardar();
      const req = http.expectOne('/api/perfil');
      if (!status) req.error(new ProgressEvent('error'));
      else
        req.flush(
          { mensaje: 'SQL secret', campos: status === 400 ? { nombre: 'Invalid' } : undefined },
          { status, statusText: 'Failure' },
        );
      harness.detectChanges();
      expect(perfil().perfilForm.controls.nombre.value).toBe('Conservar edición');
      expect(auth.currentUser()?.nombre).toBe('Nombre');
      expect(perfil().perfilForm.enabled).toBe(true);
      expect(perfil().success()).toBe('');
      expect(text()).not.toContain('SQL secret');
      if (status === 400)
        expect(perfil().perfilForm.controls.nombre.hasError('servidor')).toBe(true);
    },
  );
  it('routes a new user to mandatory profile without confusing 404 with failed authentication', async () => {
    await open('/conductor/dashboard', null, 404);
    expect(TestBed.inject(Router).url).toBe('/configuracion/perfil');
    expect(auth.isAuthenticated()).toBe(true);
    expect(perfil().perfilForm.controls.nombre.value).toBe(user.nombre);
    expect(perfil().perfilForm.controls.carrera.value).toBe('');
    expect(perfil().perfilForm.invalid).toBe(true);
    expect(text()).not.toContain('Saltar por ahora');
    await harness.navigateByUrl('/conductor/rutas');
    expect(TestBed.inject(Router).url).toBe('/configuracion/perfil');
    http.expectNone('/api/rutas');
    await harness.navigateByUrl('/configuracion/info-adicional');
    expect(TestBed.inject(Router).url).toBe('/configuracion/perfil');
    http.expectNone('/api/perfil');
  });
  it('creates the mandatory profile then offers optional information and allows continuing to dashboard', async () => {
    login('PASAJERO');
    await open('/pasajero/dashboard', null, 404);
    const c = perfil();
    const { id, gustos, hobbies, datosCuriosos, fechaActualizacion, ...request } = PERFIL_TEST;
    c.perfilForm.setValue({ ...request, metodoCompensacionFavorito: null });
    c.guardar();
    http
      .expectOne('/api/perfil')
      .flush({
        ...PERFIL_TEST,
        metodoCompensacionFavorito: null,
        gustos: null,
        hobbies: null,
        datosCuriosos: null,
      });
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/configuracion/info-adicional');
    expect(info().infoForm.invalid).toBe(true);
    const link = harness.routeNativeElement!.querySelector<HTMLAnchorElement>(
      'a[href="/pasajero/dashboard"]',
    );
    expect(link).toBeTruthy();
    link!.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/pasajero/dashboard');
    http.expectNone('/api/perfil');
  });
  it('lets an existing complete profile enter dashboard without onboarding or duplicate GET', async () => {
    await open('/conductor/dashboard');
    expect(TestBed.inject(Router).url).toBe('/conductor/dashboard');
    await harness.navigateByUrl('/configuracion/perfil');
    http.expectNone('/api/perfil');
    expect(perfil().onboarding()).toBe(false);
  });
  it.each([0, 403, 404, 500])(
    'distinguishes profile lookup error %i from missing profile and retries without a loop',
    async (status) => {
      await open('/conductor/dashboard', null, status, 'Recurso no encontrado');
      expect(TestBed.inject(Router).url).toBe('/configuracion/perfil');
      expect(perfil().loadError()).not.toBe('');
      expect(perfil().perfilForm.disabled).toBe(true);
      expect(perfil().onboarding()).toBe(false);
      expect(auth.isAuthenticated()).toBe(true);
      click('Reintentar');
      http.expectOne('/api/perfil').flush(PERFIL_TEST);
      harness.detectChanges();
      expect(perfil().perfilForm.enabled).toBe(true);
    },
  );
  it('honors 401 on profile lookup through the existing logout interceptor', async () => {
    await open('/conductor/dashboard', null, 401);
    expect(auth.isAuthenticated()).toBe(false);
    expect(TestBed.inject(Router).url).toBe('/auth/login');
  });
  it('loads additional info, edits chips and PUTs only the supported three fields', async () => {
    await open('/configuracion/info-adicional');
    const c = info();
    expect(c.infoForm.controls.gustos.value).toBe(PERFIL_TEST.gustos);
    c.infoForm.controls.gustos.setValue('  Podcasts  ');
    c.addHobbyTag('Nuevo hobby');
    c.guardar();
    c.guardar();
    const req = http.expectOne('/api/perfil/info-adicional');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      gustos: 'Podcasts',
      hobbies: PERFIL_TEST.hobbies + ', Nuevo hobby',
      datosCuriosos: PERFIL_TEST.datosCuriosos,
    });
    expect(req.request.headers.get('Authorization')).toBe('Bearer ' + token);
    expect(c.success()).toBe('');
    req.flush({ ...PERFIL_TEST, ...req.request.body });
    harness.detectChanges();
    expect(text()).toContain('Tu información adicional se guardó correctamente');
    expect(c.infoForm.enabled).toBe(true);
    http.expectNone('/api/perfil/info-adicional');
  });
  it.each(['gustos', 'hobbies', 'datosCuriosos'])(
    'requires resulting additional field %s even though request DTO fields are optional',
    async (field) => {
      await open('/configuracion/info-adicional', {
        ...PERFIL_TEST,
        gustos: null,
        hobbies: null,
        datosCuriosos: null,
      });
      info().infoForm.setValue({ gustos: 'Gusto', hobbies: 'Hobby', datosCuriosos: 'Dato' });
      info().infoForm.get(field)!.setValue(' ');
      info().guardar();
      expect(info().infoForm.invalid).toBe(true);
      http.expectNone('/api/perfil/info-adicional');
    },
  );
  it.each([0, 400, 403, 500])(
    'retains additional information after HTTP %i and allows editing/retry',
    async (status) => {
      await open('/configuracion/info-adicional');
      info().infoForm.controls.gustos.setValue('Conservar gustos');
      info().guardar();
      const req = http.expectOne('/api/perfil/info-adicional');
      if (!status) req.error(new ProgressEvent('error'));
      else req.flush({ mensaje: 'Sensitive secret' }, { status, statusText: 'Failure' });
      expect(info().infoForm.controls.gustos.value).toBe('Conservar gustos');
      expect(info().infoForm.enabled).toBe(true);
      expect(info().success()).toBe('');
      info().guardar();
      http
        .expectOne('/api/perfil/info-adicional')
        .flush({ ...PERFIL_TEST, gustos: 'Conservar gustos' });
    },
  );
  it.each(['CONDUCTOR', 'PASAJERO'] as const)(
    'changes from %s using the same JWT and reactive navigation',
    async (initial) => {
      login(initial);
      prepararPerfil();
      harness = await RouterTestingHarness.create('/configuracion');
      const target = initial === 'CONDUCTOR' ? 'PASAJERO' : 'CONDUCTOR';
      const role = selector();
      role.cambiar(target);
      role.cambiar(target);
      const req = http.expectOne('/api/usuarios/rol');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ rol: target });
      expect(req.request.headers.get('Authorization')).toBe('Bearer ' + token);
      expect(auth.currentRole()).toBe(initial);
      expect(auth.changingRole()).toBe(true);
      req.flush({ ...user, rol: target });
      await harness.fixture.whenStable();
      harness.detectChanges();
      expect(auth.currentRole()).toBe(target);
      expect(auth.isAuthenticated()).toBe(true);
      expect(auth.getToken()).toBe(token);
      expect(sessionStorage.getItem('uniride_token')).toBe(token);
      expect(auth.changingRole()).toBe(false);
      expect(TestBed.inject(Router).url).toBe(
        target === 'CONDUCTOR' ? '/conductor/dashboard' : '/pasajero/dashboard',
      );
      expect(
        harness.routeNativeElement!.querySelector(
          target === 'CONDUCTOR' ? 'app-conductor-layout' : 'app-pasajero-layout',
        ) ??
          harness.routeNativeElement!.matches(
            target === 'CONDUCTOR' ? 'app-conductor-layout' : 'app-pasajero-layout',
          ),
      ).toBeTruthy();
    },
  );
  it.each([0, 400, 403, 500])(
    'keeps the former role and token after role error %i',
    async (status) => {
      prepararPerfil();
      harness = await RouterTestingHarness.create('/configuracion');
      selector().cambiar('PASAJERO');
      const req = http.expectOne('/api/usuarios/rol');
      if (!status) req.error(new ProgressEvent('error'));
      else req.flush({}, { status, statusText: 'Failure' });
      harness.detectChanges();
      expect(auth.currentRole()).toBe('CONDUCTOR');
      expect(auth.getToken()).toBe(token);
      expect(auth.changingRole()).toBe(false);
      expect(selector().error()).not.toBe('');
    },
  );
  it('uses shared logout on role 401 without retaining the selector request', async () => {
    prepararPerfil();
    harness = await RouterTestingHarness.create('/configuracion');
    selector().cambiar('PASAJERO');
    http.expectOne('/api/usuarios/rol').flush({}, { status: 401, statusText: 'Unauthorized' });
    await harness.fixture.whenStable();
    expect(auth.isAuthenticated()).toBe(false);
    expect(TestBed.inject(Router).url).toBe('/auth/login');
  });
  it('does not accept a role response for another account or an obsolete session', () => {
    const error = vi.fn();
    auth.cambiarRol('PASAJERO').subscribe({ error });
    http.expectOne('/api/usuarios/rol').flush({ ...user, id: 999, rol: 'PASAJERO' });
    expect(error).toHaveBeenCalled();
    expect(auth.currentRole()).toBe('CONDUCTOR');
    auth.cambiarRol('PASAJERO').subscribe({ error });
    const req = http.expectOne('/api/usuarios/rol');
    auth.clearSession();
    req.flush({ ...user, rol: 'PASAJERO' });
    expect(auth.isAuthenticated()).toBe(false);
  });
  it('centrally prevents concurrent role requests even across selector instances', () => {
    auth.cambiarRol('PASAJERO').subscribe();
    const error = vi.fn();
    auth.cambiarRol('PASAJERO').subscribe({ error });
    expect(error).toHaveBeenCalled();
    http.expectOne('/api/usuarios/rol').flush({ ...user, rol: 'PASAJERO' });
  });
  it('requires a conductor favorite after switching from a completed passenger profile with null favorite', async () => {
    login('PASAJERO');
    await open('/pasajero/dashboard', { ...PERFIL_TEST, metodoCompensacionFavorito: null });
    selector().cambiar('CONDUCTOR');
    http.expectOne('/api/usuarios/rol').flush({ ...user, rol: 'CONDUCTOR' });
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/configuracion/perfil');
    expect(perfil().perfilForm.invalid).toBe(true);
    expect(auth.isConductor()).toBe(true);
  });
  it.each(['CONDUCTOR', 'PASAJERO'] as const)(
    'shares report and compensation screens using the %s layout',
    async (role) => {
      login(role);
      prepararPerfil();
      harness = await RouterTestingHarness.create('/reportes/resumen');
      http
        .expectOne('/api/estadisticas')
        .flush({
          viajesComoConductor: 0,
          viajesComoPasajero: 0,
          viajesCancelados: 0,
          penalidadesAcumuladas: 0,
        });
      harness.detectChanges();
      const activeLayout = role === 'CONDUCTOR' ? 'app-conductor-layout' : 'app-pasajero-layout';
      expect(harness.routeNativeElement!.querySelector(activeLayout)).toBeTruthy();
      expect(!!harness.routeNativeElement!.querySelector('a[href="/reportes/rutas"]')).toBe(
        role === 'CONDUCTOR',
      );
      await harness.navigateByUrl('/reportes/frecuencia');
      http
        .expectOne('/api/estadisticas/semana')
        .flush({
          suficientesDatos: false,
          mensaje: 'Sin datos',
          viajesPorDia: [],
          canceladosPorMi: 0,
          canceladosPorTerceros: 0,
        });
      await harness.navigateByUrl('/reportes/exportar');
      http.expectNone('/api/historial/pdf');
      await harness.navigateByUrl('/compensaciones/metodos');
      const req = http.expectOne('/api/metodos-compensacion');
      expect(req.request.headers.get('Authorization')).toBe('Bearer ' + token);
      req.flush([]);
      expect(harness.routeNativeElement!.querySelector(activeLayout)).toBeTruthy();
      expect(harness.routeNativeElement!.querySelector('a[href="/configuracion"]')).toBeTruthy();
    },
  );
  it('keeps ranking restricted to conductor after a successful role change', async () => {
    prepararPerfil();
    auth.cambiarRol('PASAJERO').subscribe();
    http.expectOne('/api/usuarios/rol').flush({ ...user, rol: 'PASAJERO' });
    harness = await RouterTestingHarness.create('/reportes/rutas');
    expect(TestBed.inject(Router).url).toBe('/pasajero/dashboard');
    http.expectNone('/api/estadisticas/rutas');
  });
  it('redirects legacy profile URLs to the single settings route', async () => {
    await open('/auth/perfil');
    expect(TestBed.inject(Router).url).toBe('/configuracion/perfil');
    await harness.navigateByUrl('/auth/info-adicional');
    expect(TestBed.inject(Router).url).toBe('/configuracion/info-adicional');
    http.expectNone('/api/perfil');
  });
  it('checks restored sessions before querying their profile, with one coalesced request', async () => {
    auth.clearSession();
    sessionStorage.setItem('uniride_token', token);
    const navigation = RouterTestingHarness.create('/pasajero/dashboard');
    await vi.waitFor(() => http.expectOne('/api/usuarios/me').flush({ ...user, rol: 'PASAJERO' }));
    await vi.waitFor(() => http.expectOne('/api/perfil').flush(PERFIL_TEST));
    harness = await navigation;
    expect(TestBed.inject(Router).url).toBe('/pasajero/dashboard');
    http.expectNone('/api/perfil');
  });
  it('checks onboarding after actual login without changing the registration/OTP contract', async () => {
    auth.clearSession();
    harness = await RouterTestingHarness.create('/auth/login');
    const component = harness.fixture.debugElement.query(By.directive(LoginComponent))
      .componentInstance as LoginComponent;
    component.loginForm.setValue({
      correo: user.correo,
      contrasena: 'Password1!',
      recordarDispositivo: false,
    });
    component.onSubmit();
    http
      .expectOne('/api/auth/login')
      .flush({ token, mensaje: 'OK', usuario: { ...user, rol: 'PASAJERO' } });
    await vi.waitFor(() =>
      http
        .expectOne('/api/perfil')
        .flush(
          { mensaje: 'Aún no has completado tu perfil' },
          { status: 404, statusText: 'Not Found' },
        ),
    );
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/configuracion/perfil');
    expect(auth.isAuthenticated()).toBe(true);
  });
  it('leaves the ranking on a confirmed switch to passenger without another ranking request', async () => {
    prepararPerfil();
    harness = await RouterTestingHarness.create('/reportes/rutas');
    http
      .expectOne('/api/estadisticas/rutas')
      .flush({ suficientesDatos: false, mensaje: 'Sin datos', ranking: [] });
    selector().cambiar('PASAJERO');
    http.expectOne('/api/usuarios/rol').flush({ ...user, rol: 'PASAJERO' });
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/pasajero/dashboard');
    http.expectNone('/api/estadisticas/rutas');
  });
  it('preserves shared compensation navigation after switching roles there', async () => {
    prepararPerfil();
    harness = await RouterTestingHarness.create('/compensaciones/metodos');
    http.expectOne('/api/metodos-compensacion').flush([]);
    selector().cambiar('PASAJERO');
    http.expectOne('/api/usuarios/rol').flush({ ...user, rol: 'PASAJERO' });
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/pasajero/dashboard');
    await harness.navigateByUrl('/compensaciones/metodos');
    http.expectOne('/api/metodos-compensacion').flush([]);
    expect(harness.routeNativeElement!.querySelector('app-pasajero-layout')).toBeTruthy();
  });
  it('isolates cached profiles between sessions and ignores late profile responses', () => {
    const service = TestBed.inject(PerfilService);
    const error = vi.fn();
    service.obtener().subscribe({ error });
    const req = http.expectOne('/api/perfil');
    auth.clearSession();
    login('PASAJERO');
    req.flush(PERFIL_TEST);
    expect(error).toHaveBeenCalled();
    service.obtener().subscribe();
    http.expectOne('/api/perfil').flush({ ...PERFIL_TEST, carrera: 'Otra carrera' });
    expect(service.perfil()?.carrera).toBe('Otra carrera');
  });
  it('validates calendar dates without UTC conversion and checks role-dependent completeness', () => {
    expect(fechaLocalValida('2024-02-29')).toBe(true);
    expect(fechaLocalValida('2026-02-29')).toBe(false);
    expect(fechaLocalValida('2026-11-06')).toBe(true);
    expect(fechaLocalValida('2026-13-01')).toBe(false);
    expect(perfilCompleto({ ...PERFIL_TEST, metodoCompensacionFavorito: null }, 'PASAJERO')).toBe(
      true,
    );
    expect(perfilCompleto({ ...PERFIL_TEST, metodoCompensacionFavorito: null }, 'CONDUCTOR')).toBe(
      false,
    );
  });
});
