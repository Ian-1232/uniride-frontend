import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { routes } from '../../../../app.routes';
import { AuthService } from '../../../../core/services/auth.service';
import { jwtInterceptor } from '../../../../core/interceptors/jwt.interceptor';
import { ViajeRespuesta } from '../../../../core/models/coordinacion.models';
import { prepararPerfil } from '../../../../testing/perfil-fixtures';
import { resolverDashboardVacio } from '../../../../testing/dashboard-fixtures';
import { ReprogramarViaje } from './reprogramar-viaje';
import { ConfirmarImpactoDialog } from '../../rutas/confirmar-impacto-dialog/confirmar-impacto-dialog';
import {
  AHORA_REPROGRAMAR,
  NUEVA_SALIDA,
  paginaReprogramar,
  RUTA_REPROGRAMAR,
  VIAJE_REPROGRAMADO,
  VIAJE_REPROGRAMAR,
} from './reprogramar-viaje.testing';

describe('US07 trip rescheduling with authenticated REST', () => {
  let http: HttpTestingController;
  let auth: AuthService;
  let h: RouterTestingHarness;
  let c: ReprogramarViaje;
  let token: string;
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(AHORA_REPROGRAMAR);
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        provideHttpClient(withInterceptors([jwtInterceptor])),
        provideHttpClientTesting(),
        provideNoopAnimations(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    login();
  });
  afterEach(() => {
    try {
      resolverDashboardVacio(http);
      http.verify();
    } finally {
      TestBed.inject(MatDialog).closeAll();
      auth.clearSession();
      localStorage.clear();
      sessionStorage.clear();
      vi.restoreAllMocks();
    }
  });
  function login(rol: 'CONDUCTOR' | 'PASAJERO' = 'CONDUCTOR') {
    token =
      'eyJhbGciOiJIUzI1NiJ9.' +
      btoa(JSON.stringify({ exp: AHORA_REPROGRAMAR / 1000 + 3600 })) +
      '.signature';
    auth.login({ correo: 'reprogramar@upc.edu.pe', contrasena: 'Password1!' }).subscribe();
    http.expectOne('/api/auth/login').flush({
      token,
      usuario: {
        id: 7,
        nombre: 'Prueba',
        correo: 'reprogramar@upc.edu.pe',
        cuentaVerificada: true,
        rol,
      },
    });
    prepararPerfil();
  }
  async function open(path = '/conductor/viajes/74/editar') {
    h = await RouterTestingHarness.create(path);
    h.detectChanges();
    c = h.fixture.debugElement.query(By.directive(ReprogramarViaje))?.componentInstance;
  }
  function req(url: string) {
    return http.expectOne((r) => r.url === url);
  }
  function cargar(viaje: ViajeRespuesta = VIAJE_REPROGRAMAR, aceptados = 0) {
    const rutas = req('/api/rutas');
    expect(rutas.request.headers.get('Authorization')).toBe('Bearer ' + token);
    rutas.flush(paginaReprogramar([RUTA_REPROGRAMAR]));
    req('/api/rutas/9/viajes').flush(paginaReprogramar([viaje]));
    const solicitudes = req('/api/viajes/' + viaje.id + '/solicitudes');
    expect(solicitudes.request.params.get('estado')).toBe('ACEPTADA');
    expect(solicitudes.request.params.get('size')).toBe('1');
    solicitudes.flush(paginaReprogramar([], aceptados, 0, 1));
    h.detectChanges();
  }
  function text() {
    return h.routeNativeElement!.textContent ?? '';
  }
  function cambiar() {
    c.form.setValue(NUEVA_SALIDA);
    h.detectChanges();
  }
  function put(confirmado = false) {
    const r = req('/api/viajes/74');
    expect(r.request.method).toBe('PUT');
    expect(r.request.params.get('confirmarImpacto')).toBe(String(confirmado));
    expect(r.request.headers.get('Authorization')).toBe('Bearer ' + token);
    expect(r.request.body).toEqual(NUEVA_SALIDA);
    return r;
  }
  function dialog() {
    return TestBed.inject(MatDialog).openDialogs[0].componentInstance as ConfirmarImpactoDialog;
  }
  async function cerrarDialogo(confirmar: boolean) {
    if (confirmar) dialog().confirmar();
    else dialog().cancelar();
    await h.fixture.whenStable();
    TestBed.tick();
  }

  it('loads the real trip on direct URL/reload and prefills only date and time without an invented GET by id', async () => {
    await open();
    expect(text()).toContain('Cargando viaje');
    cargar();
    expect(c.form.getRawValue()).toEqual({
      fecha: VIAJE_REPROGRAMAR.fecha,
      hora: VIAJE_REPROGRAMAR.hora,
    });
    expect(text()).toContain('Origen de prueba');
    expect(text()).toContain('08/11/2026 · 10:00:30');
    expect(Object.keys(c.form.controls)).toEqual(['fecha', 'hora']);
    http.expectNone('/api/viajes/74');
    expect(c.sinCambios()).toBe(true);
  });
  it.each([
    { fecha: '', hora: '14:30' },
    { fecha: '2026-11-10', hora: '' },
    { fecha: '2026-02-30', hora: '14:30' },
    { fecha: '2026-11-10', hora: '24:00' },
    { fecha: '2026-11-05', hora: '15:00' },
    { fecha: '2026-11-06', hora: '21:59:59' },
  ])('does not PUT invalid departure $fecha $hora', async (salida) => {
    await open();
    cargar();
    c.form.setValue(salida);
    c.guardar();
    h.detectChanges();
    expect(c.form.invalid).toBe(true);
    http.expectNone((r) => r.method === 'PUT' || r.url === '/api/rutas');
  });
  it('does not PUT an unchanged LocalTime or normalize its seconds into a false change', async () => {
    await open();
    cargar({ ...VIAJE_REPROGRAMAR, hora: '10:00:00' });
    c.form.controls.hora.setValue('10:00');
    c.guardar();
    expect(c.aviso()).toContain('No hay cambios');
    http.expectNone((r) => r.method === 'PUT' || r.url === '/api/rutas');
  });
  it('saves a trip without accepted passengers with impacto=false and reloads after HTTP 200', async () => {
    await open();
    cargar();
    cambiar();
    c.guardar();
    c.guardar();
    expect(c.ocupado()).toBe(true);
    expect(c.exito()).toBe('');
    cargar();
    const r = put();
    expect(c.exito()).toBe('');
    r.flush(VIAJE_REPROGRAMADO);
    expect(c.exito()).toContain('Horario actualizado');
    cargar(VIAJE_REPROGRAMADO);
    expect(c.form.getRawValue()).toEqual({ fecha: NUEVA_SALIDA.fecha, hora: '14:30:00' });
    expect(text()).toContain('10/11/2026 · 14:30');
    expect(c.ocupado()).toBe(false);
    http.expectNone((r) => r.method === 'POST' || r.method === 'DELETE');
  });
  it('requires an explicit cancelable impact dialog showing the actual old/new schedules and count', async () => {
    await open();
    cargar(VIAJE_REPROGRAMAR, 12);
    cambiar();
    c.guardar();
    cargar(VIAJE_REPROGRAMAR, 12);
    TestBed.tick();
    expect(dialog().impacto.pasajerosAceptados).toBe(12);
    expect(dialog().impacto.salidaAnterior).toContain('08/11/2026 · 10:00:30');
    expect(dialog().impacto.salidaNueva).toContain('10/11/2026 · 14:30');
    http.expectNone((r) => r.method === 'PUT');
    await cerrarDialogo(false);
    expect(c.ocupado()).toBe(false);
    expect(c.form.getRawValue()).toEqual(NUEVA_SALIDA);
    expect(c.actual()?.datos.viaje.fecha).toBe(VIAJE_REPROGRAMAR.fecha);
    http.expectNone((r) => r.method === 'PUT');
  });
  it('PUTs impacto=true only after confirmation and a fresh unchanged snapshot', async () => {
    await open();
    cargar(VIAJE_REPROGRAMAR, 2);
    cambiar();
    c.guardar();
    cargar(VIAJE_REPROGRAMAR, 2);
    await cerrarDialogo(true);
    http.expectNone((r) => r.method === 'PUT');
    cargar(VIAJE_REPROGRAMAR, 2);
    put(true).flush({ ...VIAJE_REPROGRAMADO, pasajeros: 2 });
    cargar({ ...VIAJE_REPROGRAMADO, pasajeros: 2 }, 2);
    expect(c.exito()).not.toBe('');
    expect(c.actual()?.aceptados).toBe(2);
    http.expectNone((r) => r.url.endsWith('/confirmar') || r.url.endsWith('/cancelar'));
  });
  it('warns about losing confirmation and renders the actual reset returned by the backend', async () => {
    const confirmado = {
      ...VIAJE_REPROGRAMAR,
      confirmado: true,
      fechaConfirmacion: '2026-11-05T10:00:00',
    };
    await open();
    cargar(confirmado, 1);
    expect(text()).toContain('perderá su confirmación');
    cambiar();
    c.guardar();
    cargar(confirmado, 1);
    expect(dialog().impacto.pierdeConfirmacion).toBe(true);
    await cerrarDialogo(true);
    cargar(confirmado, 1);
    put(true).flush(VIAJE_REPROGRAMADO);
    cargar(VIAJE_REPROGRAMADO, 1);
    expect(c.actual()?.datos.viaje.confirmado).toBe(false);
    expect(c.actual()?.datos.viaje.fechaConfirmacion).toBeNull();
    expect(text()).toContain('confirmar nuevamente');
    http.expectNone((r) => r.url.endsWith('/confirmar'));
  });
  it.each(['EN_PROGRESO', 'COMPLETADO', 'CANCELADO', 'VENCIDO'] as const)(
    'blocks editing of %s on a direct URL',
    async (estado) => {
      await open();
      cargar({ ...VIAJE_REPROGRAMAR, estado });
      cambiar();
      c.guardar();
      expect(c.editable()).toBe(false);
      expect(c.form.disabled).toBe(true);
      expect(text()).toContain('no permite reprogramarlo');
      http.expectNone((r) => r.method === 'PUT' || r.url === '/api/rutas');
    },
  );
  it('refreshes a changed departure before saving and requires another explicit save/confirmation', async () => {
    await open();
    cargar(VIAJE_REPROGRAMAR, 1);
    cambiar();
    c.guardar();
    const cambiado = { ...VIAJE_REPROGRAMAR, hora: '11:00' };
    cargar(cambiado, 1);
    expect(c.aviso()).toContain('cambiaron');
    expect(c.form.getRawValue()).toEqual(NUEVA_SALIDA);
    expect(TestBed.inject(MatDialog).openDialogs.length).toBe(0);
    http.expectNone((r) => r.method === 'PUT');
    c.guardar();
    cargar(cambiado, 1);
    expect(dialog().impacto.salidaAnterior).toContain('11:00');
    await cerrarDialogo(false);
  });
  it('invalidates impact consent when accepted count changes while the dialog is open', async () => {
    await open();
    cargar(VIAJE_REPROGRAMAR, 1);
    cambiar();
    c.guardar();
    cargar(VIAJE_REPROGRAMAR, 1);
    await cerrarDialogo(true);
    cargar(VIAJE_REPROGRAMAR, 2);
    expect(c.aviso()).toContain('cambiaron');
    http.expectNone((r) => r.method === 'PUT');
    c.guardar();
    cargar(VIAJE_REPROGRAMAR, 2);
    expect(dialog().impacto.pasajerosAceptados).toBe(2);
    await cerrarDialogo(false);
  });
  it('revalidates the 12-hour threshold after waiting in the confirmation dialog', async () => {
    await open();
    cargar(VIAJE_REPROGRAMAR, 1);
    c.form.setValue({ fecha: '2026-11-06', hora: '22:00' });
    c.guardar();
    cargar(VIAJE_REPROGRAMAR, 1);
    vi.spyOn(Date, 'now').mockReturnValue(AHORA_REPROGRAMAR + 1000);
    await cerrarDialogo(true);
    cargar(VIAJE_REPROGRAMAR, 1);
    expect(c.aviso()).toContain('12 horas');
    http.expectNone((r) => r.method === 'PUT');
  });
  it('never replays an impact-warning 409 automatically, then allows an explicitly confirmed retry', async () => {
    await open();
    cargar();
    cambiar();
    c.guardar();
    cargar();
    put().flush(
      {
        mensaje:
          'ADVERTENCIA: el cambio de horario afecta a 1 pasajero(s) aceptado(s). Confirma usando ?confirmarImpacto=true.',
      },
      { status: 409, statusText: 'Conflict' },
    );
    cargar(VIAJE_REPROGRAMAR, 1);
    expect(c.errorGuardado()).toContain('pasajeros aceptados');
    expect(TestBed.inject(MatDialog).openDialogs.length).toBe(0);
    http.expectNone((r) => r.method === 'PUT');
    c.guardar();
    cargar(VIAJE_REPROGRAMAR, 1);
    await cerrarDialogo(true);
    cargar(VIAJE_REPROGRAMAR, 1);
    put(true).flush(VIAJE_REPROGRAMADO);
    cargar(VIAJE_REPROGRAMADO, 1);
  });
  it('does not interpret arbitrary 409 text as consent and refreshes the actual terminal state', async () => {
    await open();
    cargar();
    cambiar();
    c.guardar();
    cargar();
    put().flush(
      { mensaje: 'Internal SQL confirmarImpacto=true' },
      { status: 409, statusText: 'Conflict' },
    );
    cargar({ ...VIAJE_REPROGRAMAR, estado: 'VENCIDO' });
    expect(c.editable()).toBe(false);
    expect(text()).not.toContain('Internal SQL');
    expect(c.form.getRawValue()).toEqual(NUEVA_SALIDA);
    http.expectNone((r) => r.method === 'PUT');
    expect(TestBed.inject(MatDialog).openDialogs.length).toBe(0);
  });
  it.each([0, 400, 403, 429, 500])(
    'preserves date/hour and permits explicit retry after PUT %i',
    async (status) => {
      await open();
      cargar();
      cambiar();
      c.guardar();
      cargar();
      const r = put();
      if (!status) r.error(new ProgressEvent('error'));
      else r.flush({ mensaje: 'SQL secret' }, { status, statusText: 'Failure' });
      h.detectChanges();
      expect(c.form.getRawValue()).toEqual(NUEVA_SALIDA);
      expect(c.form.enabled).toBe(true);
      expect(c.exito()).toBe('');
      expect(text()).not.toContain('SQL secret');
      http.expectNone((r) => r.url === '/api/rutas' || r.method === 'PUT');
      c.guardar();
      cargar();
      put().flush(VIAJE_REPROGRAMADO);
      cargar(VIAJE_REPROGRAMADO);
    },
  );
  it('handles missing/foreign trip after PUT 404 without inventing persistence', async () => {
    await open();
    cargar();
    cambiar();
    c.guardar();
    cargar();
    put().flush({}, { status: 404, statusText: 'Not Found' });
    h.detectChanges();
    expect(c.exito()).toBe('');
    expect(c.editable()).toBe(false);
    expect(c.form.getRawValue()).toEqual(NUEVA_SALIDA);
    expect(text()).toContain('no existe');
  });
  it('uses the existing 401 logout without extra protected reloads', async () => {
    await open();
    cargar();
    cambiar();
    c.guardar();
    cargar();
    put().flush({}, { status: 401, statusText: 'Unauthorized' });
    await h.fixture.whenStable();
    expect(auth.isAuthenticated()).toBe(false);
    expect(TestBed.inject(Router).url).toBe('/auth/login');
    http.expectNone((r) => r.url === '/api/rutas');
  });
  it.each([0, 403, 404, 500])(
    'handles initial read failure %i and retries without a PUT',
    async (status) => {
      await open();
      const r = req('/api/rutas');
      if (!status) r.error(new ProgressEvent('error'));
      else r.flush({ mensaje: 'SQL secret' }, { status, statusText: 'Failure' });
      const accepted = req('/api/viajes/74/solicitudes');
      expect(accepted.cancelled).toBe(true);
      h.detectChanges();
      expect(c.form.disabled).toBe(true);
      expect(text()).not.toContain('SQL secret');
      c.cargar();
      cargar();
      http.expectNone((r) => r.method === 'PUT');
    },
  );
  it('retains confirmed PUT data if the post-save read fails, then lets the user refresh safely', async () => {
    await open();
    cargar();
    cambiar();
    c.guardar();
    cargar();
    put().flush(VIAJE_REPROGRAMADO);
    req('/api/rutas').error(new ProgressEvent('error'));
    req('/api/viajes/74/solicitudes');
    h.detectChanges();
    expect(c.exito()).toContain('Horario actualizado');
    expect(c.actual()?.datos.viaje.fecha).toBe(NUEVA_SALIDA.fecha);
    expect(c.form.disabled).toBe(true);
    c.cargar();
    cargar(VIAJE_REPROGRAMADO);
    expect(c.sinCambios()).toBe(true);
    http.expectNone((r) => r.method === 'PUT');
  });
  it('does not report success for an incoherent 200 body', async () => {
    await open();
    cargar();
    cambiar();
    c.guardar();
    cargar();
    put().flush({ ...VIAJE_REPROGRAMADO, confirmado: true });
    expect(c.exito()).toBe('');
    expect(c.errorGuardado()).not.toBe('');
    expect(c.form.getRawValue()).toEqual(NUEVA_SALIDA);
  });
  it.each(['0', '-1', 'abc', '1e3', '9007199254740993'])(
    'rejects invalid route ID %s before API requests',
    async (id) => {
      await open('/conductor/viajes/' + id + '/editar');
      expect(c.estado()).toBe('inexistente');
      http.expectNone((r) => r.url.startsWith('/api/rutas') || r.url.includes('/solicitudes'));
    },
  );
  it('cancels obsolete reads when changing the trip ID', async () => {
    await open();
    const old = req('/api/rutas');
    const accepted = req('/api/viajes/74/solicitudes');
    await h.navigateByUrl('/conductor/viajes/75/editar');
    expect(old.cancelled && accepted.cancelled).toBe(true);
    cargar({ ...VIAJE_REPROGRAMAR, id: 75 });
    expect(c.id()).toBe(75);
    expect(c.form.getRawValue().hora).toBe(VIAJE_REPROGRAMAR.hora);
  });
  it('closes an obsolete impact dialog without PUT when navigating to another trip', async () => {
    await open();
    cargar(VIAJE_REPROGRAMAR, 1);
    cambiar();
    c.guardar();
    cargar(VIAJE_REPROGRAMAR, 1);
    await h.navigateByUrl('/conductor/viajes/75/editar');
    cargar({ ...VIAJE_REPROGRAMAR, id: 75 });
    await h.fixture.whenStable();
    expect(TestBed.inject(MatDialog).openDialogs.length).toBe(0);
    http.expectNone((r) => r.method === 'PUT');
  });
  it('cancel editing only navigates and never writes', async () => {
    await open();
    cargar();
    cambiar();
    h.routeNativeElement!.querySelector<HTMLButtonElement>(
      'button[routerLink="/conductor/viajes"]',
    )!.click();
    await h.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/conductor/viajes');
    req('/api/rutas').flush(paginaReprogramar([]));
    http.expectNone((r) => r.method === 'PUT');
  });
  it.each(['anonymous', 'PASAJERO'])(
    'keeps existing role and profile guards for %s',
    async (role) => {
      if (role === 'anonymous') auth.clearSession();
      else login('PASAJERO');
      await open();
      expect(TestBed.inject(Router).url).toBe(
        role === 'anonymous' ? '/auth/login' : '/pasajero/dashboard',
      );
      http.expectNone((r) => r.url === '/api/rutas' || r.method === 'PUT');
    },
  );
  it.each(['/conductor/viajes', '/conductor/rutas/9/viajes'])(
    'links only scheduled real IDs from %s and preserves existing actions',
    async (path) => {
      await open(path);
      req('/api/rutas').flush(paginaReprogramar([RUTA_REPROGRAMAR]));
      req('/api/rutas/9/viajes').flush(
        paginaReprogramar(
          ['PROGRAMADO', 'EN_PROGRESO', 'COMPLETADO', 'CANCELADO', 'VENCIDO'].map((estado, i) => ({
            ...VIAJE_REPROGRAMAR,
            id: 74 + i,
            estado,
          })),
        ),
      );
      h.detectChanges();
      const links = h.routeNativeElement!.querySelectorAll<HTMLAnchorElement>('a[href$="/editar"]');
      expect([...links].map((a) => a.getAttribute('href'))).toEqual([
        '/conductor/viajes/74/editar',
      ]);
      expect(
        h.routeNativeElement!.querySelector('a[href="/conductor/viajes/74/solicitudes"]'),
      ).toBeTruthy();
      links[0].click();
      await h.fixture.whenStable();
      cargar();
      expect(TestBed.inject(Router).url).toBe('/conductor/viajes/74/editar');
    },
  );
  it('links the real scheduled trip from management without replacing confirmation/cancellation', async () => {
    await open('/conductor/viajes/74');
    req('/api/rutas').flush(paginaReprogramar([RUTA_REPROGRAMAR]));
    req('/api/rutas/9/viajes').flush(paginaReprogramar([VIAJE_REPROGRAMAR]));
    req('/api/viajes/74/solicitudes').flush(paginaReprogramar([]));
    h.detectChanges();
    expect(
      h.routeNativeElement!.querySelector('a[href="/conductor/viajes/74/editar"]'),
    ).toBeTruthy();
    expect(text()).toContain('Confirmar viaje');
    expect(text()).toContain('Cancelar viaje');
    http.expectNone((r) => r.method === 'PUT');
  });
  it('shows the latest confirmed state if another session confirms after the successful update', async () => {
    await open();
    cargar();
    cambiar();
    c.guardar();
    cargar();
    put().flush(VIAJE_REPROGRAMADO);
    cargar({ ...VIAJE_REPROGRAMADO, confirmado: true, fechaConfirmacion: '2026-11-06T10:10:00' });
    expect(c.actual()?.datos.viaje.confirmado).toBe(true);
    expect(c.exito()).not.toContain('sin confirmar');
    http.expectNone((r) => r.url.endsWith('/confirmar'));
  });
  it('cancels a pending PUT on leaving the screen and ignores any late UI result', async () => {
    await open();
    cargar();
    cambiar();
    c.guardar();
    cargar();
    const write = put();
    expect(
      h.routeNativeElement!.querySelector<HTMLButtonElement>(
        'button[routerLink="/conductor/viajes"]',
      )!.disabled,
    ).toBe(true);
    await h.navigateByUrl('/configuracion');
    expect(write.cancelled).toBe(true);
    expect(c.exito()).toBe('');
  });
});
