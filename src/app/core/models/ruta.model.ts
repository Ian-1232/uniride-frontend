export type EstadoRuta = 'ACTIVA' | 'LLENA' | 'VENCIDA' | 'ELIMINADA';

export type EstadoViaje = 'PROGRAMADO' | 'EN_PROGRESO' | 'COMPLETADO' | 'CANCELADO' | 'VENCIDO';

/** Contrato `Page<T>` de Spring Data devuelto por los listados del módulo 2. */
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
}

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

/** Cuerpo de POST /api/rutas y PUT /api/rutas/{id} (`RutaRequest`). */
export interface RutaRequest {
  origen: string;
  capacidadMaxima: number;
  puntosReferencia: string;
  zonasSinParada?: string;
  notaContribucion?: string;
}

export interface Viaje {
  id: number;
  rutaId?: number;
  fecha: string;
  hora: string;
  estado: EstadoViaje;
  pasajeros?: number;
  pasajerosConfirmados?: number;
  capacidadMaxima?: number;
}
