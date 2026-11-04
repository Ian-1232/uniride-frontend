import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { LoginRespuesta, Usuario } from '../models/auth.model';
import { API_BASE_URL } from './api';

const TOKEN_KEY = 'token';
const USUARIO_KEY = 'usuario';

function hayAlmacenamiento(): boolean {
  return typeof localStorage !== 'undefined' && typeof sessionStorage !== 'undefined';
}

function leerToken(): string | null {
  if (!hayAlmacenamiento()) {
    return null;
  }
  try {
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function leerUsuario(): Usuario | null {
  if (!hayAlmacenamiento()) {
    return null;
  }
  try {
    const crudo = localStorage.getItem(USUARIO_KEY) ?? sessionStorage.getItem(USUARIO_KEY);
    return crudo ? (JSON.parse(crudo) as Usuario) : null;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tokenState = signal<string | null>(leerToken());
  private readonly usuarioState = signal<Usuario | null>(leerUsuario());

  readonly token = this.tokenState.asReadonly();
  readonly usuario = this.usuarioState.asReadonly();
  readonly estaAutenticado = computed(() => this.tokenState() !== null);

  login(correo: string, contrasena: string, recordar = true): Observable<LoginRespuesta> {
    return this.http
      .post<LoginRespuesta>(`${API_BASE_URL}/auth/login`, { correo, contrasena })
      .pipe(tap((respuesta) => this.guardarSesion(respuesta.token, respuesta.usuario, recordar)));
  }

  cerrarSesion(): void {
    this.limpiarSesion();
    void this.router.navigate(['/login']);
  }

  private guardarSesion(token: string, usuario: Usuario, recordar: boolean): void {
    this.limpiarAlmacenamiento();
    try {
      const destino = recordar ? localStorage : sessionStorage;
      destino.setItem(TOKEN_KEY, token);
      destino.setItem(USUARIO_KEY, JSON.stringify(usuario));
    } catch {
      // La sesión sigue activa en memoria aunque el navegador bloquee el almacenamiento.
    }
    this.tokenState.set(token);
    this.usuarioState.set(usuario);
  }

  private limpiarSesion(): void {
    this.limpiarAlmacenamiento();
    this.tokenState.set(null);
    this.usuarioState.set(null);
  }

  private limpiarAlmacenamiento(): void {
    if (!hayAlmacenamiento()) {
      return;
    }
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USUARIO_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USUARIO_KEY);
    } catch {
      // Sin acceso al almacenamiento no hay nada más que limpiar.
    }
  }
}
