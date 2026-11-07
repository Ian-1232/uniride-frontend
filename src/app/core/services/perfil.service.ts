import { effect, inject, Injectable, signal, untracked } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  catchError,
  defer,
  finalize,
  Observable,
  of,
  shareReplay,
  tap,
  throwError,
  timeout,
} from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  InfoAdicionalRequest,
  PerfilRequest,
  PerfilRespuesta,
  perfilCompleto,
} from '../models/perfil.models';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly url = `${environment.apiUrl}/perfil`;
  private owner = this.auth.sessionVersion();
  private pending?: Observable<PerfilRespuesta | null>;
  private lastError: unknown;
  private readonly profile = signal<PerfilRespuesta | null>(null);
  readonly perfil = this.profile.asReadonly();
  private readonly loadState = signal<'unknown' | 'loading' | 'ready' | 'missing' | 'error'>(
    'unknown',
  );
  readonly status = this.loadState.asReadonly();
  private readonly writing = signal(false);
  readonly saving = this.writing.asReadonly();
  constructor() {
    effect(() => {
      this.auth.sessionVersion();
      untracked(() => this.ensureSession());
    });
  }
  private ensureSession(): number {
    const version = this.auth.sessionVersion();
    if (this.owner !== version) {
      this.owner = version;
      this.pending = undefined;
      this.lastError = undefined;
      this.profile.set(null);
      this.loadState.set('unknown');
      this.writing.set(false);
    }
    return version;
  }
  obtener(force = false): Observable<PerfilRespuesta | null> {
    const version = this.ensureSession();
    if (this.pending) return this.pending;
    if (!force && ['ready', 'missing'].includes(this.status())) return of(this.profile());
    if (!force && this.status() === 'error') return throwError(() => this.lastError);
    this.loadState.set('loading');
    this.pending = this.http.get<PerfilRespuesta>(this.url).pipe(
      timeout(15000),
      tap((perfil) => {
        if (version !== this.auth.sessionVersion()) throw new Error('Sesión cambiada');
        this.profile.set(perfil);
        this.loadState.set('ready');
      }),
      catchError((error) => {
        if (version !== this.auth.sessionVersion()) return throwError(() => error);
        if (
          error instanceof HttpErrorResponse &&
          error.status === 404 &&
          error.error?.mensaje === 'Aún no has completado tu perfil'
        ) {
          this.profile.set(null);
          this.loadState.set('missing');
          return of(null);
        }
        this.lastError = error;
        this.loadState.set('error');
        return throwError(() => error);
      }),
      finalize(() => {
        if (version === this.auth.sessionVersion()) this.pending = undefined;
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    return this.pending;
  }
  guardar(request: PerfilRequest): Observable<PerfilRespuesta> {
    return this.write('', request, true);
  }
  guardarInfoAdicional(request: InfoAdicionalRequest): Observable<PerfilRespuesta> {
    return this.write('/info-adicional', request, false);
  }
  private write(
    path: string,
    request: PerfilRequest | InfoAdicionalRequest,
    updateName: boolean,
  ): Observable<PerfilRespuesta> {
    return defer(() => {
      const version = this.ensureSession();
      if (this.saving()) return throwError(() => new Error('Guardado en curso'));
      this.writing.set(true);
      return this.http.put<PerfilRespuesta>(this.url + path, request).pipe(
        timeout(15000),
        tap((perfil) => {
          if (version !== this.auth.sessionVersion()) throw new Error('Sesión cambiada');
          if (
            !perfil ||
            !Number.isInteger(perfil.id) ||
            perfil.id <= 0 ||
            (updateName && !perfilCompleto(perfil, this.auth.currentRole())) ||
            (!updateName &&
              ![perfil.gustos, perfil.hobbies, perfil.datosCuriosos].every(
                (value) => typeof value === 'string' && !!value.trim(),
              ))
          )
            throw new Error('Respuesta de perfil inválida');
          this.profile.set(perfil);
          this.loadState.set('ready');
          this.lastError = undefined;
          if (updateName) this.auth.actualizarNombrePerfil(perfil);
        }),
        finalize(() => {
          if (version === this.auth.sessionVersion()) this.writing.set(false);
        }),
      );
    });
  }
}
