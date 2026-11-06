import {
  fechaDashboard,
  horaDashboard,
  proximoViajeConductor,
  salidaValida,
} from './dashboard.models';
import { RUTA_DASHBOARD, VIAJE_DASHBOARD } from '../../testing/dashboard-fixtures';
describe('Dashboard local dates and trip selection', () => {
  it('preserves the local calendar date and nonzero seconds', () => {
    expect(fechaDashboard('2027-01-01')).toBe('01/01/2027');
    expect(horaDashboard('00:05:30')).toBe('00:05:30');
    expect(horaDashboard('06:00')).toBe('06:00');
    expect(horaDashboard('23:00:00')).toBe('23:00');
  });
  it.each([
    ['2027-02-30', '12:00'],
    ['2027-01-01', '24:00'],
    ['', '08:00'],
    ['2027-01-01', '08:60'],
  ])('does not normalize or display invalid departure %s %s', (fecha, hora) => {
    expect(salidaValida({ fecha, hora })).toBe(false);
  });
  it('handles invalid display values without Invalid Date or NaN', () => {
    expect(fechaDashboard('bad')).toBe('Fecha no disponible');
    expect(horaDashboard('bad')).toBe('Hora no disponible');
  });
  it('selects a departure today by local seconds across midnight, independent of browser timezone', () => {
    const ruta = RUTA_DASHBOARD;
    const rows = [
      { ...VIAJE_DASHBOARD, id: 10, ruta, hora: '00:05:02' },
      { ...VIAJE_DASHBOARD, id: 11, ruta, hora: '00:05:01' },
      { ...VIAJE_DASHBOARD, id: 12, ruta, fecha: '2026-12-31', hora: '23:59:59' },
    ];
    expect(proximoViajeConductor(rows, Date.parse('2027-01-01T00:05:00-05:00'))?.id).toBe(11);
  });
  it.each(['COMPLETADO', 'CANCELADO', 'VENCIDO'] as const)(
    'excludes %s even with a future date',
    (estado) => {
      expect(
        proximoViajeConductor(
          [{ ...VIAJE_DASHBOARD, ruta: RUTA_DASHBOARD, estado }],
          Date.parse('2026-01-01T00:00-05:00'),
        ),
      ).toBeNull();
    },
  );
  it('prioritizes an ongoing trip over a future scheduled trip, without mutating input', () => {
    const rows = [
      { ...VIAJE_DASHBOARD, ruta: RUTA_DASHBOARD },
      {
        ...VIAJE_DASHBOARD,
        id: 792,
        fecha: '2026-12-31',
        ruta: RUTA_DASHBOARD,
        estado: 'EN_PROGRESO' as const,
      },
    ];
    expect(proximoViajeConductor(rows, Date.parse('2027-01-01T00:00-05:00'))?.id).toBe(792);
    expect(rows[0].id).toBe(791);
  });
});
