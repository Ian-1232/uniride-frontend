import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { RoleType } from './auth.models';
import { TipoCompensacion } from './compensaciones.models';

export interface PerfilRequest {
  nombre: string;
  apellidos: string;
  carrera: string;
  distrito: string;
  universidad: string;
  diasDisponibles: string;
  horariosDisponibles: string;
  fechaInicioClases: string;
  fechaFinClases: string;
  metodoCompensacionFavorito: TipoCompensacion | null;
}
export interface InfoAdicionalRequest {
  gustos: string;
  hobbies: string;
  datosCuriosos: string;
}
export interface PerfilRespuesta extends PerfilRequest {
  id: number;
  gustos: string | null;
  hobbies: string | null;
  datosCuriosos: string | null;
  fechaActualizacion: string;
}
export const requeridoSinEspacios: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null =>
  typeof control.value === 'string' && control.value.trim() ? null : { required: true };

// Date inputs already contain a local calendar date. Never convert them through UTC.
export function fechaLocalValida(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}
export const fechaValida: ValidatorFn = (c) => (fechaLocalValida(c.value) ? null : { fecha: true });
export const rangoAcademico: ValidatorFn = (c) => {
  const { fechaInicioClases: desde, fechaFinClases: hasta } = c.value;
  return fechaLocalValida(desde) && fechaLocalValida(hasta) && desde > hasta
    ? { rango: true }
    : null;
};
export function perfilCompleto(perfil: PerfilRespuesta | null, rol: RoleType | null): boolean {
  if (!perfil || !rol) return false;
  return (
    [
      'nombre',
      'apellidos',
      'carrera',
      'distrito',
      'universidad',
      'diasDisponibles',
      'horariosDisponibles',
    ].every(
      (key) =>
        typeof perfil[key as keyof PerfilRespuesta] === 'string' &&
        String(perfil[key as keyof PerfilRespuesta]).trim(),
    ) &&
    fechaLocalValida(perfil.fechaInicioClases) &&
    fechaLocalValida(perfil.fechaFinClases) &&
    perfil.fechaInicioClases <= perfil.fechaFinClases &&
    (perfil.metodoCompensacionFavorito === null
      ? rol === 'PASAJERO'
      : ['DINERO', 'GASOLINA', 'FAVOR'].includes(perfil.metodoCompensacionFavorito))
  );
}
