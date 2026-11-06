import { fechaLocalValida } from '../../core/models/perfil.models';
import { instanteSalida } from '../../core/models/coordinacion.models';
import { ViajeConRuta } from '../../core/models/ruta.model';
import { ConsultaSolicitudes, SolicitudRespuesta } from '../pasajero/viajes/viajes.models';

export interface SolicitudDashboard {
  readonly solicitud: SolicitudRespuesta;
  readonly consulta: ConsultaSolicitudes;
}
export interface ProximaSolicitud {
  readonly proxima: SolicitudDashboard | null;
  readonly incompletos: number;
}
const HORA = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,9})?)?$/;
export function salidaValida(value: { fecha: string; hora: string }): boolean {
  return (
    fechaLocalValida(value.fecha) &&
    typeof value.hora === 'string' &&
    HORA.test(value.hora) &&
    Number.isFinite(instanteSalida(value))
  );
}
export function idReal(id: number): boolean {
  return Number.isSafeInteger(id) && id > 0;
}
export function fechaDashboard(fecha: string): string {
  return fechaLocalValida(fecha)
    ? fecha.slice(8, 10) + '/' + fecha.slice(5, 7) + '/' + fecha.slice(0, 4)
    : 'Fecha no disponible';
}
export function horaDashboard(hora: string): string {
  return typeof hora === 'string' && HORA.test(hora)
    ? hora.replace(/^(\d{2}:\d{2}):00$/, '$1')
    : 'Hora no disponible';
}
export function proximoViajeConductor(
  viajes: readonly ViajeConRuta[],
  ahora = Date.now(),
): ViajeConRuta | null {
  return (
    viajes
      .filter(
        (v) =>
          idReal(v.id) &&
          salidaValida(v) &&
          (v.estado === 'EN_PROGRESO' || (v.estado === 'PROGRAMADO' && instanteSalida(v) >= ahora)),
      )
      .slice()
      .sort(
        (a, b) =>
          Number(b.estado === 'EN_PROGRESO') - Number(a.estado === 'EN_PROGRESO') ||
          instanteSalida(a) - instanteSalida(b) ||
          a.id - b.id,
      )[0] ?? null
  );
}
export function conteoValido(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}
export function exigirConteos(values: readonly number[]): void {
  if (!values.every(conteoValido)) throw new Error('Respuesta de conteos inválida');
}
