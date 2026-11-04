import { HttpErrorResponse } from '@angular/common/http';
import { ErrorApi } from '../models/ruta.model';

export const API_BASE_URL = 'http://localhost:8080/api';

export function mensajeError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const cuerpo = error.error as ErrorApi | string | null;
    if (cuerpo && typeof cuerpo === 'object' && 'mensaje' in cuerpo) {
      return cuerpo.mensaje;
    }
    if (typeof cuerpo === 'string' && cuerpo.trim()) {
      return cuerpo;
    }
    if (error.status === 0) {
      return 'No se pudo conectar con el servidor. Verifica que la API esté disponible.';
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'No se pudo completar la operación. Intenta nuevamente.';
}
