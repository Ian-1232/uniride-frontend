import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { FormGroup } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { jwtInterceptor } from '../../../core/interceptors/jwt.interceptor';
import { ReportesService } from '../../../core/services/reportes.service';
import { routes } from '../../../app.routes';
import { ExportarHistorial } from './exportar-historial';
import { localIsoDate } from './exportar-historial.models';
import { pdfFilename } from './historial-pdf';

describe('US22 export integration (mock HTTP and browser downloads)', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<ExportarHistorial>;
  let auth: AuthService;
  let token: string;
  let downloads: { href: string; filename: string }[];
  let createUrl: ReturnType<typeof vi.fn<(value: Blob | MediaSource) => string>>;
  let revokeUrl: ReturnType<typeof vi.fn<(url: string) => void>>;
  const pdf = () => new Blob(['%PDF-1.7\nfixture only\n%%EOF'], { type: 'application/pdf' });
  const endpoint = '/api/historial/pdf';
  beforeEach(() => {
    localStorage.clear(); sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [ExportarHistorial],
      providers: [provideRouter(routes), provideHttpClient(withInterceptors([jwtInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    token = 'eyJhbGciOiJIUzI1NiJ9.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })) + '.signature';
    auth.login({ correo: 'pdf@upc.edu.pe', contrasena: 'Password1!' }).subscribe();
    http.expectOne('/api/auth/login').flush({ token, mensaje: 'OK', usuario: { id: 3, correo: 'pdf@upc.edu.pe', nombre: 'Test', rol: 'CONDUCTOR', cuentaVerificada: true } });
    downloads = [];
    createUrl = vi.fn(() => 'blob:uniride-test'); revokeUrl = vi.fn();
    const OriginalURL = URL;
    vi.stubGlobal('URL', class extends OriginalURL {
      static override createObjectURL = createUrl;
      static override revokeObjectURL = revokeUrl;
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push({ href: this.href, filename: this.download });
    });
    fixture = TestBed.createComponent(ExportarHistorial);
    fixture.detectChanges();
  });
  afterEach(() => {
    fixture.destroy(); http.verify(); auth.clearSession();
    vi.restoreAllMocks(); vi.unstubAllGlobals();
    localStorage.clear(); sessionStorage.clear();
  });
  function form(): FormGroup {
    return (fixture.componentInstance as unknown as { form: FormGroup }).form;
  }
  function submit() {
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  }
  function request() { return http.expectOne(req => req.url === endpoint); }
  function text(): string { return fixture.nativeElement.textContent; }
  async function settled(message: string) {
    await vi.waitFor(() => {
      fixture.detectChanges(); expect(text()).toContain(message);
    });
  }

  it('starts without fake dates or a download and requests Blob via the existing JWT interceptor', async () => {
    expect(form().getRawValue()).toEqual({ desde: null, hasta: null, tipo: 'todos' });
    http.expectNone(endpoint);
    submit();
    expect(text()).toContain('Preparando PDF');
    const req = request();
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    expect(req.request.responseType).toBe('blob');
    expect(req.request.params.keys()).toEqual(['tipo']);
    expect(req.request.params.get('tipo')).toBe('todos');
    expect(req.request.body).toBeNull();
    req.flush(pdf(), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="mis-viajes.pdf"' } });
    await settled('Descarga iniciada: mis-viajes.pdf');
    expect(downloads).toEqual([{ href: 'blob:uniride-test', filename: 'mis-viajes.pdf' }]);
    expect(createUrl).toHaveBeenCalledTimes(1);
    expect(document.body.querySelector('a[download]')).toBeNull();
    expect(fixture.nativeElement.querySelector('button[type=submit]').disabled).toBe(false);
    await vi.waitFor(() => expect(revokeUrl).toHaveBeenCalledWith('blob:uniride-test'), { timeout: 2000 });
  });
  it.each(['todos', 'conductor', 'pasajero'])('passes exact optional filters and type %s', tipo => {
    form().patchValue({ desde: new Date(2026, 0, 9, 23, 59), hasta: new Date(2026, 1, 10), tipo });
    submit(); const req = request();
    expect(req.request.params.get('desde')).toBe('2026-01-09');
    expect(req.request.params.get('hasta')).toBe('2026-02-10');
    expect(req.request.params.get('tipo')).toBe(tipo);
    expect(req.request.params.keys().sort()).toEqual(['desde', 'hasta', 'tipo']);
    req.flush(new Blob(), { status: 500, statusText: 'Error' });
  });
  it.each(['desde', 'hasta'])('omits the other date for a partial %s range', key => {
    TestBed.inject(ReportesService).exportarHistorial({ desde: null, hasta: null, tipo: 'todos', [key]: new Date(2026, 10, 6) }).subscribe();
    const req = request();
    expect(req.request.params.get(key)).toBe('2026-11-06');
    expect(req.request.params.has(key === 'desde' ? 'hasta' : 'desde')).toBe(false);
    req.flush(pdf());
  });
  it('serializes local calendar components rather than using UTC conversion', () => {
    const date = new Date(2026, 2, 8, 23, 59, 59);
    vi.spyOn(date, 'toISOString').mockImplementation(() => { throw new Error('Must not use UTC'); });
    expect(localIsoDate(date)).toBe('2026-03-08');
  });
  it('does not emit HTTP for an invalid range', () => {
    form().patchValue({ desde: new Date(2026, 10, 7), hasta: new Date(2026, 10, 6) });
    submit();
    http.expectNone(endpoint); expect(downloads).toEqual([]);
    expect(text()).toContain('La fecha Desde no puede ser posterior');
  });
  it('suppresses duplicate submissions and permits a new export after success', async () => {
    submit(); submit(); submit();
    const req = request(); expect(form().disabled).toBe(true);
    req.flush(pdf(), { headers: { 'Content-Type': 'application/pdf' } });
    await settled('Descarga iniciada: historial-viajes.pdf');
    expect(form().enabled).toBe(true);
    submit(); request().flush(pdf(), { headers: { 'Content-Type': 'application/pdf' } });
    await vi.waitFor(() => expect(downloads.length).toBe(2));
    expect(downloads.every(file => file.filename === 'historial-viajes.pdf')).toBe(true);
  });
  it('409 JSON Blob shows no history without downloading and can retry', async () => {
    submit(); request().flush(new Blob([JSON.stringify({ mensaje: 'No hay historial para exportar' })], { type: 'application/json' }), { status: 409, statusText: 'Conflict' });
    await settled('No hay historial para exportar');
    expect(downloads.length).toBe(0); expect(createUrl).not.toHaveBeenCalled();
    fixture.nativeElement.querySelector('app-reportes-state-panel button').click();
    fixture.detectChanges(); request().flush(pdf(), { headers: { 'Content-Type': 'application/pdf' } });
    await settled('Descarga iniciada');
  });
  it('409 with a different backend business error is not mislabeled as empty history', async () => {
    submit(); request().flush(new Blob(['{"mensaje":"No se pudo generar el PDF del historial"}'], { type: 'application/json' }), { status: 409, statusText: 'Conflict' });
    await settled('No se pudo generar el PDF'); expect(downloads.length).toBe(0);
    expect(text()).not.toContain('No hay historial para exportar');
  });
  it.each([400, 403, 500, 0])('handles HTTP %s safely and retries with a real request', async status => {
    submit(); const req = request();
    if (status === 0) req.error(new ProgressEvent('error'));
    else req.flush(new Blob(['{"mensaje":"Private SQL details"}'], { type: 'application/json' }), { status, statusText: 'Error' });
    await settled(status === 400 ? 'filtros no son válidos' : status === 403 ? 'permiso' : status === 500 ? 'servidor' : 'conectar');
    expect(text()).not.toContain('Private SQL'); expect(createUrl).not.toHaveBeenCalled();
    fixture.nativeElement.querySelector('app-reportes-state-panel button').click();
    fixture.detectChanges(); request().flush(pdf(), { headers: { 'Content-Type': 'application/pdf' } });
    await settled('Descarga iniciada');
    if (status === 403) expect(auth.isAuthenticated()).toBe(true);
  });
  it('401 follows the shared interceptor logout and never downloads', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    submit(); request().flush(new Blob(['{}']), { status: 401, statusText: 'Unauthorized' });
    await settled('Inicia sesión');
    expect(auth.isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/auth/login']);
    expect(createUrl).not.toHaveBeenCalled();
  });
  it.each(['', 'not JSON', '{broken'])('handles malformed Blob error bodies without leaking text: %s', async body => {
    submit(); request().flush(new Blob([body]), { status: 409, statusText: 'Conflict' });
    await settled('No se pudo generar el PDF'); expect(createUrl).not.toHaveBeenCalled();
  });
  it.each([
    [new Blob([], { type: 'application/pdf' }), 'application/pdf'],
    [new Blob(['{"mensaje":"not a PDF"}'], { type: 'application/json' }), 'application/json'],
    [new Blob(['invalid PDF bytes'], { type: 'application/pdf' }), 'application/pdf'],
  ])('rejects empty or invalid successful responses', async (body, contentType) => {
    submit(); request().flush(body, { headers: { 'Content-Type': contentType } });
    await settled('No se pudo preparar o descargar el PDF');
    expect(createUrl).not.toHaveBeenCalled(); expect(downloads.length).toBe(0);
    expect(form().enabled).toBe(true);
  });
  it('cancels pending HTTP when leaving the screen', () => {
    submit(); const req = request(); fixture.destroy();
    expect(req.cancelled).toBe(true); expect(createUrl).not.toHaveBeenCalled();
  });
  it('ignores URL demonstration states and does not prefill filters', async () => {
    const h = await RouterTestingHarness.create('/reportes/exportar?estado=descargado');
    expect(h.routeNativeElement?.textContent).not.toContain('Descarga iniciada');
    expect(h.routeNativeElement?.textContent).not.toContain('Demostración');
    http.expectNone(endpoint);
  });
  it('does not send credentials to external origins', () => {
    TestBed.inject(HttpClient).get('https://external.example/historial/pdf').subscribe();
    const req = http.expectOne('https://external.example/historial/pdf');
    expect(req.request.headers.has('Authorization')).toBe(false); req.flush({});
  });
});

describe('PDF download filename', () => {
  it.each([
    [null, 'historial-viajes.pdf'],
    ['attachment; filename="viajes-personales.pdf"', 'viajes-personales.pdf'],
    ["attachment; filename*=UTF-8''viajes%20noviembre.pdf", 'viajes noviembre.pdf'],
    ['attachment; filename="../../secret.pdf"', 'historial-viajes.pdf'],
    ['attachment; filename="C:\\data.pdf"', 'historial-viajes.pdf'],
    ['attachment; filename="report.html"', 'historial-viajes.pdf'],
    ['attachment; filename="bad\nname.pdf"', 'historial-viajes.pdf'],
    ["attachment; filename*=UTF-8''%XX.pdf", 'historial-viajes.pdf'],
  ])('uses a safe filename for %s', (header, expected) => {
    expect(pdfFilename(header)).toBe(expected);
  });
});
