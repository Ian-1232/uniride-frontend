import type { TipoCompensacion } from './compensaciones.models';
import type { SugerenciaContribucionRespuesta } from './contribucion.models';
export type { TipoCompensacion } from './compensaciones.models';
export type EstadoViaje = 'PROGRAMADO' | 'EN_PROGRESO' | 'COMPLETADO' | 'CANCELADO' | 'VENCIDO';
export type EstadoSolicitud = 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA' | 'CANCELADA';
export interface Pagina<T> {
  readonly content: readonly T[];
  readonly totalElements: number;
  readonly totalPages: number;
  readonly number: number;
  readonly size: number;
}
export interface BusquedaRespuesta {
  readonly viajeId: number;
  readonly fecha: string;
  readonly hora: string;
  readonly dia: string;
  readonly rutaId: number;
  readonly origen: string;
  readonly destino: string;
  readonly puntosReferencia: string | null;
  readonly zonasSinParada: string | null;
  readonly notaContribucion: string | null;
  readonly capacidadMaxima: number;
  readonly conductorId: number;
  readonly conductorNombre: string;
  readonly contribucionSugerida: SugerenciaContribucionRespuesta | null;
}
export interface BusquedaResumenRespuesta {
  readonly viajes: Pagina<BusquedaRespuesta>;
  readonly mensaje: string | null;
  readonly sugerencia: string | null;
}
export interface SolicitudRespuesta {
  readonly id: number;
  readonly viajeId: number;
  readonly fecha: string;
  readonly hora: string;
  readonly dia: string;
  readonly rutaId: number;
  readonly origen: string;
  readonly destino: string;
  readonly mensaje: string | null;
  readonly preferenciaCompensacion: TipoCompensacion;
  readonly estado: EstadoSolicitud;
  readonly motivoRechazo: string | null;
  readonly fechaCreacion: string;
  readonly advertencia: string | null;
  readonly pasajeroId: number;
  readonly pasajeroNombre: string;
  readonly pasajeroCorreo: string;
  readonly pasajeroCarrera: string | null;
  readonly pasajeroDistrito: string | null;
  readonly acuerdoTerminos: string | null;
  readonly acuerdoEstado: 'BORRADOR' | 'CONFIRMADO' | 'RECHAZADO' | null;
  readonly metodoCompensacionId: number | null;
  readonly metodoCompensacionTipo: TipoCompensacion | null;
  readonly metodoCompensacionDescripcion: string | null;
}
export interface SolicitudRequest {
  readonly mensaje?: string;
  readonly preferenciaCompensacion: TipoCompensacion;
  readonly metodoCompensacionId: number | null;
}
export interface SolicitudesResumenRespuesta {
  readonly solicitudes: Pagina<SolicitudRespuesta>;
  readonly mensaje: string | null;
}
export interface PenalidadHistorialRespuesta {
  readonly id: number;
  readonly tipo: 'LEVE' | 'GRAVE';
  readonly motivo: string;
  readonly fecha: string;
}
export interface SolicitudHistorialRespuesta {
  readonly solicitud: SolicitudRespuesta;
  readonly estadoViaje: EstadoViaje;
  readonly soloLectura: boolean;
  readonly penalidades: readonly PenalidadHistorialRespuesta[];
}
export interface SolicitudesHistorialResumenRespuesta {
  readonly solicitudes: Pagina<SolicitudHistorialRespuesta>;
  readonly mensaje: string | null;
}
export interface FiltroBusqueda {
  readonly origen?: string | null;
  readonly destino?: string | null;
  readonly dia?: string | null;
  readonly hora?: string | null;
  readonly cercania?: boolean | null;
}
export interface ConsultaSolicitudes {
  readonly historial: boolean;
  readonly estado?: EstadoSolicitud;
  readonly page: number;
  readonly size: number;
}
/** View fields are nullable when not provided by the source DTO. Never fill from fixtures. */
export interface ViajeVista {
  readonly id: number;
  readonly origen: string;
  readonly destino: string;
  readonly fecha: string;
  readonly hora: string;
  readonly dia: string;
  readonly conductorNombre: string | null;
  readonly capacidadMaxima: number | null;
  readonly puntosReferencia: string | null;
  readonly zonasSinParada: string | null;
  readonly notaContribucion: string | null;
  readonly estado: EstadoViaje | null;
  readonly contribucion: SugerenciaContribucionRespuesta | null;
}
export interface ContextoViaje {
  readonly viaje: ViajeVista;
  readonly consulta?: ConsultaSolicitudes;
  readonly solicitud?: SolicitudRespuesta;
  readonly historico?: SolicitudHistorialRespuesta;
}
export const DIAS_SEMANA = [
  { valor: 'Lunes', etiqueta: 'Lunes' },
  { valor: 'Martes', etiqueta: 'Martes' },
  { valor: 'Miercoles', etiqueta: 'Miércoles' },
  { valor: 'Jueves', etiqueta: 'Jueves' },
  { valor: 'Viernes', etiqueta: 'Viernes' },
  { valor: 'Sabado', etiqueta: 'Sábado' },
  { valor: 'Domingo', etiqueta: 'Domingo' },
] as const;
export const ESTADOS_SOLICITUD: readonly EstadoSolicitud[] = [
  'ACEPTADA',
  'PENDIENTE',
  'RECHAZADA',
  'CANCELADA',
];
export const ETIQUETAS_COMPENSACION = {
  DINERO: 'Dinero',
  GASOLINA: 'Gasolina',
  FAVOR: 'Favor',
} as const;
export const ETIQUETAS_SOLICITUD = {
  ACEPTADA: 'Aceptada',
  PENDIENTE: 'Pendiente',
  RECHAZADA: 'Rechazada',
  CANCELADA: 'Cancelada',
} as const;
export function desdeBusqueda(dto: BusquedaRespuesta): ViajeVista {
  return {
    id: dto.viajeId,
    origen: dto.origen,
    destino: dto.destino,
    fecha: dto.fecha,
    hora: dto.hora,
    dia: dto.dia,
    conductorNombre: dto.conductorNombre,
    capacidadMaxima: dto.capacidadMaxima,
    puntosReferencia: dto.puntosReferencia,
    zonasSinParada: dto.zonasSinParada,
    notaContribucion: dto.notaContribucion,
    estado: 'PROGRAMADO',
    contribucion: dto.contribucionSugerida,
  };
}
export function desdeSolicitud(dto: SolicitudRespuesta, estado: EstadoViaje | null = null): ViajeVista {
  return {
    id: dto.viajeId,
    origen: dto.origen,
    destino: dto.destino,
    fecha: dto.fecha,
    hora: dto.hora,
    dia: dto.dia,
    conductorNombre: null,
    capacidadMaxima: null,
    puntosReferencia: null,
    zonasSinParada: null,
    notaContribucion: null,
    estado,
    contribucion: null,
  };
}
export function salidaTexto(v: Pick<ViajeVista, 'fecha' | 'hora' | 'dia'>): string {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.fecha);
  return (
    v.dia +
    ' ' +
    (parts ? Number(parts[3]) + '/' + Number(parts[2]) + '/' + parts[1] : v.fecha) +
    ' · ' +
    v.hora.slice(0, 5)
  );
}
