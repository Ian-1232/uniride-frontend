import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const DIAS_CURSO = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
] as const;
export type DiaCurso = (typeof DIAS_CURSO)[number];
export interface CursoRequest {
  readonly nombre: string;
  readonly dia: DiaCurso;
  readonly horaInicio: string;
  readonly horaFin: string;
}
export interface CursoRespuesta {
  readonly id: number;
  readonly nombre: string;
  readonly dia: string;
  readonly horaInicio: string;
  readonly horaFin: string;
}
export interface CursosPagina {
  readonly content: readonly CursoRespuesta[];
  readonly totalElements: number;
  readonly totalPages: number;
  readonly number: number;
  readonly size: number;
}
export interface ArchivoRespuesta {
  readonly mensaje: string;
  readonly cursosImportados: number;
  readonly cursosOmitidos: number;
  readonly nombreArchivo: string;
}
export const MAX_ARCHIVO_BYTES = 1024 * 1024;
export const HORA_CURSO = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
export const INICIO_CLASES = '06:00';
export const FIN_CLASES = '23:00';
export function segundosHora(value: string): number {
  if (!HORA_CURSO.test(value)) return NaN;
  const [h, m, s = 0] = value.split(':').map(Number);
  return h * 3600 + m * 60 + s;
}
export const rangoCurso: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const { horaInicio, horaFin } = control.value;
  const inicio = segundosHora(horaInicio ?? '');
  const fin = segundosHora(horaFin ?? '');
  if (!Number.isFinite(inicio) || !Number.isFinite(fin)) return null;
  const errors = {
    ...(inicio >= fin ? { rango: true } : {}),
    ...(!dentroDeFranja({ horaInicio, horaFin }) ? { franja: true } : {}),
  };
  return Object.keys(errors).length ? errors : null;
};
export function dentroDeFranja(curso: { horaInicio: string; horaFin: string }): boolean {
  return (
    segundosHora(curso.horaInicio) >= segundosHora(INICIO_CLASES) &&
    segundosHora(curso.horaFin) <= segundosHora(FIN_CLASES)
  );
}
export const diaCursoValido: ValidatorFn = (c) =>
  DIAS_CURSO.includes(c.value) ? null : { dia: true };
export const loteCursosValido: ValidatorFn = (control) => {
  const rows = control.value as readonly CursoRequest[];
  if (!rows.length || rows.length > 500) return { cantidad: true };
  for (let i = 0; i < rows.length; i++) {
    const a = rows[i];
    const inicio = segundosHora(a.horaInicio);
    const fin = segundosHora(a.horaFin);
    if (!Number.isFinite(inicio) || !Number.isFinite(fin)) continue;
    for (let j = 0; j < i; j++) {
      const b = rows[j];
      if (a.dia !== b.dia) continue;
      if (
        a.nombre.trim().toLowerCase() === b.nombre.trim().toLowerCase() &&
        inicio === segundosHora(b.horaInicio) &&
        fin === segundosHora(b.horaFin)
      )
        return { duplicados: [j + 1, i + 1] };
      if (inicio < segundosHora(b.horaFin) && fin > segundosHora(b.horaInicio))
        return { solapamiento: [j + 1, i + 1] };
    }
  }
  return null;
};
export function validarArchivo(file: File | null): string {
  if (!file) return 'Selecciona un archivo PDF o TXT.';
  if (!/\.(pdf|txt)$/i.test(file.name)) return 'Solo se permiten archivos PDF o TXT.';
  if (file.size === 0) return 'El archivo está vacío. Selecciona un archivo con contenido.';
  if (file.size > MAX_ARCHIVO_BYTES) return 'El archivo no puede superar 1 MB (1 048 576 bytes).';
  return '';
}
export function horaCurso(value: string): string {
  // LocalTime strings are displayed directly, preserving nonzero seconds without a Date/UTC conversion.
  return /^\d{2}:\d{2}:00$/.test(value) ? value.slice(0, 5) : value;
}
export function diaCurso(value: string): string {
  const normalize = (s: string) =>
    s
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  return DIAS_CURSO.find((d) => normalize(d) === normalize(value)) ?? value;
}
