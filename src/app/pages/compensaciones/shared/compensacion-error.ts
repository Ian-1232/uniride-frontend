import { HttpErrorResponse } from '@angular/common/http';

export const DUPLICATE_METHOD = 'Ya tienes un método con el mismo tipo y descripción en tu lista';
export const BLOCKED_DELETE =
  'No puedes eliminar este método porque tiene solicitudes asociadas. Puedes desactivarlo para conservar el historial.';

export function compensationError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 401) return 'Tu sesión ya no es válida. Inicia sesión nuevamente.';
    if (error.status === 403) return 'No tienes permiso para realizar esta operación.';
    if (error.status === 404)
      return 'El método de compensación ya no existe o no está disponible para tu cuenta.';
    if (error.status === 409 && [DUPLICATE_METHOD, BLOCKED_DELETE].includes(error.error?.mensaje))
      return error.error.mensaje;
    if (error.status === 409)
      return 'No se pudo completar la operación por un conflicto. Actualiza los datos e intenta nuevamente.';
    if (error.status === 400) {
      const fields = error.error?.campos;
      const messages =
        fields && typeof fields === 'object'
          ? ['tipo', 'descripcion', 'activo']
              .map((key) => fields[key])
              .filter((value) => typeof value === 'string')
          : [];
      return messages.length ? messages.join('. ') : 'Revisa el tipo y la descripción del método.';
    }
    if (error.status === 0)
      return 'No se pudo conectar con el servicio. Comprueba tu conexión y vuelve a intentar.';
    if (error.status >= 500)
      return 'El servidor no pudo completar la operación. Intenta nuevamente más tarde.';
  }
  return 'No se pudo confirmar la operación. Actualiza los datos o vuelve a intentar.';
}
