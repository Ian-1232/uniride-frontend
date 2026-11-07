/** DTOs returned by the authenticated Spring Boot statistics endpoints. */
export interface EstadisticasRespuesta {
  readonly viajesComoConductor: number;
  readonly viajesComoPasajero: number;
  readonly viajesCancelados: number;
  readonly penalidadesAcumuladas: number;
}
export interface DiaCantidadRespuesta {
  readonly dia: string;
  readonly cantidad: number;
}
export interface AnalisisSemanalRespuesta {
  readonly suficientesDatos: boolean;
  readonly mensaje: string | null;
  readonly viajesPorDia: readonly DiaCantidadRespuesta[];
  readonly canceladosPorMi: number;
  readonly canceladosPorTerceros: number;
}
export interface RutaFrecuenteRespuesta {
  readonly origen: string;
  readonly destino: string;
  readonly cantidad: number;
  readonly penalidades: number;
}
export interface RankingRutasRespuesta {
  readonly suficientesDatos: boolean;
  readonly mensaje: string | null;
  readonly ranking: readonly RutaFrecuenteRespuesta[];
}

export interface ActivitySummary {
  readonly completedTrips: number;
  readonly driverTrips: number;
  readonly passengerTrips: number;
  readonly cancelledTrips: number;
  readonly penalties: number;
}

export interface WeeklyTripCount {
  readonly day: string;
  readonly shortDay: string;
  readonly count: number;
}

export interface FrequentRoute {
  readonly position: number;
  readonly origin: string;
  readonly destination: string;
  readonly completedTrips: number;
  readonly penalties: number;
}

export function resolveViewState<T extends string>(
  value: string | null,
  allowedStates: readonly T[],
  fallback: T,
): T {
  return value !== null && allowedStates.includes(value as T) ? (value as T) : fallback;
}
