import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export interface SugerenciaContribucionRespuesta {
  readonly viajeId: number;
  readonly origen: string;
  readonly destino: string;
  readonly dia: string;
  readonly fecha: string;
  readonly hora: string;
  readonly pasajeros: number;
  readonly esHoraPico: boolean;
  readonly costoTotalEstimado: number;
  readonly aporteEstimado: number;
  readonly litrosGasolinaAprox: number;
  readonly sugerenciaFavor: string;
  readonly nota: string;
}

export interface ContribucionApiError {
  readonly mensaje: string;
  readonly campos: Readonly<Record<string, string>> | null;
}

export interface SugerenciaContribucionFixture {
  readonly respuesta: SugerenciaContribucionRespuesta;
  readonly fechaVisible: string;
  readonly horaVisible: string;
}

export type SugerenciaContribucionState =
  | 'disponible'
  | 'unico-pasajero'
  | 'insuficiente'
  | 'pasajeros-confirmados'
  | 'viaje-no-disponible'
  | 'no-encontrado'
  | 'restringido'
  | 'cargando'
  | 'error';

export const SUGERENCIA_CONTRIBUCION_STATES: readonly SugerenciaContribucionState[] = [
  'disponible',
  'unico-pasajero',
  'insuficiente',
  'pasajeros-confirmados',
  'viaje-no-disponible',
  'no-encontrado',
  'restringido',
  'cargando',
  'error',
];

const SUGERENCIA_FAVOR =
  'Un favor acordado con el conductor de valor equivalente al aporte estimado';

const NOTA_REFERENCIAL =
  'Estimación referencial basada en la hora del viaje y la cantidad de pasajeros; el monto final puede variar según la ruta y el acuerdo entre conductor y pasajeros.';

export const SUGERENCIA_DOS_PASAJEROS: SugerenciaContribucionFixture = {
  respuesta: {
    viajeId: 35,
    origen: 'San Borja',
    destino: 'UPC',
    dia: 'Viernes',
    fecha: '2026-11-06',
    hora: '07:30',
    pasajeros: 2,
    esHoraPico: true,
    costoTotalEstimado: 12,
    aporteEstimado: 6,
    litrosGasolinaAprox: 1.11,
    sugerenciaFavor: SUGERENCIA_FAVOR,
    nota: NOTA_REFERENCIAL,
  },
  fechaVisible: '6/11/2026',
  horaVisible: '07:30',
};

export const SUGERENCIA_UN_PASAJERO: SugerenciaContribucionFixture = {
  respuesta: {
    viajeId: 35,
    origen: 'San Borja',
    destino: 'UPC',
    dia: 'Viernes',
    fecha: '2026-11-06',
    hora: '07:30',
    pasajeros: 1,
    esHoraPico: true,
    costoTotalEstimado: 12,
    aporteEstimado: 12,
    litrosGasolinaAprox: 2.22,
    sugerenciaFavor: SUGERENCIA_FAVOR,
    nota: NOTA_REFERENCIAL,
  },
  fechaVisible: '6/11/2026',
  horaVisible: '07:30',
};

export const integerMinOneValidator: ValidatorFn = (
  control: AbstractControl<number | null>,
): ValidationErrors | null => {
  const value = control.value;

  if (value === null || value === undefined) {
    return null;
  }

  if (!Number.isInteger(value)) {
    return { integer: true };
  }

  return value >= 1 ? null : { min: { min: 1, actual: value } };
};

export function resolveContribucionState(
  value: string | null,
  fallback: SugerenciaContribucionState = 'disponible',
): SugerenciaContribucionState {
  return value !== null && SUGERENCIA_CONTRIBUCION_STATES.includes(
    value as SugerenciaContribucionState,
  )
    ? (value as SugerenciaContribucionState)
    : fallback;
}
