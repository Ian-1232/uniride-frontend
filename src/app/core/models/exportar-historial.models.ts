import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export type HistoryTripType = 'todos' | 'conductor' | 'pasajero';

export type HistoryExportState =
  'disponible' | 'sin-resultados' | 'preparando' | 'descargado' | 'error';

export interface HistoryExportFilters {
  readonly desde: Date | null;
  readonly hasta: Date | null;
  readonly tipo: HistoryTripType;
}

export function localIsoDate(date: Date): string {
  if (!Number.isFinite(date.getTime())) throw new Error('Fecha inválida');
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dateOnlyValue(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

export const dateRangeValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const from = control.get('desde')?.value as Date | null | undefined;
  const to = control.get('hasta')?.value as Date | null | undefined;

  if ([from, to].some((date) => date instanceof Date && !Number.isFinite(date.getTime()))) {
    return { invalidDate: true };
  }

  if (!(from instanceof Date) || !(to instanceof Date)) {
    return null;
  }

  return dateOnlyValue(from) > dateOnlyValue(to) ? { dateRange: true } : null;
};
