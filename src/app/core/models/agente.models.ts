import { AclaracionAgenteV1 } from './aclaracion.models';

export interface ChatSolicitud {
  readonly message: string;
  readonly conversationId?: string;
}

export type EstadoOperacion =
  | 'CONFIRMACION_REQUERIDA'
  | 'EXITO'
  | 'DATOS_FALTANTES'
  | 'SIN_CAMBIOS'
  | 'AMBIGUO'
  | 'NO_ENCONTRADO'
  | 'ERROR';

export type EstadoResolucion =
  | 'EJECUTADA'
  | 'CANCELADA'
  | 'EXPIRADA'
  | 'YA_EJECUTADA'
  | 'YA_CANCELADA'
  | 'RECHAZADA'
  | 'SIN_PENDIENTE'
  | 'ACLARACION_REQUERIDA'
  | 'RESULTADO_INCIERTO';

export type EstadoViaje = 'PROGRAMADO' | 'EN_PROGRESO' | 'COMPLETADO' | 'CANCELADO' | 'VENCIDO';

export type EstadoSolicitud = 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA' | 'CANCELADA';
export type EstadoRuta = 'ACTIVA' | 'LLENA' | 'VENCIDA' | 'ELIMINADA';
export type EstadoConfirmacion = 'PENDIENTE' | 'EJECUTADA' | 'CANCELADA' | 'EXPIRADA';
export type TipoCompensacion = 'DINERO' | 'GASOLINA' | 'FAVOR';

export interface AdvertenciaAgente {
  readonly codigo: string;
  readonly mensaje: string;
}

export interface ViajeResumen {
  readonly viajeId: number;
  readonly rutaId: number;
  readonly origen: string;
  readonly destino: string;
  readonly dia: string | null;
  readonly fecha: string | null;
  readonly hora: string | null;
  readonly puntosReferencia: string | null;
  readonly conductorNombre: string | null;
  readonly capacidadMaxima: number | null;
  readonly estado: EstadoViaje | null;
  readonly estadoSolicitud: EstadoSolicitud | null;
}

export interface RutaResumen {
  readonly rutaId: number;
  readonly origen: string;
  readonly destino: string;
  readonly puntosReferencia: string | null;
  readonly zonasSinParada: string | null;
  readonly capacidadMaxima: number | null;
  readonly estado: EstadoRuta;
}

export interface MetodoCompensacionResumen {
  readonly id: number;
  readonly tipo: TipoCompensacion;
  readonly descripcion: string;
  readonly activo: boolean;
}

export interface ConfirmacionResumen {
  readonly id: string;
  readonly tipo: string;
  readonly estado: EstadoConfirmacion;
  readonly resumen: string;
  readonly parametros: unknown;
  readonly expira: string;
  readonly resultado: OperacionResumen | null;
}

export interface OperacionResumen {
  readonly estado: EstadoOperacion;
  readonly id: number | null;
  readonly detalle: string;
  readonly confirmacion: ConfirmacionResumen | null;
}

export interface ResolucionConfirmacion {
  readonly estado: EstadoResolucion;
  readonly confirmacion: ConfirmacionResumen | null;
}

export interface ResultadoAgente {
  readonly tipo: string;
  readonly datos: unknown;
}

export interface ChatRespuesta {
  readonly message: string;
  readonly viajes: readonly ViajeResumen[];
  readonly rutas: readonly RutaResumen[];
  readonly metodosCompensacion: readonly MetodoCompensacionResumen[];
  readonly operacion: OperacionResumen | null;
  readonly resultados: readonly ResultadoAgente[];
  readonly advertencia: AdvertenciaAgente | null;
  readonly conversationId: string;
  readonly resolucionConfirmacion?: ResolucionConfirmacion;
  readonly aclaracion?: AclaracionAgenteV1;
}

export interface VozChatRespuesta {
  readonly transcripcion: string;
  readonly textoHablado: string;
  readonly respuesta: ChatRespuesta;
}

export interface ErrorRespuesta {
  readonly mensaje: string;
  readonly campos: Readonly<Record<string, string>> | null;
}
