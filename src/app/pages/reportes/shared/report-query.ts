import { toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, defer, exhaustMap, map, Observable, of, startWith, Subject, timeout } from 'rxjs';

export type ReportQueryState<T> =
  | { status: 'cargando'; data: null; message: string }
  | { status: 'disponible'; data: T; message: string }
  | { status: 'error'; data: null; message: string };

export function reportError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 401) return 'Tu sesión ya no es válida. Inicia sesión nuevamente.';
    if (error.status === 403) return 'Tu cuenta no tiene permiso para consultar este reporte.';
    if (error.status === 0) return 'No se pudo conectar con el servicio. Comprueba tu conexión y reintenta.';
    if (error.status >= 500) return 'El servidor no pudo procesar el reporte. Intenta nuevamente más tarde.';
  }
  return 'No se pudo cargar el reporte. Intenta nuevamente.';
}

// Per-screen state, without caching personal data across sessions. toSignal cancels
// the subscription on destruction; exhaustMap suppresses repeated in-flight retries.
export function reportQuery<T>(load: () => Observable<T>) {
  const retries = new Subject<void>();
  const loading: ReportQueryState<T> = { status: 'cargando', data: null, message: '' };
  const state = toSignal(retries.pipe(
    startWith(undefined),
    exhaustMap(() => defer(load).pipe(
      timeout(15000),
      map((data): ReportQueryState<T> => ({ status: 'disponible', data, message: '' })),
      catchError(error => of<ReportQueryState<T>>({ status: 'error', data: null, message: reportError(error) })),
      startWith(loading),
    )),
  ), { initialValue: loading });
  return { state, retry: () => retries.next() };
}
