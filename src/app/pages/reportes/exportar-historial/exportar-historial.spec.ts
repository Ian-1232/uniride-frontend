import { FormControl, FormGroup } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { dateRangeValidator } from '../../../core/models/exportar-historial.models';

function createDateRange(desde: Date | null, hasta: Date | null): FormGroup {
  return new FormGroup(
    {
      desde: new FormControl(desde),
      hasta: new FormControl(hasta),
    },
    { validators: dateRangeValidator },
  );
}

describe('dateRangeValidator', () => {
  it('accepts an empty or partial date range', () => {
    expect(createDateRange(null, null).valid).toBe(true);
    expect(createDateRange(new Date(2026, 9, 1), null).valid).toBe(true);
  });

  it('accepts an ordered date range', () => {
    const form = createDateRange(new Date(2026, 9, 1), new Date(2026, 9, 31));

    expect(form.valid).toBe(true);
  });

  it('rejects a start date after the end date', () => {
    const form = createDateRange(new Date(2026, 10, 30), new Date(2026, 10, 1));

    expect(form.hasError('dateRange')).toBe(true);
  });
});
