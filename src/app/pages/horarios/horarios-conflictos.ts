import {
  ArchivoRespuesta,
  CursoRequest,
  CursoRespuesta,
  DIAS_CURSO,
  diaCurso,
  HORA_CURSO,
  segundosHora,
} from './horarios.models';

export type CursoHorario = Pick<CursoRespuesta, 'nombre' | 'dia' | 'horaInicio' | 'horaFin'>;
export interface ConflictoHorario {
  readonly nuevo: CursoHorario;
  readonly existentes: readonly CursoRespuesta[];
  readonly mensajeServidor?: string;
}
export interface AvisoConflictos {
  readonly conflictos: readonly ConflictoHorario[];
  readonly mensajeServidor?: string;
  readonly detalleIncompleto?: boolean;
  readonly fueraDeFranja?: readonly CursoRespuesta[];
}
export interface RegistroParcial {
  readonly guardados: readonly { indice: number; curso: CursoRespuesta }[];
  readonly conflictos: readonly (ConflictoHorario & { indice: number })[];
  readonly fallos: readonly { indice: number; mensaje: string }[];
  readonly pendientes: readonly number[];
}
export function cursosSuperpuestos(
  nuevo: CursoHorario,
  existentes: readonly CursoRespuesta[],
): CursoRespuesta[] {
  return existentes.filter(
    (c) =>
      diaCurso(c.dia.trim()) === diaCurso(nuevo.dia.trim()) &&
      segundosHora(c.horaInicio) < segundosHora(nuevo.horaFin) &&
      segundosHora(c.horaFin) > segundosHora(nuevo.horaInicio),
  );
}
export function agruparCursos(cursos: readonly CursoRespuesta[]) {
  const nombres: readonly string[] = [
    ...DIAS_CURSO,
    ...new Set(
      cursos
        .map((c) => diaCurso(c.dia))
        .filter((d) => !(DIAS_CURSO as readonly string[]).includes(d)),
    ),
  ];
  return nombres.map((nombre) => ({
    dia: nombre,
    cursos: cursos
      .filter((c) => diaCurso(c.dia) === nombre)
      .slice()
      .sort(
        (a, b) =>
          segundosHora(a.horaInicio) - segundosHora(b.horaInicio) ||
          segundosHora(a.horaFin) - segundosHora(b.horaFin) ||
          a.id - b.id,
      ),
  }));
}
/** The API exposes omitted rows only in this message, not as a structured DTO. Fail closed if its grammar/count changes. */
export function conflictosImportacion(
  result: ArchivoRespuesta,
  actuales: readonly CursoRespuesta[] | null,
): AvisoConflictos {
  if (!result.cursosOmitidos) return { conflictos: [] };
  const marker = `${result.cursosOmitidos} omitidos por conflicto de horario: `;
  const suffix = '. Elimina o edita el curso existente y vuelve a subir el archivo.';
  const start = result.mensaje.indexOf(marker);
  if (start < 0 || !result.mensaje.endsWith(suffix))
    return { conflictos: [], mensajeServidor: result.mensaje, detalleIncompleto: true };
  const text = result.mensaje.slice(start + marker.length, -suffix.length);
  const expression =
    /«([\s\S]+?)» \((Lunes|Martes|Mi[eé]rcoles|Jueves|Viernes|S[aá]bado|Domingo) de (\d{2}:\d{2}(?::\d{2})?) a (\d{2}:\d{2}(?::\d{2})?)\)/giu;
  const matches = [...text.matchAll(expression)];
  const residual = text
    .replace(expression, '')
    .replace(/\s*\|\s*/g, '')
    .trim();
  if (
    residual ||
    matches.length !== result.cursosOmitidos ||
    matches.some(
      (m) =>
        !HORA_CURSO.test(m[3]) ||
        !HORA_CURSO.test(m[4]) ||
        segundosHora(m[3]) >= segundosHora(m[4]),
    )
  )
    return { conflictos: [], mensajeServidor: result.mensaje, detalleIncompleto: true };
  const conflictos = matches.map((m) => {
    const nuevo: CursoRequest = {
      nombre: m[1],
      dia: diaCurso(m[2]) as CursoRequest['dia'],
      horaInicio: m[3],
      horaFin: m[4],
    };
    return { nuevo, existentes: cursosSuperpuestos(nuevo, actuales ?? []) };
  });
  return {
    conflictos,
    mensajeServidor: result.mensaje,
    detalleIncompleto: conflictos.some((c) => !c.existentes.length),
  };
}
