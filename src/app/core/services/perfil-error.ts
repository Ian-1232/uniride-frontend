import { HttpErrorResponse } from '@angular/common/http';
import { FormGroup } from '@angular/forms';

export function perfilError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0)
      return 'No se pudo conectar con el servicio. Comprueba tu conexión y reintenta.';
    if (error.status === 401) return 'Tu sesión expiró. Inicia sesión nuevamente.';
    if (error.status === 403) return 'No tienes permiso para realizar esta operación.';
    if (error.status === 400)
      return 'Revisa los campos obligatorios, las fechas y el tipo de compensación.';
    if (error.status === 404)
      return 'No se pudo encontrar el recurso solicitado. Vuelve a consultar tus datos.';
    if (error.status === 409)
      return 'No se pudo completar el cambio por un conflicto. Actualiza los datos y reintenta.';
  }
  return 'No se pudo confirmar la operación. Intenta nuevamente en unos momentos.';
}
export function erroresPerfil(form: FormGroup, error: unknown): void {
  if (!(error instanceof HttpErrorResponse) || error.status !== 400) return;
  const fields: unknown = error.error?.campos;
  if (fields && typeof fields === 'object') {
    for (const key of Object.keys(fields)) {
      const control = Object.hasOwn(form.controls, key) ? form.controls[key] : undefined;
      if (control) {
        control.setErrors({ ...control.errors, servidor: true });
        control.markAsTouched();
      }
    }
  }
}
