import { ArchivoRespuesta, CursoRequest, CursoRespuesta, CursosPagina } from './horarios.models';
// Imported exclusively by specs. These values never provide production screen data.
export const CURSO_REQUEST: CursoRequest = {
  nombre: 'Curso de prueba',
  dia: 'Miércoles',
  horaInicio: '08:05',
  horaFin: '10:15:30',
};
export const CURSO_TEST: CursoRespuesta = { id: 93, ...CURSO_REQUEST };
export const ARCHIVO_TEST: ArchivoRespuesta = {
  mensaje: 'Archivo subido correctamente. Se importaron 2 cursos.',
  cursosImportados: 2,
  cursosOmitidos: 0,
  nombreArchivo: 'horario-prueba.pdf',
};
export function paginaCursos(
  content: readonly CursoRespuesta[] = [CURSO_TEST],
  number = 0,
  totalElements = content.length,
  size = 10,
): CursosPagina {
  return { content, number, totalElements, totalPages: Math.ceil(totalElements / size), size };
}
