import { TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '../../../core/services/auth.service';
import { jwtInterceptor } from '../../../core/interceptors/jwt.interceptor';
import { MetodoFormulario } from './metodo-formulario';
import { MetodosListado } from '../metodos-listado/metodos-listado';
import { DUPLICATE_METHOD } from '../shared/compensacion-error';

const url = '/api/metodos-compensacion';
const method = { id: 87, tipo: 'GASOLINA', descripcion: 'Combustible compartido', activo: true };

describe('US26/US27 real HTTP form', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let component: MetodoFormulario;
  let token: string;
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'compensaciones/metodos/nuevo', component: MetodoFormulario },
          { path: 'compensaciones/metodos/:id/editar', component: MetodoFormulario },
          { path: 'compensaciones/metodos', component: MetodosListado },
        ]),
        provideHttpClient(withInterceptors([jwtInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    token =
      'eyJhbGciOiJIUzI1NiJ9.' +
      btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })) +
      '.signature';
    TestBed.inject(AuthService)
      .login({ correo: 'test@upc.edu.pe', contrasena: 'Password1!' })
      .subscribe();
    http
      .expectOne('/api/auth/login')
      .flush({
        token,
        mensaje: 'OK',
        usuario: {
          id: 9,
          nombre: 'Test',
          correo: 'test@upc.edu.pe',
          rol: 'CONDUCTOR',
          cuentaVerificada: true,
        },
      });
  });
  afterEach(() => {
    http.verify();
    TestBed.inject(AuthService).clearSession();
    localStorage.clear();
    sessionStorage.clear();
  });
  async function navigate(path = '/compensaciones/metodos/nuevo') {
    harness = await RouterTestingHarness.create();
    component = await harness.navigateByUrl(path, MetodoFormulario);
    harness.detectChanges();
  }
  function form() {
    return (component as unknown as { form: FormGroup }).form;
  }
  function text() {
    return harness.routeNativeElement!.textContent ?? '';
  }
  function submit() {
    harness
      .routeNativeElement!.querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    harness.detectChanges();
  }
  function fill() {
    form().patchValue({ tipo: 'DINERO', descripcion: '  Transferencia personal  ' });
    harness.detectChanges();
  }
  async function edit(activo = true) {
    await navigate('/compensaciones/metodos/87/editar');
    expect(text()).toContain('Cargando');
    http.expectOne(url).flush([{ ...method, activo }]);
    harness.detectChanges();
  }
  it('requires type and nonblank description and does not POST invalid forms', async () => {
    await navigate();
    submit();
    expect(form().controls['tipo'].hasError('required')).toBe(true);
    form().patchValue({ tipo: 'FAVOR', descripcion: '   ' });
    submit();
    expect(form().controls['descripcion'].hasError('blank')).toBe(true);
    http.expectNone((req) => req.method === 'POST');
  });
  it('POSTs trimmed fields without an inactive flag and confirms only HTTP 201', async () => {
    await navigate();
    fill();
    form().controls['activo'].setValue(false);
    submit();
    submit();
    const req = http.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe('Bearer ' + token);
    expect(req.request.body).toEqual({ tipo: 'DINERO', descripcion: 'Transferencia personal' });
    expect(form().disabled).toBe(true);
    expect(text()).not.toContain('Cambios guardados');
    req.flush(
      { ...method, tipo: 'DINERO', descripcion: 'Transferencia personal' },
      { status: 201, statusText: 'Created' },
    );
    harness.detectChanges();
    expect(text()).toContain('registrado correctamente');
    expect(form().enabled).toBe(true);
    expect(form().controls['activo'].value).toBe(true);
    await harness.navigateByUrl('/compensaciones/metodos');
    http.expectOne(url).flush([{ ...method, descripcion: 'Persistido por servidor' }]);
    harness.detectChanges();
    expect(text()).toContain('Persistido por servidor');
  });
  it('retains duplicate input, clears feedback on correction and resends a real POST', async () => {
    await navigate();
    fill();
    submit();
    http
      .expectOne(url)
      .flush({ mensaje: DUPLICATE_METHOD }, { status: 409, statusText: 'Conflict' });
    harness.detectChanges();
    expect(text()).toContain('duplicado');
    expect(form().controls['descripcion'].value).toBe('  Transferencia personal  ');
    form().controls['descripcion'].setValue('Otra alternativa');
    submit();
    http
      .expectOne(url)
      .flush(
        { ...method, descripcion: 'Otra alternativa' },
        { status: 201, statusText: 'Created' },
      );
    harness.detectChanges();
    expect(text()).toContain('registrado correctamente');
  });
  it('loads an edit using GET collection, never GET by ID', async () => {
    await edit();
    expect(form().getRawValue()).toEqual({
      tipo: 'GASOLINA',
      descripcion: method.descripcion,
      activo: true,
    });
    http.expectNone(url + '/87');
  });
  it.each([false, true])(
    'persists activo=%s by PUT and reflects the server when returning to the list',
    async (activo) => {
      await edit(!activo);
      form().patchValue({ descripcion: '  Aporte actualizado ', activo });
      submit();
      submit();
      const req = http.expectOne(url + '/87');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({
        tipo: 'GASOLINA',
        descripcion: 'Aporte actualizado',
        activo,
      });
      req.flush({ ...method, descripcion: 'Aporte actualizado', activo });
      harness.detectChanges();
      expect(text()).toContain('actualizado correctamente');
      await harness.navigateByUrl('/compensaciones/metodos');
      http.expectOne(url).flush([{ ...method, descripcion: 'Aporte actualizado', activo }]);
      harness.detectChanges();
      expect(text()).toContain('Aporte actualizado');
      expect(text()).toContain(activo ? 'Activo' : 'Inactivo');
    },
  );
  it('shows unknown IDs without allowing PUT', async () => {
    await navigate('/compensaciones/metodos/444/editar');
    http.expectOne(url).flush([method]);
    harness.detectChanges();
    expect(text()).toContain('no encontrado');
    expect(harness.routeNativeElement!.querySelector('form')).toBeNull();
    http.expectNone((req) => req.method === 'PUT');
  });
  it.each(['0', '-2', 'abc', '9007199254740999'])(
    'rejects invalid route ID %s without HTTP',
    async (id) => {
      await navigate('/compensaciones/metodos/' + id + '/editar');
      expect(text()).toContain('no encontrado');
      http.expectNone(url);
    },
  );
  it('retries a failed edit GET without losing the route ID', async () => {
    await navigate('/compensaciones/metodos/87/editar');
    http.expectOne(url).error(new ProgressEvent('error'));
    harness.detectChanges();
    expect(text()).toContain('conectar');
    (
      harness.routeNativeElement!.querySelector(
        'app-compensacion-state-panel button',
      ) as HTMLButtonElement
    ).click();
    http.expectOne(url).flush([method]);
    harness.detectChanges();
    expect(form().controls['descripcion'].value).toBe(method.descripcion);
  });
  it.each([400, 404, 409, 403, 500, 0])(
    'PUT HTTP %s never displays a persisted success',
    async (status) => {
      await edit();
      form().controls['descripcion'].setValue('Cambio pendiente');
      submit();
      const req = http.expectOne(url + '/87');
      if (status === 0) req.error(new ProgressEvent('error'));
      else
        req.flush(
          {
            mensaje: status === 409 ? DUPLICATE_METHOD : 'private details',
            campos: status === 400 ? { descripcion: 'Revisa la descripci?n' } : null,
          },
          { status, statusText: 'Error' },
        );
      harness.detectChanges();
      expect(text()).not.toContain('Cambios guardados');
      expect(text()).not.toContain('private details');
      if (status === 404) expect(text()).toContain('no encontrado');
      else {
        expect(form().controls['descripcion'].value).toBe('Cambio pendiente');
        expect(form().enabled).toBe(true);
      }
    },
  );
  it('POST network errors preserve input and can retry', async () => {
    await navigate();
    fill();
    submit();
    http.expectOne(url).error(new ProgressEvent('error'));
    harness.detectChanges();
    expect(text()).toContain('conectar');
    submit();
    const retry = http.expectOne(url);
    expect(retry.request.method).toBe('POST');
    retry.flush(method, { status: 201, statusText: 'Created' });
  });
  it('401 follows the shared logout', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await edit();
    submit();
    http.expectOne(url + '/87').flush({}, { status: 401, statusText: 'Unauthorized' });
    harness.detectChanges();
    expect(TestBed.inject(AuthService).isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/auth/login']);
  });
  it('ignores fake success query parameters', async () => {
    await navigate('/compensaciones/metodos/nuevo?estado=exito');
    expect(text()).not.toContain('Cambios guardados');
    expect(form().controls['tipo'].value).toBeNull();
  });
  it('cancels an old ID lookup when navigating to a different method', async () => {
    await navigate('/compensaciones/metodos/87/editar');
    const old = http.expectOne(url);
    component = await harness.navigateByUrl('/compensaciones/metodos/88/editar', MetodoFormulario);
    expect(old.cancelled).toBe(true);
    http.expectOne(url).flush([{ ...method, id: 88 }]);
    harness.detectChanges();
    form().controls['descripcion'].setValue('Para 88');
    submit();
    const req = http.expectOne(url + '/88');
    expect(req.request.method).toBe('PUT');
    req.flush({ ...method, id: 88 });
  });
  it('cancels an in-flight save when leaving without applying a late success', async () => {
    await edit();
    form().controls['descripcion'].setValue('Cambio pendiente');
    submit();
    const pending = http.expectOne(url + '/87');
    await harness.navigateByUrl('/compensaciones/metodos');
    expect(pending.cancelled).toBe(true);
    http.expectOne(url).flush([method]);
    harness.detectChanges();
    expect(text()).toContain(method.descripcion);
    expect(text()).not.toContain('actualizado correctamente');
  });
});
