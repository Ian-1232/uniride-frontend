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

export type ListadoCompensacionesState =
  | 'disponible'
  | 'vacio'
  | 'cargando'
  | 'error'
  | 'confirmar-eliminacion'
  | 'eliminado'
  | 'no-encontrado-eliminacion'
  | 'eliminacion-bloqueada';

export type FormularioCompensacionState =
  | 'disponible'
  | 'validacion'
  | 'duplicado'
  | 'no-encontrado'
  | 'exito';

export const LISTADO_COMPENSACIONES_STATES: readonly ListadoCompensacionesState[] = [
  'disponible',
  'vacio',
  'cargando',
  'error',
  'confirmar-eliminacion',
  'eliminado',
  'no-encontrado-eliminacion',
  'eliminacion-bloqueada',
];

export const FORMULARIO_COMPENSACION_STATES: readonly FormularioCompensacionState[] = [
  'disponible',
  'validacion',
  'duplicado',
  'no-encontrado',
  'exito',
];

export const METODOS_COMPENSACION_DEMO: readonly MetodoCompensacionResponse[] = [
  {
    id: 11,
    tipo: 'DINERO',
    descripcion: 'Transferencia o billetera digital',
    activo: true,
  },
  {
    id: 12,
    tipo: 'GASOLINA',
    descripcion: 'Aporte de combustible',
    activo: true,
  },
  {
    id: 13,
    tipo: 'FAVOR',
    descripcion: 'Ayuda con apuntes',
    activo: false,
  },
];

export const TIPOS_COMPENSACION: readonly TipoCompensacion[] = [
  'DINERO',
  'GASOLINA',
  'FAVOR',
];

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

export function resolveCompensacionesState<T extends string>(
  value: string | null,
  allowedStates: readonly T[],
  fallback: T,
): T {
  return value !== null && allowedStates.includes(value as T) ? (value as T) : fallback;
}

export function findDemoMethod(id: number): MetodoCompensacionResponse | undefined {
  return METODOS_COMPENSACION_DEMO.find((method) => method.id === id);
}
