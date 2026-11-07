import { HttpErrorResponse } from '@angular/common/http';
import { EstadoViaje } from './ruta.models';
import { EstadoSolicitud, SolicitudRespuesta } from './viajes.models';

export type { EstadoSolicitud } from './viajes.models';
export type SolicitudRecibida = SolicitudRespuesta;

/** Contrato ViajeRespuesta del backend recibido al listar o actualizar un viaje. */
export interface ViajeRespuesta {
  id: number;
  rutaId: number;
  fecha: string;
  hora: string;
  dia: string;
  confirmado: boolean;
  fechaConfirmacion: string | null;
  estado: EstadoViaje;
  pasajeros: number;
  mensaje: string | null;
}

/** Vista compuesta en el frontend a partir de rutas y viajes existentes. */
export interface CoordinacionViaje {
  viaje: ViajeRespuesta;
  origen: string;
  destino: string;
  puntosReferencia: string | null;
  notaContribucion: string | null;
  capacidadMaxima: number;
  cuposDisponibles: number;
}

/** Contrato original, sin exigir campos nuevos al backend. */
export interface DetalleSolicitudRespuesta {
  solicitudId: number;
  rutaId: number;
  viajeId: number;
  estado: EstadoSolicitud;
  mensajeSolicitud: string | null;
  mensaje: string | null;
  pasajero: {
    nombre: string;
    apellidos: string;
    carrera: string | null;
    distrito: string | null;
    universidad: string | null;
    gustos: string | null;
    hobbies: string | null;
  };
}

export interface DetalleSolicitud extends DetalleSolicitudRespuesta {
  preferenciaCompensacion: SolicitudRecibida['preferenciaCompensacion'];
  motivoRechazo: string | null;
  acuerdoTerminos: string | null;
  acuerdoEstado: SolicitudRecibida['acuerdoEstado'];
}

export function iniciales(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase();
}

export function instanteSalida(viaje: { fecha: string; hora: string }): number {
  return Date.parse(`${viaje.fecha}T${viaje.hora}-05:00`);
}

export function segundosParaSalida(viaje: { fecha: string; hora: string }): number {
  return (instanteSalida(viaje) - Date.now()) / 1000;
}

export function penalidadEstimada(viaje: { fecha: string; hora: string }): 'LEVE' | 'GRAVE' | null {
  const segundos = segundosParaSalida(viaje);
  return segundos > 86400 ? null : segundos >= 14400 ? 'LEVE' : 'GRAVE';
}

export function salidaTexto(viaje: { fecha: string; hora: string }): string {
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Lima',
  }).format(instanteSalida(viaje));
}

export function coordinacionError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'No se pudo conectar con el servidor. Vuelve a intentar.';
    if (error.status === 401) return 'Tu sesión venció. Inicia sesión nuevamente.';
    if (error.status === 403) return 'No tienes permiso para realizar esta operación.';
    if (error.status === 404)
      return 'El viaje o la solicitud no existe o no está disponible para tu cuenta.';
    if ([400, 409].includes(error.status) && typeof error.error?.mensaje === 'string')
      return error.error.mensaje;
  }
  return 'No se pudo completar la operación. Actualiza los datos y vuelve a intentar.';
}
