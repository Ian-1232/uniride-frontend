import { signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import {
  catchError,
  defer,
  finalize,
  map,
  Observable,
  of,
  startWith,
  Subject,
  switchMap,
} from 'rxjs';

export function pasajeroError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 401) return 'Tu sesión ya no es válida. Inicia sesión nuevamente.';
    if (error.status === 403) return 'No tienes permiso para realizar esta operación.';
    if (error.status === 404)
      return 'El recurso no está disponible. En búsquedas por cercanía, comprueba que tu perfil tenga un distrito.';
    if (error.status === 400)
      return 'Revisa los filtros o los datos enviados. Para cercanía necesitas un distrito en tu perfil.';
    if (error.status === 409) {
      const known = [
        'Ya enviaste una solicitud para este viaje',
        'La ruta ya no tiene cupos disponibles',
        'El viaje ya ocurrió',
        'No puedes solicitar un viaje de tu propia ruta',
        'No puedes solicitar viajes de una ruta eliminada',
        'El método de compensación seleccionado está desactivado',
        'Tu solicitud ya fue cancelada',
      ];
      return known.includes(error.error?.mensaje)
        ? error.error.mensaje
        : 'La solicitud o el viaje ya no admite esta operación. Actualiza los datos antes de intentarlo nuevamente.';
    }
    if (error.status === 0)
      return 'No se pudo conectar con el servicio. Comprueba tu conexión y reintenta.';
    if (error.status >= 500)
      return 'El servidor no pudo completar la operación. Intenta nuevamente más tarde.';
  }
  return 'No se pudo confirmar la operación. Vuelve a intentarlo.';
}
type QueryState<T> = {
  status: 'idle' | 'loading' | 'data' | 'error';
  data: T | null;
  message: string;
};
export function pasajeroQuery<Q, T>(load: (query: Q) => Observable<T>) {
  const triggers = new Subject<Q | null>();
  const busy = signal(false);
  let activeKey: string | undefined;
  const state = toSignal(
    triggers.pipe(
      switchMap((query) =>
        query === null
          ? of<QueryState<T>>({ status: 'idle', data: null, message: '' })
          : defer(() => {
              busy.set(true);
              return load(query);
            }).pipe(
              map((data): QueryState<T> => ({ status: 'data', data, message: '' })),
              catchError((error) =>
                of<QueryState<T>>({ status: 'error', data: null, message: pasajeroError(error) }),
              ),
              finalize(() => busy.set(false)),
              startWith<QueryState<T>>({ status: 'loading', data: null, message: '' }),
            ),
      ),
    ),
    { initialValue: { status: 'idle', data: null, message: '' } as QueryState<T> },
  );
  return {
    state,
    busy,
    run(query: Q) {
      const key = JSON.stringify(query);
      if (busy() && activeKey === key) return;
      activeKey = key;
      triggers.next(query);
    },
    cancel() {
      triggers.next(null);
      activeKey = undefined;
    },
  };
}
