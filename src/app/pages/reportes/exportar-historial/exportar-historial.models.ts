import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export type HistoryTripType = 'todos' | 'conductor' | 'pasajero';

export type HistoryExportState =
  | 'disponible'
  | 'filtrado'
  | 'fechas-invalidas'
  | 'sin-resultados'
  | 'preparando'
  | 'descargado';

export const HISTORY_EXPORT_STATES: readonly HistoryExportState[] = [
  'disponible',
  'filtrado',
  'fechas-invalidas',
  'sin-resultados',
  'preparando',
  'descargado',
];

function dateOnlyValue(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

export const dateRangeValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const from = control.get('desde')?.value as Date | null | undefined;
  const to = control.get('hasta')?.value as Date | null | undefined;

  if (!(from instanceof Date) || !(to instanceof Date)) {
    return null;
  }

  return dateOnlyValue(from) > dateOnlyValue(to) ? { dateRange: true } : null;
};
