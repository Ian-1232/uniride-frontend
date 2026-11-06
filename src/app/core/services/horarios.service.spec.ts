import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { HorariosService } from './horarios.service';
import { AuthService } from './auth.service';
import { jwtInterceptor } from '../interceptors/jwt.interceptor';
import {
  ARCHIVO_TEST,
  CURSO_REQUEST,
  CURSO_TEST,
  paginaCursos,
} from '../../pages/horarios/horarios.testing';

describe('HorariosService HTTP contract', () => {
  let http: HttpTestingController;
  let service: HorariosService;
  let auth: AuthService;
  let token: string;
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([jwtInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(HorariosService);
    auth = TestBed.inject(AuthService);
    token =
      'eyJhbGciOiJIUzI1NiJ9.' +
      btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })) +
      '.signature';
    auth.login({ correo: 'cursos@upc.edu.pe', contrasena: 'Password1!' }).subscribe();
    http.expectOne('/api/auth/login').flush({
      token,
      mensaje: 'OK',
      usuario: {
        id: 11,
        nombre: 'Prueba',
        correo: 'cursos@upc.edu.pe',
        rol: 'PASAJERO',
        cuentaVerificada: true,
      },
    });
  });
  afterEach(() => {
    http.verify();
    auth.clearSession();
    localStorage.clear();
    sessionStorage.clear();
  });
  it('GETs the authenticated own page with the exact default parameters', () => {
    const next = vi.fn();
    service.listar().subscribe(next);
    const r = http.expectOne('/api/perfil/cursos?page=0&size=10');
    expect(r.request.headers.get('Authorization')).toBe('Bearer ' + token);
    expect(r.request.method).toBe('GET');
    expect(r.request.params.keys()).toEqual(['page', 'size']);
    r.flush(paginaCursos([]));
    expect(next).toHaveBeenCalledWith(paginaCursos([]));
  });
  it('sends explicit pagination without any userId', () => {
    service.listar(3, 5).subscribe();
    const r = http.expectOne('/api/perfil/cursos?page=3&size=5');
    expect(r.request.body).toBeNull();
    r.flush(paginaCursos([], 3, 27, 5));
  });
  it('POSTs an array with unchanged local time strings and accepts only HTTP 201', () => {
    const next = vi.fn();
    service.registrar([CURSO_REQUEST]).subscribe(next);
    const r = http.expectOne('/api/perfil/cursos');
    expect(r.request.method).toBe('POST');
    expect(r.request.body).toEqual([CURSO_REQUEST]);
    expect(r.request.params.keys()).toEqual([]);
    r.flush([CURSO_TEST], { status: 201, statusText: 'Created' });
    expect(next).toHaveBeenCalledWith([CURSO_TEST]);
  });
  it.each([200, 202])('does not consider unexpected POST status %i confirmed', (status) => {
    const error = vi.fn();
    service.registrar([CURSO_REQUEST]).subscribe({ error });
    http.expectOne('/api/perfil/cursos').flush([CURSO_TEST], { status, statusText: 'Unexpected' });
    expect(error).toHaveBeenCalled();
  });
  it('rejects an incoherent successful course response', () => {
    const error = vi.fn();
    service.registrar([CURSO_REQUEST]).subscribe({ error });
    http.expectOne('/api/perfil/cursos').flush([], { status: 201, statusText: 'Created' });
    expect(error).toHaveBeenCalled();
  });
  it('DELETEs the real course id and requires HTTP 204', () => {
    const next = vi.fn();
    service.eliminar(93).subscribe(next);
    const r = http.expectOne('/api/perfil/cursos/93');
    expect(r.request.method).toBe('DELETE');
    expect(r.request.body).toBeNull();
    r.flush(null, { status: 204, statusText: 'No Content' });
    expect(next).toHaveBeenCalled();
  });
  it('does not turn an unexpected DELETE 200 into success', () => {
    const error = vi.fn();
    service.eliminar(93).subscribe({ error });
    http.expectOne('/api/perfil/cursos/93').flush(null, { status: 200, statusText: 'OK' });
    expect(error).toHaveBeenCalled();
  });
  it.each(['pdf', 'txt'])(
    'uploads a real %s File under archivo without a multipart header',
    (extension) => {
      const file = new File(['test-only fixture'], 'horario.' + extension, {
        type: extension === 'pdf' ? 'application/pdf' : 'text/plain',
      });
      const next = vi.fn();
      service.importar(file).subscribe(next);
      const r = http.expectOne('/api/perfil/horarios/archivo');
      expect(r.request.method).toBe('POST');
      expect(r.request.body).toBeInstanceOf(FormData);
      expect(Array.from(r.request.body.keys())).toEqual(['archivo']);
      const uploaded = r.request.body.get('archivo') as File;
      expect(uploaded.name).toBe(file.name);
      expect(uploaded.size).toBe(file.size);
      expect(r.request.headers.has('Content-Type')).toBe(false);
      expect(r.request.detectContentTypeHeader()).toBeNull();
      expect(r.request.headers.get('Authorization')).toBe('Bearer ' + token);
      r.flush(ARCHIVO_TEST, { status: 201, statusText: 'Created' });
      expect(next).toHaveBeenCalledWith(ARCHIVO_TEST);
    },
  );
  it('accepts a real 201 with zero imported courses as a processed file result', () => {
    const next = vi.fn();
    service.importar(new File(['fixture'], 'archivo.txt')).subscribe(next);
    const result = { ...ARCHIVO_TEST, cursosImportados: 0, cursosOmitidos: 0 };
    http
      .expectOne('/api/perfil/horarios/archivo')
      .flush(result, { status: 201, statusText: 'Created' });
    expect(next).toHaveBeenCalledWith(result);
  });
  it.each([200, 201])('rejects an unconfirmed or malformed import response (%i)', (status) => {
    const error = vi.fn();
    service.importar(new File(['fixture'], 'archivo.txt')).subscribe({ error });
    http
      .expectOne('/api/perfil/horarios/archivo')
      .flush({ cursosImportados: -1 }, { status, statusText: 'Invalid' });
    expect(error).toHaveBeenCalled();
  });
  it('retrieves every page and rejects a changing or incomplete snapshot', () => {
    const error = vi.fn();
    service.listarTodos().subscribe({ error });
    http
      .expectOne('/api/perfil/cursos?page=0&size=100')
      .flush({ ...paginaCursos(), totalPages: 2, totalElements: 101 });
    http
      .expectOne('/api/perfil/cursos?page=1&size=100')
      .flush({ ...paginaCursos(), number: 1, totalPages: 2, totalElements: 100 });
    expect(error).toHaveBeenCalled();
    service.listarTodos().subscribe({ error });
    http
      .expectOne('/api/perfil/cursos?page=0&size=100')
      .flush({ ...paginaCursos(), totalElements: 2 });
    expect(error).toHaveBeenCalledTimes(2);
  });
  it('saves nonoverlapping rows and retains intra-batch conflicts after the first confirmed POST', () => {
    const next = vi.fn();
    const third = { ...CURSO_REQUEST, dia: 'Viernes' as const };
    service
      .registrarParcial([CURSO_REQUEST, { ...CURSO_REQUEST, nombre: 'Solapado' }, third])
      .subscribe(next);
    http.expectOne('/api/perfil/cursos?page=0&size=100').flush(paginaCursos([]));
    http
      .expectOne('/api/perfil/cursos')
      .flush([CURSO_TEST], { status: 201, statusText: 'Created' });
    const r = http.expectOne('/api/perfil/cursos');
    expect(r.request.body).toEqual([third]);
    r.flush([{ ...third, id: 94 }], { status: 201, statusText: 'Created' });
    expect(next.mock.calls[0][0].guardados.map((c: { indice: number }) => c.indice)).toEqual([
      0, 2,
    ]);
    expect(next.mock.calls[0][0].conflictos[0]).toMatchObject({
      indice: 1,
      existentes: [CURSO_TEST],
    });
  });
  it('refreshes a server 409 race and continues saving unrelated courses', () => {
    const next = vi.fn();
    const other = { ...CURSO_REQUEST, dia: 'Viernes' as const };
    service.registrarParcial([CURSO_REQUEST, other]).subscribe(next);
    http.expectOne('/api/perfil/cursos?page=0&size=100').flush(paginaCursos([]));
    http
      .expectOne('/api/perfil/cursos')
      .flush(
        { mensaje: 'Conflicto de horario: otra sesión añadió un curso' },
        { status: 409, statusText: 'Conflict' },
      );
    http.expectOne('/api/perfil/cursos?page=0&size=100').flush(paginaCursos([CURSO_TEST]));
    http
      .expectOne('/api/perfil/cursos')
      .flush([{ ...other, id: 94 }], { status: 201, statusText: 'Created' });
    expect(next.mock.calls[0][0].conflictos[0].existentes).toEqual([CURSO_TEST]);
    expect(next.mock.calls[0][0].guardados.length).toBe(1);
  });
  it('does not invent conflicts or send more courses if a conflict refresh fails', () => {
    const next = vi.fn();
    service.registrarParcial([CURSO_REQUEST, { ...CURSO_REQUEST, dia: 'Viernes' }]).subscribe(next);
    http.expectOne('/api/perfil/cursos?page=0&size=100').flush(paginaCursos([]));
    http
      .expectOne('/api/perfil/cursos')
      .flush(
        { mensaje: 'Conflicto de horario: curso existente' },
        { status: 409, statusText: 'Conflict' },
      );
    http.expectOne('/api/perfil/cursos?page=0&size=100').error(new ProgressEvent('error'));
    const result = next.mock.calls[0][0];
    expect(result.conflictos[0].existentes).toEqual([]);
    expect(result.pendientes).toEqual([1]);
    http.expectNone((r) => r.method === 'POST');
  });
  it('keeps prior confirmations and stops on a network failure without retrying a possibly persisted POST', () => {
    const next = vi.fn();
    service
      .registrarParcial([
        CURSO_REQUEST,
        { ...CURSO_REQUEST, dia: 'Viernes' },
        { ...CURSO_REQUEST, dia: 'Sábado' },
      ])
      .subscribe(next);
    http.expectOne('/api/perfil/cursos?page=0&size=100').flush(paginaCursos([]));
    http
      .expectOne('/api/perfil/cursos')
      .flush([CURSO_TEST], { status: 201, statusText: 'Created' });
    http.expectOne('/api/perfil/cursos').error(new ProgressEvent('error'));
    expect(next.mock.calls[0][0]).toMatchObject({
      guardados: [{ indice: 0, curso: CURSO_TEST }],
      fallos: [{ indice: 1 }],
      pendientes: [2],
    });
    http.expectNone((r) => r.method === 'POST');
  });
  it('unsubscribing cancels the current HTTP request and prevents remaining POSTs', () => {
    const sub = service.registrarParcial([CURSO_REQUEST, CURSO_REQUEST]).subscribe();
    http.expectOne('/api/perfil/cursos?page=0&size=100').flush(paginaCursos([]));
    const current = http.expectOne('/api/perfil/cursos');
    sub.unsubscribe();
    expect(current.cancelled).toBe(true);
    http.expectNone((r) => r.method === 'POST');
  });
});
