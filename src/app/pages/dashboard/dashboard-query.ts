import { HttpErrorResponse } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { consultaQuery } from '../../core/services/consulta';

/** Keep the shared query lifecycle, with controlled messages for dashboard reads. */
export function consultaDashboard<T>(load: () => Observable<T>) {
  return consultaQuery(() =>
    load().pipe(
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status > 0 && error.status < 500) {
          const mensaje =
            error.status === 401
              ? 'Tu sesión ya no es válida. Inicia sesión nuevamente.'
              : error.status === 403
                ? 'No tienes permiso para consultar esta información.'
                : error.status === 404
                  ? 'La información ya no está disponible. Actualiza los datos.'
                  : 'No se pudo consultar la información. Vuelve a intentarlo.';
          return throwError(
            () => new HttpErrorResponse({ status: error.status, error: { mensaje } }),
          );
        }
        return throwError(() => error);
      }),
    ),
  );
}
