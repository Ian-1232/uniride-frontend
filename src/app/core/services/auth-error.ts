import { HttpErrorResponse } from '@angular/common/http';

export function authError(error: HttpErrorResponse, fallback: string): string {
  if (error.status === 0 || error.status === 502 || error.status === 504 || String(error.name) === 'TimeoutError')
    return 'No se pudo conectar con el servicio. Intenta nuevamente en unos momentos.';
  if (error.status >= 500) return 'El servicio no está disponible temporalmente. Intenta más tarde.';
  if (error.status === 429) return 'Demasiados intentos o reenvío prematuro. Espera antes de volver a intentarlo.';
  const fields = error.status === 400 && error.error?.campos;
  if (fields && typeof fields === 'object') {
    const messages = Object.values(fields).filter((v): v is string => typeof v === 'string');
    if (messages.length) return messages.join('. ');
  }
  return typeof error.error?.mensaje === 'string' ? error.error.mensaje : fallback;
}

export function retrySeconds(error: HttpErrorResponse): number {
  const value = error.headers?.get('Retry-After');
  if (!value) return 60;
  const seconds = /^\d+$/.test(value) ? Number(value) : Math.ceil((Date.parse(value) - Date.now()) / 1000);
  return Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds, 86400) : 60;
}
