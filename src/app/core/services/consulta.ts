import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, defer, exhaustMap, map, Observable, of, startWith, Subject, timeout } from 'rxjs';
import { authError } from './auth-error';

export type EstadoConsulta<T> =
  | { estado: 'cargando'; data: T | null; mensaje: string }
  | { estado: 'disponible'; data: T; mensaje: string }
  | { estado: 'error'; data: T | null; mensaje: string };

// Carga única por pantalla, sin cachear datos personales entre sesiones: toSignal
// cancela la petición al destruir y exhaustMap descarta reintentos mientras existe
// una solicitud en vuelo. timeout(15000) evita una carga indefinida.
export function consultaQuery<T>(load: () => Observable<T>) {
  const reintentos = new Subject<void>();
  const cargando: EstadoConsulta<T> = { estado: 'cargando', data: null, mensaje: '' };
  const state = toSignal(
    reintentos.pipe(
      startWith(undefined),
      exhaustMap(() =>
        defer(load).pipe(
          timeout(15000),
          map((data): EstadoConsulta<T> => ({ estado: 'disponible', data, mensaje: '' })),
          catchError((error) =>
            of<EstadoConsulta<T>>({
              estado: 'error',
              data: null,
              mensaje: authError(error, 'No se pudo cargar la información. Intenta nuevamente.'),
            }),
          ),
          startWith(cargando),
        ),
      ),
    ),
    { initialValue: cargando },
  );
  return { state, retry: () => reintentos.next() };
}
