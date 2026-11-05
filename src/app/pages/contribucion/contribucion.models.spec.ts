import { FormControl } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import {
  integerMinOneValidator,
  resolveContribucionState,
  SUGERENCIA_DOS_PASAJEROS,
  SUGERENCIA_UN_PASAJERO,
} from './contribucion.models';

describe('contribucion models', () => {
  it('keeps every field expected by SugerenciaContribucionRespuesta', () => {
    expect(Object.keys(SUGERENCIA_DOS_PASAJEROS.respuesta)).toEqual([
      'viajeId',
      'origen',
      'destino',
      'dia',
      'fecha',
      'hora',
      'pasajeros',
      'esHoraPico',
      'costoTotalEstimado',
      'aporteEstimado',
      'litrosGasolinaAprox',
      'sugerenciaFavor',
      'nota',
    ]);
  });

  it('uses independent fixtures for one and two passengers', () => {
    expect(SUGERENCIA_DOS_PASAJEROS.respuesta).not.toBe(
      SUGERENCIA_UN_PASAJERO.respuesta,
    );
    expect(SUGERENCIA_DOS_PASAJEROS.respuesta.aporteEstimado).toBe(6);
    expect(SUGERENCIA_UN_PASAJERO.respuesta.aporteEstimado).toBe(12);
    expect(SUGERENCIA_DOS_PASAJEROS.respuesta.litrosGasolinaAprox).toBe(1.11);
    expect(SUGERENCIA_UN_PASAJERO.respuesta.litrosGasolinaAprox).toBe(2.22);
  });

  it('validates integer passenger quantities with a minimum of one', () => {
    expect(new FormControl(null, integerMinOneValidator).valid).toBe(true);
    expect(new FormControl(0, integerMinOneValidator).hasError('min')).toBe(true);
    expect(new FormControl(1.5, integerMinOneValidator).hasError('integer')).toBe(true);
    expect(new FormControl(1, integerMinOneValidator).valid).toBe(true);
  });

  it('falls back from an unknown demonstration state', () => {
    expect(resolveContribucionState('desconocido')).toBe('disponible');
  });
});
