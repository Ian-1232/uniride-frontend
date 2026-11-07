import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { routes } from '../../app.routes';
import { AuthService } from '../../core/services/auth.service';
import { jwtInterceptor } from '../../core/interceptors/jwt.interceptor';
import { prepararPerfil } from '../../testing/perfil-fixtures';
import { Horarios } from './horarios';
import { EliminarCursoDialog } from './eliminar-curso-dialog/eliminar-curso-dialog';
import { ARCHIVO_TEST, CURSO_REQUEST, CURSO_TEST, paginaCursos } from './horarios.testing';
import { MAX_ARCHIVO_BYTES } from '../../core/models/horarios.models';

const cursosUrl = '/api/perfil/cursos';
const uploadUrl = '/api/perfil/horarios/archivo';
describe('US23/US24 authenticated schedule integration', () => {
  let http: HttpTestingController;
  let auth: AuthService;
  let h: RouterTestingHarness;
  let c: Horarios;
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
    login();
  });
  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
    http.verify();
    auth.clearSession();
    localStorage.clear();
    sessionStorage.clear();
  });
  function login(rol = 'CONDUCTOR', perfil = true) {
    auth.login({ correo: 'horarios@upc.edu.pe', contrasena: 'Password1!' }).subscribe();
    const token =
      'eyJhbGciOiJIUzI1NiJ9.' +
      btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })) +
      '.signature';
    http.expectOne('/api/auth/login').flush({
      token,
      mensaje: 'OK',
      usuario: {
        id: 11,
        nombre: 'Prueba',
        correo: 'horarios@upc.edu.pe',
        rol,
        cuentaVerificada: true,
      },
    });
    if (perfil) prepararPerfil();
  }
  async function open() {
    h = await RouterTestingHarness.create('/horarios');
    c = h.fixture.debugElement.query(By.directive(Horarios)).componentInstance;
    h.detectChanges();
  }
  function reqLista() {
    return http.expectOne((r) => r.url === cursosUrl && r.method === 'GET');
  }
  function lista(content = [CURSO_TEST], page = 0, total = content.length, size = 100) {
    reqLista().flush(paginaCursos(content, page, total, size));
    h.detectChanges();
    for (const panel of h.routeNativeElement!.querySelectorAll<HTMLElement>(
      'mat-expansion-panel-header',
    )) {
      if (panel.getAttribute('aria-expanded') === 'false') panel.click();
    }
    h.detectChanges();
  }
  function text() {
    return h.routeNativeElement!.textContent ?? '';
  }
  function fill() {
    c.cursos.at(0).setValue(CURSO_REQUEST);
  }
  function select(file: File | null) {
    const input = h.routeNativeElement!.querySelector<HTMLInputElement>('input[type=file]')!;
    Object.defineProperty(input, 'files', { configurable: true, value: { item: () => file } });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    h.detectChanges();
  }
  async function dialog() {
    c.eliminar(CURSO_TEST);
    TestBed.tick();
    await h.fixture.whenStable();
    return TestBed.inject(MatDialog).openDialogs[0].componentInstance as EliminarCursoDialog;
  }
  it.each(['CONDUCTOR', 'PASAJERO'])(
    'supports %s with its own layout and real desktop/mobile links',
    async (role) => {
      login(role);
      await open();
      expect(text()).toContain('Cargando cursos');
      const req = reqLista();
      expect(req.request.params.get('page')).toBe('0');
      expect(req.request.params.get('size')).toBe('100');
      expect(req.request.headers.has('Authorization')).toBe(true);
      req.flush(paginaCursos());
      h.detectChanges();
      expect(
        h.routeNativeElement!.querySelector(
          role === 'CONDUCTOR' ? 'app-conductor-layout' : 'app-pasajero-layout',
        ),
      ).toBeTruthy();
      expect(h.routeNativeElement!.querySelector('a[href="/horarios"]')).toBeTruthy();
      h.routeNativeElement!.querySelector<HTMLButtonElement>(
        'button[aria-label="Abrir navegación"]',
      )!.click();
      await h.fixture.whenStable();
      TestBed.tick();
      expect(document.querySelector('.cdk-overlay-container a[href="/horarios"]')).toBeTruthy();
      for (const panel of h.routeNativeElement!.querySelectorAll<HTMLElement>(
        'mat-expansion-panel-header',
      ))
        panel.click();
      h.detectChanges();
      expect(text()).toContain('Curso de prueba');
      expect(text()).toContain('Miércoles');
      expect(text()).toContain('08:05–10:15:30');
    },
  );
  it('shows an actual empty page without fixtures or URL simulation', async () => {
    await open();
    lista([]);
    expect(text()).toContain('Aún no tienes cursos');
    expect(h.routeNativeElement!.querySelector('.course-row')).toBeNull();
  });
  it('loads all real pages before showing a complete ordered weekly accordion', async () => {
    await open();
    reqLista().flush({ ...paginaCursos([CURSO_TEST]), totalElements: 2, totalPages: 2 });
    const second = reqLista();
    expect(second.request.params.get('page')).toBe('1');
    expect(text()).toContain('Cargando cursos');
    second.flush({
      ...paginaCursos([{ ...CURSO_TEST, id: 94, horaInicio: '06:00', horaFin: '07:00' }]),
      number: 1,
      totalElements: 2,
      totalPages: 2,
    });
    h.detectChanges();
    expect(h.routeNativeElement!.querySelectorAll('mat-expansion-panel-header').length).toBe(7);
    expect(c.gruposDia()[2].cursos.map((row) => row.id)).toEqual([94, 93]);
    expect(text()).toContain('2 curso(s) en tu horario semanal');
    c.load();
    const old = reqLista();
    c.load(true);
    expect(old.cancelled).toBe(true);
    lista([]);
  });
  it.each([0, 400, 403, 500])('handles list error %i and performs a real retry', async (status) => {
    await open();
    const r = reqLista();
    if (!status) r.error(new ProgressEvent('error'));
    else r.flush({ mensaje: 'SQL secret' }, { status, statusText: 'Failure' });
    h.detectChanges();
    expect(text()).toContain('No se pudo cargar');
    expect(text()).not.toContain('SQL secret');
    c.load();
    lista();
    expect(text()).toContain('Curso de prueba');
  });
  it('does not emit duplicate initial GETs', async () => {
    await open();
    c.load();
    c.load();
    reqLista().flush(paginaCursos());
    http.expectNone((r) => r.url === cursosUrl);
  });
  it('requires valid name, Spanish day, hours and a strictly increasing interval before POST', async () => {
    await open();
    lista([]);
    c.guardar();
    http.expectNone((r) => r.method === 'POST');
    for (const value of [
      { ...CURSO_REQUEST, nombre: ' ' },
      { ...CURSO_REQUEST, dia: 'Monday' },
      { ...CURSO_REQUEST, horaInicio: '24:00' },
      { ...CURSO_REQUEST, horaFin: '08:05' },
      { ...CURSO_REQUEST, horaFin: '07:00' },
    ]) {
      c.cursos.at(0).setValue(value);
      c.guardar();
      expect(c.form.invalid).toBe(true);
      http.expectNone((r) => r.method === 'POST');
    }
  });
  it('retains overlapping drafts while saving compatible rows with a popup naming both courses', async () => {
    await open();
    lista();
    fill();
    c.agregarFila();
    const valid = { ...CURSO_REQUEST, nombre: 'Compatible', dia: 'Viernes' as const };
    c.cursos.at(1).setValue(valid);
    c.guardar();
    lista();
    const post = http.expectOne((r) => r.method === 'POST');
    expect(post.request.body).toEqual([valid]);
    post.flush([{ ...valid, id: 94 }], { status: 201, statusText: 'Created' });
    lista([CURSO_TEST, { ...valid, id: 94 }]);
    TestBed.tick();
    expect(c.notice()).toContain('1 curso(s)');
    expect(c.cursos.length).toBe(1);
    expect(c.cursos.at(0).getRawValue()).toEqual(CURSO_REQUEST);
    const popup = document.querySelector('app-conflictos-horario-dialog')!;
    expect(popup.textContent).toContain('Curso de prueba');
    expect(popup.textContent).toContain('08:05');
    expect(popup.textContent).toContain('superposiciones');
    http.expectNone((r) => r.method === 'POST');
  });
  it('saves independent rows sequentially only after clicking save and refreshes after 201', async () => {
    await open();
    lista([]);
    fill();
    c.agregarFila();
    const second = { ...CURSO_REQUEST, nombre: 'Segundo curso', dia: 'Viernes' as const };
    c.cursos.at(1).setValue(second);
    http.expectNone((r) => r.method === 'POST');
    c.guardar();
    c.guardar();
    expect(c.form.disabled).toBe(true);
    lista([]);
    const first = http.expectOne((r) => r.method === 'POST');
    expect(first.request.body).toEqual([CURSO_REQUEST]);
    expect(c.notice()).toBe('');
    first.flush([CURSO_TEST], { status: 201, statusText: 'Created' });
    const post2 = http.expectOne((r) => r.method === 'POST');
    expect(post2.request.body).toEqual([second]);
    post2.flush([{ ...second, id: 94 }], { status: 201, statusText: 'Created' });
    expect(c.notice()).toContain('2 curso(s)');
    lista([CURSO_TEST, { ...second, id: 94 }]);
    expect(c.cursos.length).toBe(1);
    expect(c.cursos.at(0).controls.nombre.value).toBe('');
    expect(c.form.enabled).toBe(true);
  });
  it('does not submit while the initial complete schedule is still loading', async () => {
    await open();
    fill();
    c.guardar();
    http.expectNone((r) => r.method === 'POST');
    lista([]);
  });
  it.each([0, 400, 403, 409, 500])(
    'preserves unsaved rows and does not show success after POST %i',
    async (status) => {
      await open();
      lista([]);
      fill();
      c.guardar();
      lista([]);
      const r = http.expectOne((r) => r.method === 'POST');
      if (!status) r.error(new ProgressEvent('error'));
      else
        r.flush(
          {
            mensaje: status === 409 ? 'Otro conflicto' : 'SQL secret',
          },
          { status, statusText: 'Failure' },
        );
      h.detectChanges();
      expect(c.cursos.at(0).getRawValue()).toEqual(CURSO_REQUEST);
      expect(c.form.enabled).toBe(true);
      expect(c.notice()).toBe('');
      expect(text()).not.toContain('SQL secret');
      lista([]);
      c.guardar();
      lista([]);
      http
        .expectOne((r) => r.method === 'POST')
        .flush([CURSO_TEST], { status: 201, statusText: 'Created' });
      lista();
    },
  );
  it('issues no DELETE when the confirmation is cancelled', async () => {
    await open();
    lista();
    const d = await dialog();
    http.expectNone((r) => r.method === 'DELETE');
    d.cancelar();
    await h.fixture.whenStable();
    http.expectNone((r) => r.method === 'DELETE' || r.method === 'GET');
    expect(text()).toContain('Curso de prueba');
  });
  it('DELETEs only the selected real id after confirmation, blocks duplicates and reloads after 204', async () => {
    await open();
    lista();
    const d = await dialog();
    expect(d.curso.id).toBe(93);
    d.confirmar();
    d.confirmar();
    const r = http.expectOne(cursosUrl + '/93');
    expect(r.request.method).toBe('DELETE');
    http.expectNone((r) => r.method === 'GET');
    r.flush(null, { status: 204, statusText: 'No Content' });
    await h.fixture.whenStable();
    lista([]);
    expect(text()).toContain('Curso eliminado correctamente');
    expect(h.routeNativeElement!.querySelector('.course-row')).toBeNull();
  });
  it.each([0, 403, 404, 409, 500])(
    'keeps the course and dialog on DELETE %i without a silent refresh',
    async (status) => {
      await open();
      lista();
      const d = await dialog();
      d.confirmar();
      const r = http.expectOne(cursosUrl + '/93');
      if (!status) r.error(new ProgressEvent('error'));
      else r.flush({ mensaje: 'SQL secret' }, { status, statusText: 'Failure' });
      TestBed.tick();
      expect(d.error()).not.toBe('');
      expect(text()).toContain('Curso de prueba');
      expect(c.notice()).toBe('');
      expect(d.busy()).toBe(false);
      http.expectNone((r) => r.method === 'GET');
      d.confirmar();
      http.expectOne(cursosUrl + '/93').flush({}, { status: 409, statusText: 'Conflict' });
    },
  );
  it('reloads the complete week after deleting its last course', async () => {
    await open();
    lista();
    const d = await dialog();
    d.confirmar();
    http.expectOne(cursosUrl + '/93').flush(null, { status: 204, statusText: 'No Content' });
    await h.fixture.whenStable();
    const r = reqLista();
    expect(r.request.params.get('page')).toBe('0');
    expect(r.request.params.get('size')).toBe('100');
    r.flush(paginaCursos([]));
  });
  it('does not open a dialog or delete an ID absent from the real page', async () => {
    await open();
    lista();
    c.eliminar({ ...CURSO_TEST, id: 999 });
    expect(TestBed.inject(MatDialog).openDialogs.length).toBe(0);
    http.expectNone((r) => r.method === 'DELETE');
  });
  it.each(['pdf', 'txt'])(
    'imports the selected %s with actual FormData, guards duplicate POST and reloads after 201',
    async (extension) => {
      await open();
      lista([]);
      const file = new File(['test fixture'], 'horario.' + extension);
      select(file);
      c.importar();
      c.importar();
      c.guardar();
      const r = http.expectOne(uploadUrl);
      expect(Array.from(r.request.body.keys())).toEqual(['archivo']);
      expect((r.request.body.get('archivo') as File).name).toBe(file.name);
      expect(r.request.headers.has('Content-Type')).toBe(false);
      expect(c.importacion()).toBeNull();
      expect(c.mutation()).toBe('archivo');
      r.flush(ARCHIVO_TEST, { status: 201, statusText: 'Created' });
      lista();
      expect(text()).toContain(ARCHIVO_TEST.mensaje);
      expect(text()).toContain(ARCHIVO_TEST.nombreArchivo);
      expect(text()).toContain('Importación completada');
      expect(c.importacion()?.cursosOmitidos).toBe(0);
      expect(c.mutation()).toBeNull();
    },
  );
  it.each([0, 3])(
    'distinguishes processed files with no new courses and %i omitted conflicts',
    async (omitted) => {
      await open();
      lista([]);
      select(new File(['fixture'], 'horario.txt'));
      c.importar();
      http.expectOne(uploadUrl).flush(
        {
          ...ARCHIVO_TEST,
          cursosImportados: 0,
          cursosOmitidos: omitted,
          mensaje: 'No se añadieron cursos.',
        },
        { status: 201, statusText: 'Created' },
      );
      lista([]);
      expect(text()).toContain('Archivo procesado sin cursos nuevos');
      expect(text()).not.toContain('Importación completada');
      expect(c.importacion()?.cursosImportados).toBe(0);
    },
  );
  it.each([
    new File([], 'vacio.txt'),
    new File(['x'], 'archivo.exe'),
    new File([new Uint8Array(MAX_ARCHIVO_BYTES + 1)], 'grande.pdf'),
  ])('rejects invalid file $name without an upload', async (file) => {
    await open();
    lista([]);
    select(file);
    c.importar();
    expect(c.archivoError()).not.toBe('');
    http.expectNone(uploadUrl);
  });
  it('requires an actual file selection and accepts the exact 1 MiB boundary', async () => {
    await open();
    lista([]);
    c.importar();
    http.expectNone(uploadUrl);
    select(new File([new Uint8Array(MAX_ARCHIVO_BYTES)], 'limite.PDF'));
    c.importar();
    http
      .expectOne(uploadUrl)
      .flush({ ...ARCHIVO_TEST, cursosImportados: 0 }, { status: 201, statusText: 'Created' });
    lista([]);
  });
  it.each([
    [400, 'El contenido no es un PDF válido de hasta 1 MB'],
    [400, 'El PDF superó el tiempo máximo de procesamiento'],
    [400, 'El TXT debe contener texto UTF-8 válido'],
    [409, 'No se pudo reconocer el PDF con OCR'],
    [409, 'El archivo TXT está vacío'],
    [429, 'Too many requests'],
    [500, 'SQL secret'],
    [0, ''],
  ])(
    'handles import status %i (%s), preserves the selection and permits real retry',
    async (status, message) => {
      await open();
      lista();
      select(new File(['fixture'], 'horario.pdf'));
      c.importar();
      const r = http.expectOne(uploadUrl);
      if (!status) r.error(new ProgressEvent('error'));
      else r.flush({ mensaje: message }, { status: status as number, statusText: 'Failure' });
      h.detectChanges();
      expect(c.archivo()?.name).toBe('horario.pdf');
      expect(c.archivoError()).not.toBe('');
      expect(c.importacion()).toBeNull();
      expect(c.mutation()).toBeNull();
      expect(text()).not.toContain('SQL secret');
      http.expectNone((r) => r.method === 'GET');
      c.importar();
      http.expectOne(uploadUrl).flush(ARCHIVO_TEST, { status: 201, statusText: 'Created' });
      lista();
    },
  );
  it.each(['listado', 'registro', 'archivo', 'eliminacion'])(
    'uses the shared interceptor logout for a 401 during %s',
    async (action) => {
      await open();
      if (action === 'listado') reqLista().flush({}, { status: 401, statusText: 'Unauthorized' });
      else {
        lista();
        if (action === 'registro') {
          fill();
          c.guardar();
          lista([]);
          http
            .expectOne((r) => r.method === 'POST')
            .flush({}, { status: 401, statusText: 'Unauthorized' });
        } else if (action === 'archivo') {
          select(new File(['fixture'], 'horario.txt'));
          c.importar();
          http.expectOne(uploadUrl).flush({}, { status: 401, statusText: 'Unauthorized' });
        } else {
          const d = await dialog();
          d.confirmar();
          http.expectOne(cursosUrl + '/93').flush({}, { status: 401, statusText: 'Unauthorized' });
        }
      }
      await h.fixture.whenStable();
      expect(auth.isAuthenticated()).toBe(false);
      expect(TestBed.inject(Router).url).toBe('/auth/login');
      http.expectNone((r) => r.method === 'GET');
    },
  );
  it('protects the route when anonymous without calling course APIs', async () => {
    auth.clearSession();
    h = await RouterTestingHarness.create('/horarios');
    expect(TestBed.inject(Router).url).toBe('/auth/login');
    http.expectNone((r) => r.url.startsWith(cursosUrl));
  });
  it('requires a complete profile and does not bypass existing onboarding', async () => {
    login('PASAJERO', false);
    const pending = RouterTestingHarness.create('/horarios');
    await vi.waitFor(() =>
      http
        .expectOne('/api/perfil')
        .flush(
          { mensaje: 'Aún no has completado tu perfil' },
          { status: 404, statusText: 'Not Found' },
        ),
    );
    h = await pending;
    expect(TestBed.inject(Router).url).toBe('/configuracion/perfil');
    http.expectNone((r) => r.url.startsWith(cursosUrl));
  });
  it('cancels list and upload subscriptions when leaving the screen', async () => {
    await open();
    const get = reqLista();
    select(new File(['fixture'], 'horario.txt'));
    c.importar();
    const upload = http.expectOne(uploadUrl);
    await h.navigateByUrl('/configuracion');
    expect(get.cancelled).toBe(true);
    expect(upload.cancelled).toBe(true);
    http.expectNone((r) => r.method === 'GET');
  });
  it.each([
    { horaInicio: '05:59', horaFin: '07:00' },
    { horaInicio: '22:00', horaFin: '23:00:01' },
  ])('prevents saving outside 06:00–23:00 ($horaInicio–$horaFin)', async (times) => {
    await open();
    lista([]);
    c.cursos.at(0).setValue({ ...CURSO_REQUEST, ...times });
    c.guardar();
    h.detectChanges();
    expect(c.cursos.at(0).hasError('franja')).toBe(true);
    expect(text()).toContain('máximo a las 23:00');
    http.expectNone((r) => r.method === 'POST' || r.method === 'GET');
  });
  it('shows imported conflicts against the real schedule and keeps successfully imported courses', async () => {
    await open();
    lista();
    select(new File(['fixture'], 'horario.txt'));
    c.importar();
    http.expectOne(uploadUrl).flush(
      {
        ...ARCHIVO_TEST,
        cursosImportados: 1,
        cursosOmitidos: 1,
        mensaje:
          'Archivo subido correctamente. Se importaron 1 cursos. 1 omitidos por conflicto de horario: «Intentado» (Miercoles de 09:00 a 11:00). Elimina o edita el curso existente y vuelve a subir el archivo.',
      },
      { status: 201, statusText: 'Created' },
    );
    lista([CURSO_TEST, { ...CURSO_TEST, id: 94, nombre: 'Importado', dia: 'Viernes' }]);
    TestBed.tick();
    const popup = document.querySelector('app-conflictos-horario-dialog')!;
    expect(popup.textContent).toContain('Intentado');
    expect(popup.textContent).toContain('09:00–11:00');
    expect(popup.textContent).toContain('Curso de prueba');
    expect(popup.textContent).toContain('08:05–10:15:30');
    expect(c.lista().data?.length).toBe(2);
    http.expectNone((r) => r.method === 'DELETE');
  });
  it('warns about imported hours outside the UI range without falsely claiming rejection or deleting them', async () => {
    await open();
    lista([]);
    select(new File(['fixture'], 'horario.pdf'));
    c.importar();
    http.expectOne(uploadUrl).flush(ARCHIVO_TEST, { status: 201, statusText: 'Created' });
    lista([{ ...CURSO_TEST, nombre: 'Madrugada', horaInicio: '05:00', horaFin: '07:00' }]);
    TestBed.tick();
    expect(document.querySelector('app-conflictos-horario-dialog')!.textContent).toContain(
      'Madrugada',
    );
    expect(document.querySelector('app-conflictos-horario-dialog')!.textContent).toContain(
      'no se eliminaron automáticamente',
    );
    expect(c.lista().data?.length).toBe(1);
    http.expectNone((r) => r.method === 'DELETE');
  });
  it('cancels the post-import refresh when navigating away without opening a late popup', async () => {
    await open();
    lista([]);
    select(new File(['fixture'], 'horario.txt'));
    c.importar();
    http.expectOne(uploadUrl).flush(ARCHIVO_TEST, { status: 201, statusText: 'Created' });
    const refresh = reqLista();
    await h.navigateByUrl('/configuracion');
    expect(refresh.cancelled).toBe(true);
    expect(TestBed.inject(MatDialog).openDialogs).toEqual([]);
  });
  it.each(['archivo', 'conflicto'])(
    'does not reload or open a late popup after a 401 during the %s refresh',
    async (action) => {
      await open();
      lista([]);
      if (action === 'archivo') {
        select(new File(['fixture'], 'horario.txt'));
        c.importar();
        http.expectOne(uploadUrl).flush(ARCHIVO_TEST, { status: 201, statusText: 'Created' });
      } else {
        fill();
        c.guardar();
        lista([]);
        http
          .expectOne((r) => r.method === 'POST')
          .flush(
            { mensaje: 'Conflicto de horario: un curso existente' },
            { status: 409, statusText: 'Conflict' },
          );
      }
      reqLista().flush({}, { status: 401, statusText: 'Unauthorized' });
      await h.fixture.whenStable();
      expect(TestBed.inject(Router).url).toBe('/auth/login');
      expect(TestBed.inject(MatDialog).openDialogs).toEqual([]);
      http.expectNone((r) => r.method === 'GET');
    },
  );
});
