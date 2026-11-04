export type EstadoRuta = 'ACTIVA' | 'LLENA' | 'VENCIDA';

export type EstadoViaje = 'PROGRAMADO' | 'EN_PROGRESO' | 'COMPLETADO' | 'CANCELADO' | 'VENCIDO';

export interface Ruta {
  id: number;
  origen: string;
  destino: string;
  capacidadMaxima: number;
  puntosReferencia: string;
  zonasSinParada?: string | null;
  notaContribucion?: string | null;
  estado: EstadoRuta;
}

export interface Viaje {
  id: number;
  fecha: string;
  hora: string;
  estado: EstadoViaje;
  pasajeros?: number;
  pasajerosConfirmados?: number;
  capacidadMaxima?: number;
}

export interface Pagina<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface CrearRutaRequest {
  origen: string;
  capacidadMaxima: number;
  puntosReferencia: string;
  zonasSinParada?: string;
  notaContribucion?: string;
}

export interface CrearViajeRequest {
  fecha: string;
  hora: string;
}

export interface ErrorApi {
  mensaje: string;
  campos?: Record<string, string>;
}
