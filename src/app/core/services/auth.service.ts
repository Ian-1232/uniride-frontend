import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, map, of, shareReplay, tap, throwError, timeout } from 'rxjs';
import { AuthRespuesta, LoginRequest, RegistroRequest, UserSession, UsuarioRespuesta, VerificarCodigoRequest } from '../models/auth.models';
import { environment } from '../../../environments/environment';

const TOKEN_KEY = 'uniride_token';

// Only syntax and expiry: the server verifies the signature through /usuarios/me.
export function usableJwt(token: unknown): token is string {
  if (typeof token !== 'string' || !/^[\w-]+\.[\w-]+\.[\w-]+$/.test(token)) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
  } catch { return false; }
}
function validUser(user: UsuarioRespuesta | null | undefined): user is UsuarioRespuesta {
  return !!user && Number.isInteger(user.id) && user.id! > 0 &&
    typeof user.nombre === 'string' && !!user.nombre.trim() &&
    typeof user.correo === 'string' && user.correo.includes('@') &&
    user.cuentaVerificada === true && ['CONDUCTOR', 'PASAJERO'].includes(user.rol);
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = environment.apiUrl;
  private readonly user = signal<UserSession | null>(null);
  private token: string | null = null;
  private revision = 0;
  private restoration?: Observable<boolean>;
  private recoveredStorage?: Storage;
  private expiryTimer?: ReturnType<typeof setTimeout>;
  readonly currentUser = this.user.asReadonly();
  readonly currentRole = computed(() => this.user()?.rol ?? null);
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly isConductor = computed(() => this.currentRole() === 'CONDUCTOR');
  readonly isPasajero = computed(() => this.currentRole() === 'PASAJERO');
  readonly panelLabel = computed(() => this.isConductor() ? 'Panel del conductor' : this.isPasajero() ? 'Panel del pasajero' : 'UniRide');

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.expiryTimer));
  }

  getToken(): string | null { return this.token; }
  clearSession(): void {
    clearTimeout(this.expiryTimer);
    this.revision++;
    this.token = null;
    this.user.set(null);
    for (const storage of this.storages()) {
      for (const key of [TOKEN_KEY, 'uniride_user', 'uniride_rol']) {
        try { storage.removeItem(key); } catch { /* Storage disabled. */ }
      }
    }
  }
  logout(): void {
    this.clearSession();
    void this.router.navigate(['/auth/login']);
  }
  restoreSession(): Observable<boolean> {
    if (this.restoration) return this.restoration;
    if (this.user() && usableJwt(this.token)) return of(true);
    const stored = this.token ?? this.readToken();
    this.clearSession();
    if (!usableJwt(stored)) return of(false);
    this.token = stored;
    const revision = this.revision;
    this.restoration = this.http.get<UsuarioRespuesta>(`${this.apiUrl}/usuarios/me`).pipe(
      timeout(10000),
      map(user => {
        if (revision !== this.revision) return false;
        if (!validUser(user) || !usableJwt(stored)) throw new Error('Sesión inválida');
        this.acceptUser(user);
        try { this.recoveredStorage?.setItem(TOKEN_KEY, stored); } catch { /* In-memory session. */ }
        return true;
      }),
      catchError(() => {
        if (revision === this.revision) this.clearSession();
        return of(false);
      }),
      finalize(() => { this.restoration = undefined; }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.restoration;
  }
  login(credentials: LoginRequest): Observable<AuthRespuesta> {
    this.clearSession();
    const revision = this.revision;
    return this.http.post<AuthRespuesta>(`${this.apiUrl}/auth/login`, {
      correo: credentials.correo.trim().toLowerCase(), contrasena: credentials.contrasena,
    }).pipe(timeout(15000), tap(res => {
      if (revision !== this.revision) throw new Error('Solicitud cancelada');
      if (!usableJwt(res.token) || !validUser(res.usuario) ||
          res.usuario.correo.toLowerCase() !== credentials.correo.trim().toLowerCase()) {
        throw new Error('Respuesta de autenticación inválida');
      }
      this.token = res.token;
      this.acceptUser(res.usuario);
      try {
        (credentials.recordarDispositivo ? localStorage : sessionStorage).setItem(TOKEN_KEY, res.token);
      } catch { /* In-memory session. */ }
    }), catchError(error => {
      if (revision === this.revision) this.clearSession();
      return throwError(() => error);
    }));
  }
  registro(data: RegistroRequest): Observable<AuthRespuesta> {
    return this.http.post<AuthRespuesta>(`${this.apiUrl}/auth/registro`, data).pipe(timeout(15000));
  }
  verificarCodigo(data: VerificarCodigoRequest): Observable<AuthRespuesta> {
    return this.http.post<AuthRespuesta>(`${this.apiUrl}/auth/verificar`, data).pipe(timeout(15000));
  }
  reenviarCodigo(correo: string): Observable<AuthRespuesta> {
    return this.http.post<AuthRespuesta>(`${this.apiUrl}/auth/reenviar-codigo`, { correo }).pipe(timeout(15000));
  }
  private acceptUser(user: UsuarioRespuesta): void {
    const iniciales = ((user.nombre[0] ?? '') + (user.apellidos?.[0] ?? '')).toUpperCase();
    this.user.set(Object.freeze({ ...user, iniciales }));
    this.scheduleExpiry();
  }
  private scheduleExpiry(): void {
    clearTimeout(this.expiryTimer);
    if (!this.token) return;
    const payload = JSON.parse(atob(this.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    const remaining = payload.exp * 1000 - Date.now();
    this.expiryTimer = setTimeout(() => {
      if (usableJwt(this.token)) this.scheduleExpiry();
      else this.logout();
    }, Math.max(0, Math.min(remaining, 2147483647)));
  }
  private storages(): Storage[] {
    const result: Storage[] = [];
    try { result.push(sessionStorage); } catch { /* Unavailable. */ }
    try { result.push(localStorage); } catch { /* Unavailable. */ }
    return result;
  }
  private readToken(): string | null {
    for (const storage of this.storages()) {
      try {
        const token = storage.getItem(TOKEN_KEY);
        if (token) { this.recoveredStorage = storage; return token; }
      } catch { /* Try next storage. */ }
    }
    return null;
  }
}
