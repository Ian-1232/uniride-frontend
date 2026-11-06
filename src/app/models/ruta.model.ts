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
