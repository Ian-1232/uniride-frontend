import { Ruta } from '../../../../core/models/ruta.models';
import { ViajeRespuesta } from '../../../../core/models/coordinacion.models';
/** Fixtures imported only by tests. No requests are forwarded to Spring/Supabase. */
export const AHORA_REPROGRAMAR = Date.parse('2026-11-06T10:00:00-05:00');
export const RUTA_REPROGRAMAR: Ruta = {
  id: 9,
  origen: 'Origen de prueba',
  destino: 'Campus de prueba',
  capacidadMaxima: 4,
  puntosReferencia: 'Referencia de prueba',
  estado: 'ACTIVA',
};
export const VIAJE_REPROGRAMAR: ViajeRespuesta = {
  id: 74,
  rutaId: 9,
  fecha: '2026-11-08',
  hora: '10:00:30',
  dia: 'Domingo',
  estado: 'PROGRAMADO',
  confirmado: false,
  fechaConfirmacion: null,
  pasajeros: 0,
  mensaje: null,
};
export const NUEVA_SALIDA = { fecha: '2026-11-10', hora: '14:30' };
export const VIAJE_REPROGRAMADO: ViajeRespuesta = {
  ...VIAJE_REPROGRAMAR,
  ...NUEVA_SALIDA,
  hora: '14:30:00',
  dia: 'Martes',
  mensaje: 'Horario del viaje actualizado',
};
export function paginaReprogramar<T>(
  content: T[],
  totalElements = content.length,
  number = 0,
  size = 100,
) {
  return { content, totalElements, totalPages: Math.ceil(totalElements / size), number, size };
}
