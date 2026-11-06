import { FormControl, Validators } from '@angular/forms';
import {
  integerMinOneValidator,
  formatContributionDate,
  formatContributionTime,
} from './contribucion.models';

describe('Contribution presentation and validation', () => {
  it.each([1, 2, 3, 19, 100, 2147483647])('accepts positive integer %s', (value) => {
    expect(new FormControl(value, integerMinOneValidator).valid).toBe(true);
  });
  it.each([0, -1, 1.5, NaN, Infinity])('rejects invalid passenger quantity %s', (value) => {
    expect(new FormControl(value, integerMinOneValidator).invalid).toBe(true);
  });
  it('requires a quantity in the actual form without making the optional validator required', () => {
    expect(new FormControl(null, integerMinOneValidator).valid).toBe(true);
    expect(new FormControl(null, [Validators.required, integerMinOneValidator]).invalid).toBe(true);
  });
  it.each([
    ['2026-11-01', '1/11/2026'],
    ['2026-01-01', '1/1/2026'],
    ['2024-02-29', '29/2/2024'],
  ])('formats LocalDate %s without UTC conversion', (input, output) => {
    expect(formatContributionDate(input)).toBe(output);
  });
  it.each([
    ['00:05:00', '00:05'],
    ['23:59', '23:59'],
    ['07:30:00.123456', '07:30'],
  ])('formats local time %s', (input, output) => {
    expect(formatContributionTime(input)).toBe(output);
  });
});
