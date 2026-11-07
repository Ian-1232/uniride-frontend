import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export type TipoCompensacion = 'DINERO' | 'GASOLINA' | 'FAVOR';

export interface MetodoCompensacionRequest {
  readonly tipo: TipoCompensacion;
  readonly descripcion: string;
  readonly activo?: boolean | null;
}

export interface MetodoCompensacionResponse {
  readonly id: number;
  readonly tipo: TipoCompensacion;
  readonly descripcion: string;
  readonly activo: boolean;
}

export interface EliminacionMetodoResponse {
  readonly mensaje: string;
}

export interface MetodoCompensacionError {
  readonly mensaje: string;
  readonly campos: Readonly<Record<string, string>> | null;
}

export const TIPOS_COMPENSACION: readonly TipoCompensacion[] = ['DINERO', 'GASOLINA', 'FAVOR'];

export const TIPO_COMPENSACION_LABELS: Readonly<Record<TipoCompensacion, string>> = {
  DINERO: 'Dinero',
  GASOLINA: 'Gasolina',
  FAVOR: 'Favor',
};

export const nonBlankValidator: ValidatorFn = (
  control: AbstractControl<string | null>,
): ValidationErrors | null => {
  const value = control.value;
  return typeof value === 'string' && value.trim().length > 0 ? null : { blank: true };
};
