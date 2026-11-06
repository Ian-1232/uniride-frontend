import { FormControl, FormGroup } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import {
  anticipacionSalida,
  advertenciaPasajeros,
  horarioTexto,
  mismoHorario,
  salidaValida,
} from './reprogramar-viaje.models';
import { AHORA_REPROGRAMAR } from './reprogramar-viaje.testing';
describe('Reprogramacion local time and impact validation', () => {
  beforeEach(() => vi.spyOn(Date, 'now').mockReturnValue(AHORA_REPROGRAMAR));
  afterEach(() => vi.restoreAllMocks());
  it.each([
    ['2026-11-06', '10:00', 'pasada'],
    ['2026-11-05', '23:00', 'pasada'],
    ['2026-11-06', '21:59:59', 'anticipacion'],
    ['2026-11-06', '22:00', null],
    ['2026-11-07', '00:00:30', null],
  ])('checks local departure %s %s with the exact 12-hour threshold', (fecha, hora, error) => {
    const result = anticipacionSalida(
      new FormGroup({ fecha: new FormControl(fecha), hora: new FormControl(hora) }),
    );
    expect(result).toEqual(error ? { [error]: true } : null);
  });
  it.each([
    ['2026-02-30', '10:00'],
    ['', '10:00'],
    ['2026-11-08', '24:00'],
    ['2026-11-08', '8:00'],
    ['2026-11-08', '08:60'],
  ])('rejects invalid %s %s without UTC normalization', (fecha, hora) =>
    expect(salidaValida({ fecha, hora })).toBe(false),
  );
  it('preserves local date and seconds in the confirmation dialog', () => {
    expect(horarioTexto({ fecha: '2027-01-01', hora: '00:05:30' })).toBe(
      '01/01/2027 · 00:05:30 (Lima)',
    );
    expect(horarioTexto({ fecha: '2027-01-01', hora: '06:00:00' })).toBe(
      '01/01/2027 · 06:00 (Lima)',
    );
  });
  it('does not create a change just because LocalTime returned seconds or fractional zeroes', () => {
    expect(
      mismoHorario(
        { fecha: '2026-11-08', hora: '08:00' },
        { fecha: '2026-11-08', hora: '08:00:00.000' },
      ),
    ).toBe(true);
    expect(
      mismoHorario(
        { fecha: '2026-11-08', hora: '08:00:01' },
        { fecha: '2026-11-08', hora: '08:00:00' },
      ),
    ).toBe(false);
  });
  it('recognizes only the actual passenger impact warning, not arbitrary conflicts containing the query string', () => {
    const mensaje =
      'ADVERTENCIA: el cambio de horario afecta a 2 pasajero(s) aceptado(s). Confirma usando ?confirmarImpacto=true.';
    expect(advertenciaPasajeros(new HttpErrorResponse({ status: 409, error: { mensaje } }))).toBe(
      true,
    );
    expect(advertenciaPasajeros(new HttpErrorResponse({ status: 400, error: { mensaje } }))).toBe(
      false,
    );
    expect(
      advertenciaPasajeros(
        new HttpErrorResponse({ status: 409, error: { mensaje: 'SQL confirmarImpacto=true' } }),
      ),
    ).toBe(false);
  });
});
