import { FormControl } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { nonBlankValidator, TIPO_COMPENSACION_LABELS } from './compensaciones.models';

describe('compensaciones models', () => {
  it('keeps backend enum values separate from Spanish labels', () => {
    expect(TIPO_COMPENSACION_LABELS.DINERO).toBe('Dinero');
    expect(TIPO_COMPENSACION_LABELS.GASOLINA).toBe('Gasolina');
    expect(TIPO_COMPENSACION_LABELS.FAVOR).toBe('Favor');
  });

  it('rejects an empty or whitespace-only description', () => {
    const empty = new FormControl('', nonBlankValidator);
    const spaces = new FormControl('   ', nonBlankValidator);
    const valid = new FormControl('Aporte de combustible', nonBlankValidator);

    expect(empty.hasError('blank')).toBe(true);
    expect(spaces.hasError('blank')).toBe(true);
    expect(valid.valid).toBe(true);
  });
});
