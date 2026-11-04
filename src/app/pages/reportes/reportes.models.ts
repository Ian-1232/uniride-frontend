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

export type SummaryViewState =
  | 'disponible'
  | 'restringido'
  | 'cargando'
  | 'error'
  | 'incidencias';

export type FrequencyViewState =
  | 'disponible'
  | 'insuficiente'
  | 'cancelaciones'
  | 'cargando'
  | 'error';

export type RoutesViewState =
  | 'disponible'
  | 'insuficiente'
  | 'restringido'
  | 'penalidades'
  | 'error';

export const ACTIVITY_SUMMARY: ActivitySummary = {
  completedTrips: 20,
  driverTrips: 12,
  passengerTrips: 8,
  cancelledTrips: 3,
  penalties: 2,
};

export const WEEKLY_TRIPS: readonly WeeklyTripCount[] = [
  { day: 'Lunes', shortDay: 'L', count: 3 },
  { day: 'Martes', shortDay: 'M', count: 2 },
  { day: 'Miércoles', shortDay: 'X', count: 4 },
  { day: 'Jueves', shortDay: 'J', count: 2 },
  { day: 'Viernes', shortDay: 'V', count: 5 },
  { day: 'Sábado', shortDay: 'S', count: 3 },
  { day: 'Domingo', shortDay: 'D', count: 1 },
];

export const FREQUENT_ROUTES: readonly FrequentRoute[] = [
  {
    position: 1,
    origin: 'San Borja',
    destination: 'UPC',
    completedTrips: 5,
    penalties: 1,
  },
  {
    position: 2,
    origin: 'Surco',
    destination: 'UPC',
    completedTrips: 4,
    penalties: 1,
  },
  {
    position: 3,
    origin: 'Miraflores',
    destination: 'UPC',
    completedTrips: 3,
    penalties: 0,
  },
];

export function resolveViewState<T extends string>(
  value: string | null,
  allowedStates: readonly T[],
  fallback: T,
): T {
  return value !== null && allowedStates.includes(value as T) ? (value as T) : fallback;
}
