import { FormControl } from '@angular/forms';
import {
  diaCurso,
  horaCurso,
  HORA_CURSO,
  loteCursosValido,
  MAX_ARCHIVO_BYTES,
  segundosHora,
  validarArchivo,
} from './horarios.models';
import { CURSO_REQUEST } from './horarios.testing';
describe('Horarios validation and local display', () => {
  it.each(['00:00', '23:59', '08:05:09'])('accepts LocalTime-compatible %s', (hora) =>
    expect(HORA_CURSO.test(hora)).toBe(true),
  );
  it.each(['24:00', '08:60', '8:00', '12:30:60', '12:00Z'])('rejects invalid time %s', (hora) =>
    expect(HORA_CURSO.test(hora)).toBe(false),
  );
  it('compares local times including seconds and displays without UTC or truncating nonzero seconds', () => {
    expect(segundosHora('00:00:01')).toBe(1);
    expect(horaCurso('00:05:00')).toBe('00:05');
    expect(horaCurso('23:05:59')).toBe('23:05:59');
    expect(diaCurso('Miercoles')).toBe('Miércoles');
    expect(diaCurso('Sabado')).toBe('Sábado');
    expect(diaCurso('Otro valor')).toBe('Otro valor');
  });
  it('detects duplicate rows independent of name case and optional zero seconds', () => {
    const result = loteCursosValido(
      new FormControl([
        { ...CURSO_REQUEST, horaFin: '10:15' },
        {
          ...CURSO_REQUEST,
          nombre: ' CURSO DE PRUEBA ',
          horaInicio: '08:05:00',
          horaFin: '10:15:00',
        },
      ]),
    );
    expect(result).toEqual({ duplicados: [1, 2] });
  });
  it('detects overlapping batch rows, while allowing adjacent hours and another day', () => {
    expect(
      loteCursosValido(
        new FormControl([CURSO_REQUEST, { ...CURSO_REQUEST, nombre: 'Otro', horaInicio: '09:00' }]),
      ),
    ).toEqual({ solapamiento: [1, 2] });
    expect(
      loteCursosValido(
        new FormControl([
          CURSO_REQUEST,
          { ...CURSO_REQUEST, nombre: 'Otro', horaInicio: '10:15:30', horaFin: '11:30' },
        ]),
      ),
    ).toBeNull();
    expect(
      loteCursosValido(new FormControl([CURSO_REQUEST, { ...CURSO_REQUEST, dia: 'Viernes' }])),
    ).toBeNull();
  });
  it('enforces the backend nonempty batch and 500-course limit', () => {
    expect(loteCursosValido(new FormControl([]))).toEqual({ cantidad: true });
    expect(loteCursosValido(new FormControl(Array(501).fill(CURSO_REQUEST)))).toEqual({
      cantidad: true,
    });
  });
  it('accepts the exact 1 MiB limit and uppercase extension independently of browser MIME', () => {
    expect(validarArchivo(new File([new Uint8Array(MAX_ARCHIVO_BYTES)], 'horario.PDF'))).toBe('');
    expect(
      validarArchivo(new File(['contenido'], 'horario.TXT', { type: 'application/octet-stream' })),
    ).toBe('');
    expect(
      validarArchivo(new File([new Uint8Array(MAX_ARCHIVO_BYTES + 1)], 'horario.pdf')),
    ).toContain('1 MB');
  });
  it('rejects absent, empty and unsupported files', () => {
    expect(validarArchivo(null)).not.toBe('');
    expect(validarArchivo(new File([], 'horario.txt'))).toContain('vacío');
    expect(
      validarArchivo(new File(['fixture'], 'horario.exe', { type: 'application/pdf' })),
    ).toContain('PDF o TXT');
  });
});
