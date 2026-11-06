import { FormControl } from '@angular/forms';
import { agruparCursos, conflictosImportacion, cursosSuperpuestos } from './horarios-conflictos';
import { dentroDeFranja, rangoCurso } from './horarios.models';
import { ARCHIVO_TEST, CURSO_TEST } from './horarios.testing';

describe('Weekly schedule, overlaps and allowed hours', () => {
  it('groups all seven days and sorts by actual start time including seconds without changing input', () => {
    const input = [
      CURSO_TEST,
      { ...CURSO_TEST, id: 94, dia: 'miercoles', horaInicio: '06:00', horaFin: '08:00' },
      { ...CURSO_TEST, id: 95, horaInicio: '08:05:01' },
    ];
    const groups = agruparCursos(input);
    expect(groups.map((g) => g.dia)).toEqual([
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
      'Domingo',
    ]);
    expect(groups[2].cursos.map((c) => c.id)).toEqual([94, 93, 95]);
    expect(input.map((c) => c.id)).toEqual([93, 94, 95]);
    expect(groups[0].cursos).toEqual([]);
  });
  it('preserves an unknown backend day instead of hiding an existing course', () => {
    expect(agruparCursos([{ ...CURSO_TEST, dia: 'Otro' }])[7].cursos).toEqual([
      { ...CURSO_TEST, dia: 'Otro' },
    ]);
  });
  it('finds every real overlap, normalizes accents and permits adjacent intervals and other days', () => {
    const previous = [
      CURSO_TEST,
      { ...CURSO_TEST, id: 94, dia: 'Miercoles', horaInicio: '09:00', horaFin: '11:00' },
    ];
    expect(
      cursosSuperpuestos({ ...CURSO_TEST, horaInicio: '09:30', horaFin: '12:00' }, previous).map(
        (c) => c.id,
      ),
    ).toEqual([93, 94]);
    expect(
      cursosSuperpuestos({ ...CURSO_TEST, horaInicio: '10:15:30', horaFin: '11:00' }, [CURSO_TEST]),
    ).toEqual([]);
    expect(cursosSuperpuestos({ ...CURSO_TEST, dia: 'Viernes' }, previous)).toEqual([]);
  });
  it.each([
    ['06:00', '23:00', true],
    ['06:00:00', '23:00:00', true],
    ['05:59:59', '07:00', false],
    ['22:00', '23:00:01', false],
    ['bad', '23:00', false],
  ])('enforces local hours %s–%s (%s)', (horaInicio, horaFin, valid) => {
    expect(dentroDeFranja({ horaInicio, horaFin })).toBe(valid);
    if (horaInicio !== 'bad')
      expect(!!rangoCurso(new FormControl({ horaInicio, horaFin }))?.['franja']).toBe(!valid);
  });
  it('keeps range and hour-window errors distinct', () => {
    expect(rangoCurso(new FormControl({ horaInicio: '08:00', horaFin: '07:00' }))).toEqual({
      rango: true,
    });
  });
  const mensaje =
    'Archivo subido correctamente. Se importaron 1 cursos. 1 omitidos por conflicto de horario: «Curso entrante» (Miercoles de 09:00 a 10:00). Elimina o edita el curso existente y vuelve a subir el archivo.';
  it('uses only courses explicitly omitted by the server and matches real existing intervals', () => {
    const result = conflictosImportacion({ ...ARCHIVO_TEST, cursosOmitidos: 1, mensaje }, [
      CURSO_TEST,
    ]);
    expect(result.conflictos[0].nuevo).toEqual({
      nombre: 'Curso entrante',
      dia: 'Miércoles',
      horaInicio: '09:00',
      horaFin: '10:00',
    });
    expect(result.conflictos[0].existentes).toEqual([CURSO_TEST]);
    expect(result.detalleIncompleto).toBe(false);
  });
  it.each([
    mensaje.replace('1 omitidos', '2 omitidos'),
    mensaje.replace('09:00', '25:00'),
    'Mensaje cambiado por el servidor',
  ])('falls back to the actual message if the omitted-course grammar changes', (mensaje) => {
    const aviso = conflictosImportacion({ ...ARCHIVO_TEST, cursosOmitidos: 1, mensaje }, [
      CURSO_TEST,
    ]);
    expect(aviso.detalleIncompleto).toBe(true);
    expect(aviso.conflictos).toEqual([]);
    expect(aviso.mensajeServidor).toBe(mensaje);
  });
  it('does not invent an existing course when the refresh fails or the course was removed concurrently', () => {
    const aviso = conflictosImportacion({ ...ARCHIVO_TEST, cursosOmitidos: 1, mensaje }, null);
    expect(aviso.conflictos[0].existentes).toEqual([]);
    expect(aviso.detalleIncompleto).toBe(true);
    expect(conflictosImportacion(ARCHIVO_TEST, [CURSO_TEST]).conflictos).toEqual([]);
  });
});
