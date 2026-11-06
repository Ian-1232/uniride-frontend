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

export type SugerenciaContribucionState =
  | 'disponible'
  | 'insuficiente'
  | 'viaje-no-disponible'
  | 'no-encontrado'
  | 'restringido'
  | 'cargando'
  | 'error';

export const MISSING_PASSENGERS =
  'El viaje aún no tiene pasajeros aceptados; indica la cantidad de pasajeros para calcular la sugerencia';

// LocalDate and LocalTime are calendar strings, not instants in UTC.
export function formatContributionDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? Number(match[3]) + '/' + Number(match[2]) + '/' + match[1] : value;
}
export function formatContributionTime(value: string): string {
  return value.slice(0, 5);
}

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
