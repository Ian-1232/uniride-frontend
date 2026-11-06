import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  AuthRespuesta,
  LoginRequest,
  RegistroRequest,
  ReenviarCodigoRequest,
  RoleType,
  UserSession,
  UsuarioRespuesta,
  VerificarCodigoRequest,
} from '../models/auth.models';
import { environment } from '../../../environments/environment';

const DEFAULT_USER: UserSession = {
  id: 1,
  nombre: 'Juan Pérez',
  apellidos: 'Pérez',
  iniciales: 'JP',
  correo: 'juan.perez@upc.edu.pe',
  rol: 'CONDUCTOR',
  telefono: '987654321',
};

const STORAGE_KEY_USER = 'uniride_user';
const STORAGE_KEY_ROLE = 'uniride_rol';
const STORAGE_KEY_TOKEN = 'uniride_token';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly apiUrl = environment.apiUrl;

  private readonly _currentUser = signal<UserSession>(this.loadInitialUser());

  readonly currentUser = this._currentUser.asReadonly();
  readonly currentRole = computed(() => this._currentUser().rol);
  readonly isConductor = computed(() => this.currentRole() === 'CONDUCTOR');
  readonly isPasajero = computed(() => this.currentRole() === 'PASAJERO');
  readonly panelLabel = computed(() =>
    this.isConductor() ? 'Panel del conductor' : 'Panel del pasajero',
  );

  private loadInitialUser(): UserSession {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const storedUser = localStorage.getItem(STORAGE_KEY_USER);
        if (storedUser) {
          return JSON.parse(storedUser);
        }
        const storedRole = localStorage.getItem(STORAGE_KEY_ROLE) as RoleType | null;
        if (storedRole === 'CONDUCTOR' || storedRole === 'PASAJERO') {
          return { ...DEFAULT_USER, rol: storedRole };
        }
      }
    } catch {
      // Fallback a usuario por defecto si hay error de parseo o almacenamiento
    }
    return { ...DEFAULT_USER };
  }

  setRole(rol: RoleType): void {
    this._currentUser.update((prev) => {
      const updated = { ...prev, rol };
      this.persistUser(updated);
      return updated;
    });
  }

  setSession(user: Partial<UserSession> | UsuarioRespuesta, token?: string): void {
    this._currentUser.update((prev) => {
      const updated: UserSession = {
        ...prev,
        ...user,
        iniciales: this.computeInitials(user.nombre ?? prev.nombre, user.apellidos ?? prev.apellidos),
      };
      if (token) {
        updated.token = token;
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem(STORAGE_KEY_TOKEN, token);
          }
        } catch {}
      }
      this.persistUser(updated);
      return updated;
    });
  }

  clearSession(): void {
    this._currentUser.set({ ...DEFAULT_USER });
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(STORAGE_KEY_USER);
        localStorage.removeItem(STORAGE_KEY_ROLE);
        localStorage.removeItem(STORAGE_KEY_TOKEN);
      }
    } catch {}
  }

  getToken(): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem(STORAGE_KEY_TOKEN) || this._currentUser().token || null;
      }
    } catch {}
    return this._currentUser().token || null;
  }

  /**
   * Autenticación — Login (US02)
   * POST /api/auth/login
   */
  login(credentials: LoginRequest): Observable<AuthRespuesta> {
    const payload = {
      correo: credentials.correo,
      contrasena: credentials.contrasena,
    };
    return this.getHttpClient().post<AuthRespuesta>(`${this.apiUrl}/auth/login`, payload).pipe(
      tap((res) => {
        if (res.usuario) {
          this.setSession(res.usuario, res.token);
        } else if (res.token) {
          this.setSession({}, res.token);
        }
      }),
    );
  }

  /**
   * Autenticación — Registro inicial (US01)
   * POST /api/auth/registro
   */
  registro(data: RegistroRequest): Observable<AuthRespuesta> {
    return this.getHttpClient().post<AuthRespuesta>(`${this.apiUrl}/auth/registro`, data).pipe(
      tap((res) => {
        if (res.usuario) {
          this.setSession(res.usuario, res.token);
        } else if (res.token) {
          this.setSession({}, res.token);
        }
      }),
    );
  }

  /**
   * Autenticación — Verificación con código OTP (US01 / US02)
   * POST /api/auth/verificar
   */
  verificarCodigo(data: VerificarCodigoRequest): Observable<AuthRespuesta> {
    return this.getHttpClient().post<AuthRespuesta>(`${this.apiUrl}/auth/verificar`, data).pipe(
      tap((res) => {
        if (res.usuario) {
          this.setSession(res.usuario, res.token);
        } else if (res.token) {
          this.setSession({}, res.token);
        }
      }),
    );
  }

  /**
   * Autenticación — Reenviar código OTP (US01)
   * POST /api/auth/reenviar-codigo
   */
  reenviarCodigo(correo: string): Observable<AuthRespuesta> {
    const payload: ReenviarCodigoRequest = { correo };
    return this.getHttpClient().post<AuthRespuesta>(`${this.apiUrl}/auth/reenviar-codigo`, payload);
  }

  private getHttpClient(): HttpClient {
    if (!this.http) {
      throw new Error('HttpClient no está disponible. Asegúrate de configurar provideHttpClient().');
    }
    return this.http;
  }

  private persistUser(user: UserSession): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
        localStorage.setItem(STORAGE_KEY_ROLE, user.rol);
      }
    } catch {}
  }

  private computeInitials(nombre?: string, apellidos?: string): string {
    const n = nombre?.trim() || '';
    const a = apellidos?.trim() || '';
    if (n && a) {
      return (n[0] + a[0]).toUpperCase();
    }
    if (n) {
      return n.slice(0, 2).toUpperCase();
    }
    return 'JP';
  }
}
