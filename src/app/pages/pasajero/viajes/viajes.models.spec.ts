import { desdeBusqueda, desdeSolicitud, ESTADOS_SOLICITUD, salidaTexto } from './viajes.models';
import { busquedaFixture, solicitudFixture } from './viajes.testing';
describe('Passenger DTO mappings', () => {
  it('uses capacity only and never invents occupancy or an exact pickup point', () => {
    const trip = desdeBusqueda(busquedaFixture);
    expect(trip.capacidadMaxima).toBe(6);
    expect(trip.puntosReferencia).toBe(busquedaFixture.puntosReferencia);
    expect(trip.conductorNombre).toBe(busquedaFixture.conductorNombre);
    expect('aceptados' in trip).toBe(false);
    expect('puntoEncuentro' in trip).toBe(false);
  });
  it('leaves missing request DTO fields absent instead of borrowing driver data from the passenger', () => {
    const trip = desdeSolicitud(solicitudFixture);
    expect(trip.conductorNombre).toBeNull();
    expect(trip.capacidadMaxima).toBeNull();
    expect(trip.estado).toBeNull();
    expect(trip.contribucion).toBeNull();
  });
  it('preserves all four request statuses', () => {
    expect(ESTADOS_SOLICITUD).toEqual(['ACEPTADA', 'PENDIENTE', 'RECHAZADA', 'CANCELADA']);
  });
  it('formats local calendar date and time without interpreting UTC', () => {
    expect(salidaTexto(desdeBusqueda(busquedaFixture))).toBe('Viernes 1/1/2027 · 00:05');
  });
});
