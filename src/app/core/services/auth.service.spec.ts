import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router, UrlTree, ActivatedRouteSnapshot, RouterStateSnapshot, CanActivateFn } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { authGuard, conductorGuard, pasajeroGuard } from '../guards/auth.guard';
import { jwtInterceptor } from '../interceptors/jwt.interceptor';
import { routes } from '../../app.routes';

// Synthetic JWT used only in isolated HTTP tests; never accepted without a backend response.
const jwt = (exp = Math.floor(Date.now() / 1000) + 3600) =>
  btoa(JSON.stringify({ alg: 'HS256' })) + '.' + btoa(JSON.stringify({ exp })) + '.signature';
const user = { id: 7, correo: 'alumna@upc.edu.pe', nombre: 'Ana', apellidos: 'Torres', rol: 'PASAJERO' as const, cuentaVerificada: true };
const credentials = { correo: user.correo, contrasena: 'TestPassword1!' };
const registro = { ...credentials, nombre: 'Ana', apellidos: 'Torres', telefono: '987654321', rol: 'PASAJERO' as const, aceptaTerminos: true };

describe('Real authentication contract (mock HTTP only)', () => {
  let auth: AuthService;
  let http: HttpTestingController;
  let client: HttpClient;
  let router: Router;
  beforeEach(() => {
    localStorage.clear(); sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(withInterceptors([jwtInterceptor])), provideHttpClientTesting()] });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });
  afterEach(() => { http.verify(); localStorage.clear(); sessionStorage.clear(); });
  function login(remember = false) {
    const token = jwt();
    auth.login({ ...credentials, recordarDispositivo: remember }).subscribe();
    const req = http.expectOne('/api/auth/login');
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(req.request.body).toEqual(credentials);
    req.flush({ token, usuario: user, mensaje: 'OK' });
    return token;
  }
  async function runGuard(guard: CanActivateFn) {
    const result = TestBed.runInInjectionContext(() => guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
    return result instanceof Observable ? firstValueFrom(result) : result;
  }
  it('starts anonymous and ignores forged local users and roles', async () => {
    localStorage.setItem('uniride_user', JSON.stringify(user));
    localStorage.setItem('uniride_rol', 'CONDUCTOR');
    expect(auth.currentUser()).toBeNull();
    expect(auth.currentRole()).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
    expect(await firstValueFrom(auth.restoreSession())).toBe(false);
    expect(localStorage.getItem('uniride_user')).toBeNull();
  });
  it('registers with HTTP 201 and token=null without authenticating', () => {
    auth.registro(registro).subscribe(res => expect(res.token).toBeNull());
    const req = http.expectOne('/api/auth/registro');
    expect(req.request.body).toEqual(registro);
    req.flush({ token: null, usuario: { ...user, cuentaVerificada: false }, mensaje: 'Registrado' }, { status: 201, statusText: 'Created' });
    expect(auth.currentUser()).toBeNull(); expect(auth.getToken()).toBeNull();
    expect(JSON.stringify(localStorage)).not.toContain(credentials.contrasena);
  });
  it('verifies OTP with token=null without authenticating', () => {
    auth.verificarCodigo({ correo: user.correo, codigo: '654321' }).subscribe();
    const req = http.expectOne('/api/auth/verificar');
    expect(req.request.body).toEqual({ correo: user.correo, codigo: '654321' });
    req.flush({ token: null, usuario: user, mensaje: 'Verificado' });
    expect(auth.currentUser()).toBeNull(); expect(auth.getToken()).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });
  it('resends OTP without creating a session', () => {
    auth.reenviarCodigo(user.correo).subscribe();
    const req = http.expectOne('/api/auth/reenviar-codigo');
    expect(req.request.body).toEqual({ correo: user.correo });
    req.flush({ token: null, usuario: null, mensaje: 'Enviado' });
    expect(auth.isAuthenticated()).toBe(false);
  });
  it('accepts a coherent successful login and remembers only the token', () => {
    const token = login(true);
    expect(auth.currentUser()?.iniciales).toBe('AT');
    expect(auth.isPasajero()).toBe(true);
    expect(localStorage.getItem('uniride_token')).toBe(token);
    expect(localStorage.length).toBe(1);
    expect(sessionStorage.length).toBe(0);
  });
  it.each([0, 400, 401, 403, 404, 409, 429, 500])('fails closed on HTTP %s', status => {
    let failed = false;
    auth.login(credentials).subscribe({ error: () => { failed = true; } });
    const req = http.expectOne('/api/auth/login');
    if (status === 0) req.error(new ProgressEvent('error'));
    else req.flush({ mensaje: 'Error' }, { status, statusText: 'Error' });
    expect(failed).toBe(true); expect(auth.currentUser()).toBeNull(); expect(auth.getToken()).toBeNull();
  });
  it.each([null, 'demo-token-offline', jwt(1)])('rejects missing, demo or expired login tokens: %s', token => {
    const error = vi.fn();
    auth.login(credentials).subscribe({ error });
    http.expectOne('/api/auth/login').flush({ token, usuario: user, mensaje: 'OK' });
    expect(error).toHaveBeenCalled(); expect(auth.isAuthenticated()).toBe(false);
  });
  it.each([{ ...user, cuentaVerificada: false }, { ...user, rol: 'ADMIN' }, { ...user, correo: 'otro@upc.edu.pe' }, null])('rejects incoherent login users', usuario => {
    const error = vi.fn();
    auth.login(credentials).subscribe({ error });
    http.expectOne('/api/auth/login').flush({ token: jwt(), usuario, mensaje: 'OK' });
    expect(error).toHaveBeenCalled(); expect(auth.getToken()).toBeNull();
  });
  it('logs out, erases storage and navigates to login', () => {
    login(); auth.logout();
    expect(auth.currentUser()).toBeNull(); expect(auth.getToken()).toBeNull();
    expect(sessionStorage.length).toBe(0); expect(localStorage.length).toBe(0);
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });
  it('ends the session when the JWT expires while the page is open', () => {
    vi.useFakeTimers();
    try {
      login();
      vi.advanceTimersByTime(3600001);
      expect(auth.isAuthenticated()).toBe(false);
      expect(auth.getToken()).toBeNull();
      expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
    } finally { vi.useRealTimers(); }
  });
  it('recovers only after /me responds and shares concurrent validation', async () => {
    const token = jwt(); localStorage.setItem('uniride_token', token);
    const first = firstValueFrom(auth.restoreSession());
    const second = firstValueFrom(auth.restoreSession());
    expect(auth.isAuthenticated()).toBe(false);
    const req = http.expectOne('/api/usuarios/me');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    req.flush(user);
    expect(await first).toBe(true); expect(await second).toBe(true);
    expect(auth.currentRole()).toBe('PASAJERO');
    expect(localStorage.getItem('uniride_token')).toBe(token);
  });
  it.each([401, 403, 500])('clears recovered session when /me fails with %s', async status => {
    localStorage.setItem('uniride_token', jwt());
    const result = firstValueFrom(auth.restoreSession());
    http.expectOne('/api/usuarios/me').flush({}, { status, statusText: 'Error' });
    expect(await result).toBe(false); expect(auth.currentUser()).toBeNull(); expect(auth.getToken()).toBeNull();
  });
  it.each(['demo-token-offline', jwt(1), 'garbage'])('rejects invalid stored token without a request', async token => {
    localStorage.setItem('uniride_token', token);
    expect(await firstValueFrom(auth.restoreSession())).toBe(false);
    http.expectNone('/api/usuarios/me');
  });
  it('does not resurrect a session after logout during validation', async () => {
    sessionStorage.setItem('uniride_token', jwt());
    const result = firstValueFrom(auth.restoreSession());
    const req = http.expectOne('/api/usuarios/me'); auth.logout(); req.flush(user);
    expect(await result).toBe(false); expect(auth.currentUser()).toBeNull();
  });
  it('redirects anonymous visitors for every private guard', async () => {
    for (const guard of [authGuard, conductorGuard, pasajeroGuard]) {
      const result = await runGuard(guard);
      expect(result instanceof UrlTree).toBe(true);
      expect(router.serializeUrl(result as UrlTree)).toBe('/auth/login');
    }
  });
  it('authorizes the server role and ignores local role edits', async () => {
    login(); localStorage.setItem('uniride_rol', 'CONDUCTOR');
    expect(await runGuard(pasajeroGuard)).toBe(true);
    const result = await runGuard(conductorGuard);
    expect(router.serializeUrl(result as UrlTree)).toBe('/pasajero/dashboard');
  });
  it('restricts passenger routes for a conductor', async () => {
    auth.login(credentials).subscribe();
    http.expectOne('/api/auth/login').flush({ token: jwt(), usuario: { ...user, rol: 'CONDUCTOR' }, mensaje: 'OK' });
    expect(await runGuard(conductorGuard)).toBe(true);
    expect(router.serializeUrl(await runGuard(pasajeroGuard) as UrlTree)).toBe('/conductor/dashboard');
  });
  it('protects private route parents and child navigation', () => {
    for (const path of ['conductor', 'pasajero', 'reportes', 'compensaciones', 'contribucion']) {
      const route = routes.find(r => r.path === path)!;
      expect(route.canActivate?.length).toBeGreaterThan(0);
      expect(route.canActivateChild?.length).toBeGreaterThan(0);
    }
  });
  it('sends Bearer only to our private API', () => {
    const token = login();
    for (const url of ['/api/usuarios/me', 'https://external.example/api/usuarios/me', '/api-extra/data', '/assets/icon.svg', '/api/auth/reenviar-codigo']) {
      client.get(url).subscribe(); const req = http.expectOne(url);
      expect(req.request.headers.get('Authorization')).toBe(url === '/api/usuarios/me' ? `Bearer ${token}` : null);
      req.flush({});
    }
  });
  it('invalidates on private 401, retains the session on 403', () => {
    login();
    client.get('/api/private').subscribe({ error: () => {} });
    http.expectOne('/api/private').flush({}, { status: 403, statusText: 'Forbidden' });
    expect(auth.isAuthenticated()).toBe(true); expect(router.navigate).not.toHaveBeenCalled();
    client.get('/api/private').subscribe({ error: () => {} });
    http.expectOne('/api/private').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.isAuthenticated()).toBe(false); expect(router.navigate).toHaveBeenCalledTimes(1);
  });
});
