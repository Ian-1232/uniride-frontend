import { prepararPerfil } from '../../../testing/perfil-fixtures';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../../core/services/auth.service';
import { jwtInterceptor } from '../../../core/interceptors/jwt.interceptor';
import { MetodosCompensacionService } from '../../../core/services/metodos-compensacion.service';
import { routes } from '../../../app.routes';
import { BLOCKED_DELETE } from '../shared/compensacion-error';
import { MetodosListado } from './metodos-listado';

const url = '/api/metodos-compensacion';
const method = { id: 87, tipo: 'FAVOR', descripcion: 'Apoyo de estudio', activo: true };
const inactive = { id: 91, tipo: 'DINERO', descripcion: 'Transferencia acordada', activo: false };

describe('US26/US28 authenticated HTTP list and deletion', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<MetodosListado>;
  let dialog: MatDialog;
  let auth: AuthService;
  let token: string;
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [MetodosListado],
      providers: [
        provideRouter(routes),
        provideNoopAnimations(),
        provideHttpClient(withInterceptors([jwtInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    dialog = TestBed.inject(MatDialog);
    auth = TestBed.inject(AuthService);
    authenticate();
    fixture = TestBed.createComponent(MetodosListado);
    fixture.detectChanges();
  });
  afterEach(async () => {
    fixture.destroy();
    dialog.closeAll();
    await fixture.whenStable();
    http.verify();
    auth.clearSession();
    localStorage.clear();
    sessionStorage.clear();
  });
  function authenticate(rol = 'CONDUCTOR') {
    token =
      'eyJhbGciOiJIUzI1NiJ9.' +
      btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })) +
      '.signature';
    auth.login({ correo: 'test@upc.edu.pe', contrasena: 'Password1!' }).subscribe();
    http
      .expectOne('/api/auth/login')
      .flush({
        token,
        mensaje: 'OK',
        usuario: { id: 9, nombre: 'Test', correo: 'test@upc.edu.pe', rol, cuentaVerificada: true },
      });
    prepararPerfil();
  }
  function loaded() {
    http.expectOne(url).flush([method, inactive]);
    fixture.detectChanges();
  }
  function text() {
    return fixture.nativeElement.textContent as string;
  }
  function open() {
    (fixture.nativeElement.querySelector('.delete-action') as HTMLButtonElement).click();
    fixture.detectChanges();
    TestBed.tick();
  }
  function clickDialog(label: string) {
    const buttons = Array.from(
      document.querySelectorAll<HTMLButtonElement>('mat-dialog-container button'),
    );
    const button = buttons.find((value) => value.textContent!.trim() === label);
    expect(button).toBeTruthy();
    button!.click();
    TestBed.tick();
  }
  it('loads own active and inactive methods, count and real edit IDs', () => {
    expect(text()).toContain('Cargando');
    const req = http.expectOne(url);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    expect(req.request.headers.get('Authorization')).toBe('Bearer ' + token);
    req.flush([method, inactive]);
    fixture.detectChanges();
    expect(text()).toContain('2 métodos registrados');
    expect(text()).toContain('Inactivo');
    expect(
      fixture.nativeElement.querySelector('a[href="/compensaciones/metodos/87/editar"]'),
    ).toBeTruthy();
    expect(text()).not.toContain('demostración');
  });
  it('represents an empty backend list without demo cards', () => {
    http.expectOne(url).flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.method-card')).toBeNull();
    expect(text()).toContain('Aún no tienes');
  });
  it.each([0, 403, 500])('GET HTTP %s offers a real retry', (status) => {
    const req = http.expectOne(url);
    if (!status) req.error(new ProgressEvent('error'));
    else req.flush({ mensaje: 'private SQL' }, { status, statusText: 'Error' });
    fixture.detectChanges();
    expect(text()).not.toContain('private SQL');
    expect(fixture.nativeElement.querySelector('.method-card')).toBeNull();
    (
      fixture.nativeElement.querySelector(
        'app-compensacion-state-panel button',
      ) as HTMLButtonElement
    ).click();
    loaded();
    expect(text()).toContain(method.descripcion);
  });
  it('cancel closes the dialog without DELETE', async () => {
    loaded();
    open();
    expect(document.querySelector('mat-dialog-container')?.textContent).toContain(
      method.descripcion,
    );
    clickDialog('Cancelar');
    await fixture.whenStable();
    http.expectNone((req) => req.method === 'DELETE');
    expect(text()).not.toContain('eliminado correctamente');
    expect(text()).toContain(method.descripcion);
  });
  it('waits for confirmed DELETE and refreshes actual persisted data', async () => {
    loaded();
    open();
    clickDialog('Eliminar método');
    const req = http.expectOne(url + '/87');
    expect(req.request.method).toBe('DELETE');
    expect(req.request.headers.get('Authorization')).toBe('Bearer ' + token);
    expect(dialog.openDialogs.length).toBe(1);
    expect(text()).toContain(method.descripcion);
    clickDialog('Eliminar método');
    http.expectNone((req) => req.method === 'DELETE');
    req.flush({ mensaje: 'Método de compensación eliminado correctamente' });
    await fixture.whenStable();
    const refresh = http.expectOne(url);
    refresh.flush([inactive]);
    fixture.detectChanges();
    expect(text()).toContain('eliminado correctamente');
    expect(text()).not.toContain(method.descripcion);
    expect(text()).toContain(inactive.descripcion);
  });
  it('409 preserves data and navigates to the selected ID for deactivation', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    loaded();
    open();
    clickDialog('Eliminar método');
    http
      .expectOne(url + '/87')
      .flush({ mensaje: BLOCKED_DELETE }, { status: 409, statusText: 'Conflict' });
    TestBed.tick();
    expect(document.querySelector('mat-dialog-container')?.textContent).toContain(BLOCKED_DELETE);
    expect(text()).toContain(method.descripcion);
    http.expectNone(url);
    clickDialog('Desactivar método');
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledWith(['/compensaciones/metodos', 87, 'editar']);
    http.expectNone((req) => req.method === 'PUT');
  });
  it('404 does not simulate deletion and can refresh the list', async () => {
    loaded();
    open();
    clickDialog('Eliminar método');
    http.expectOne(url + '/87').flush({}, { status: 404, statusText: 'Not Found' });
    TestBed.tick();
    expect(document.querySelector('mat-dialog-container')?.textContent).toContain('ya no existe');
    expect(text()).toContain(method.descripcion);
    clickDialog('Actualizar listado');
    await fixture.whenStable();
    http.expectOne(url).flush([inactive]);
    fixture.detectChanges();
    expect(text()).not.toContain(method.descripcion);
    expect(text()).not.toContain('eliminado correctamente');
  });
  it.each([0, 403, 500])(
    'DELETE HTTP %s preserves data and permits another confirmed attempt',
    async (status) => {
      loaded();
      open();
      clickDialog('Eliminar método');
      const req = http.expectOne(url + '/87');
      if (!status) req.error(new ProgressEvent('error'));
      else req.flush({ mensaje: 'private SQL' }, { status, statusText: 'Error' });
      TestBed.tick();
      expect(text()).toContain(method.descripcion);
      expect(document.querySelector('mat-dialog-container')?.textContent).not.toContain(
        'private SQL',
      );
      clickDialog('Eliminar método');
      http.expectOne(url + '/87').flush({ mensaje: 'OK' });
      await fixture.whenStable();
      http.expectOne(url).flush([]);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.method-card')).toBeNull();
      if (status === 403) expect(auth.isAuthenticated()).toBe(true);
    },
  );
  it('401 is handled by the existing interceptor', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    http.expectOne(url).flush({}, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();
    expect(auth.isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/auth/login']);
  });
  it('a DELETE 401 never closes as successful or removes the item', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    loaded();
    open();
    clickDialog('Eliminar método');
    http.expectOne(url + '/87').flush({}, { status: 401, statusText: 'Unauthorized' });
    TestBed.tick();
    expect(auth.isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/auth/login']);
    expect(text()).toContain(method.descripcion);
    http.expectNone(url);
  });
  it('cancels a pending list request when destroyed', () => {
    const pending = http.expectOne(url);
    fixture.destroy();
    expect(pending.cancelled).toBe(true);
  });
  it('closes its dialog and cancels pending DELETE when leaving the screen', async () => {
    loaded();
    open();
    clickDialog('Eliminar método');
    const pending = http.expectOne(url + '/87');
    fixture.destroy();
    await fixture.whenStable();
    expect(pending.cancelled).toBe(true);
    expect(dialog.openDialogs.length).toBe(0);
    http.expectNone(url);
  });
  it('service uses the exact REST methods, without identity parameters', () => {
    loaded();
    const service = TestBed.inject(MetodosCompensacionService);
    const request = { tipo: 'FAVOR' as const, descripcion: 'Apoyo' };
    service.registrar(request).subscribe();
    let req = http.expectOne(url);
    expect(req.request.body).toEqual(request);
    expect(req.request.params.keys()).toEqual([]);
    req.flush(method, { status: 201, statusText: 'Created' });
    service.actualizar(87, { ...request, activo: false }).subscribe();
    req = http.expectOne(url + '/87');
    expect(req.request.method).toBe('PUT');
    req.flush({ ...method, activo: false });
    service.eliminar(87).subscribe();
    req = http.expectOne(url + '/87');
    expect(req.request.method).toBe('DELETE');
    req.flush({ mensaje: 'OK' });
  });
  it('ignores simulated list outcomes in URLs', async () => {
    loaded();
    const h = await RouterTestingHarness.create('/compensaciones/metodos?estado=eliminado');
    expect(h.routeNativeElement?.textContent).not.toContain('eliminado correctamente');
    http.expectOne(url).flush([]);
    h.detectChanges();
    expect(h.routeNativeElement?.querySelector('.method-card')).toBeNull();
  });
  it.each(['anonymous', 'PASAJERO'])('enforces current shared route policy for %s', async (role) => {
    loaded();
    if (role === 'anonymous') auth.clearSession();
    else authenticate(role);
    await RouterTestingHarness.create('/compensaciones/metodos');
    expect(TestBed.inject(Router).url).toBe(
      role === 'anonymous' ? '/auth/login' : '/compensaciones/metodos',
    );
    if (role === 'anonymous') http.expectNone(url);
    else http.expectOne(url).flush([]);
  });
});
