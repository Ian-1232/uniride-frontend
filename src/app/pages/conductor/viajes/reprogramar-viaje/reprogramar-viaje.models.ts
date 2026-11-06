import { HttpErrorResponse } from '@angular/common/http';
import { ValidatorFn } from '@angular/forms';
import { CoordinacionViaje, instanteSalida } from '../../../../core/models/coordinacion.models';
import { fechaLocalValida } from '../../../../core/models/perfil.models';
import { SalidaViaje } from '../../../../core/services/rutas.service';

export interface HorarioConsultado {
  readonly datos: CoordinacionViaje;
  readonly aceptados: number;
}
export const HORA_SALIDA = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,9})?)?$/;
export function salidaValida(salida: SalidaViaje): boolean {
  return (
    fechaLocalValida(salida.fecha) &&
    HORA_SALIDA.test(salida.hora) &&
    Number.isFinite(instanteSalida(salida))
  );
}
export const anticipacionSalida: ValidatorFn = (control) => {
  const salida = control.value as SalidaViaje;
  if (!salidaValida(salida)) return null;
  const diferencia = instanteSalida(salida) - Date.now();
  return diferencia <= 0
    ? { pasada: true }
    : diferencia < 12 * 3600000
      ? { anticipacion: true }
      : null;
};
function horaCanonica(hora: string): string {
  const [reloj, fraccion = ''] = hora.split('.');
  return (reloj.length === 5 ? reloj + ':00' : reloj) + '.' + fraccion.padEnd(9, '0');
}
export function mismoHorario(a: SalidaViaje, b: SalidaViaje): boolean {
  return a.fecha === b.fecha && horaCanonica(a.hora) === horaCanonica(b.hora);
}
export function mismaRevision(a: HorarioConsultado, b: HorarioConsultado): boolean {
  const clave = (s: HorarioConsultado) => {
    const v = s.datos.viaje;
    return [
      v.id,
      v.rutaId,
      v.fecha,
      horaCanonica(v.hora),
      v.estado,
      v.confirmado,
      v.fechaConfirmacion,
      s.aceptados,
      s.datos.origen,
      s.datos.destino,
      s.datos.capacidadMaxima,
    ];
  };
  return JSON.stringify(clave(a)) === JSON.stringify(clave(b));
}
export function horarioTexto(salida: SalidaViaje): string {
  if (!salidaValida(salida)) return 'Horario no disponible';
  return (
    salida.fecha.slice(8, 10) +
    '/' +
    salida.fecha.slice(5, 7) +
    '/' +
    salida.fecha.slice(0, 4) +
    ' · ' +
    salida.hora.replace(/^(\d{2}:\d{2}):00$/, '$1') +
    ' (Lima)'
  );
}
export function advertenciaPasajeros(error: unknown): boolean {
  return (
    error instanceof HttpErrorResponse &&
    error.status === 409 &&
    typeof error.error?.mensaje === 'string' &&
    /^ADVERTENCIA: el cambio de horario afecta a [1-9]\d* pasajero\(s\) aceptado\(s\)\. Confirma usando \?confirmarImpacto=true\.$/.test(
      error.error.mensaje,
    )
  );
}
export function reprogramacionError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0)
      return 'No se pudo conectar con el servicio. Comprueba tu conexión y vuelve a intentarlo.';
    if (error.status === 400)
      return 'Revisa la fecha y la hora. La salida debe ser futura y tener al menos 12 horas de anticipación.';
    if (error.status === 401) return 'Tu sesión ya no es válida. Inicia sesión nuevamente.';
    if (error.status === 403) return 'No tienes permiso para reprogramar este viaje.';
    if (error.status === 404) return 'El viaje no existe o no está disponible para tu cuenta.';
    if (advertenciaPasajeros(error))
      return 'Hay pasajeros aceptados afectados por el cambio. Actualizamos la información; vuelve a guardar para revisar y confirmar el impacto.';
    if (error.status === 409) {
      if (error.error?.mensaje === 'Solo se pueden reprogramar viajes en estado PROGRAMADO')
        return 'El viaje ya no está PROGRAMADO y no se puede reprogramar.';
      if (error.error?.mensaje === 'No se puede reprogramar un viaje de una ruta eliminada')
        return 'No se puede reprogramar un viaje de una ruta eliminada.';
      if (error.error?.mensaje === 'La salida debe tener al menos 12 horas de anticipación')
        return 'La nueva salida debe tener al menos 12 horas de anticipación.';
      return 'El viaje cambió o no admite esta reprogramación. Revisa los datos actualizados antes de volver a guardar.';
    }
    if (error.status === 429)
      return 'Se alcanzó el límite de peticiones. Espera antes de volver a intentarlo.';
    if (error.status >= 500)
      return 'El servidor no pudo procesar la operación. Conservamos tu selección; vuelve a consultar antes de reintentar.';
  }
  if (error instanceof Error && error.name === 'TimeoutError')
    return 'La operación tardó demasiado. Vuelve a consultar el viaje antes de intentar guardar otra vez.';
  return 'No se pudo confirmar la operación. Vuelve a consultar el viaje antes de reintentar.';
}
