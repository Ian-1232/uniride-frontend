import { describe, expect, it } from 'vitest';
import type { Viaje } from './viajes.models';
import { accionViaje, filtrarViajes } from './viajes.models';

const viaje: Viaje = {
  id: 1,
  origen: 'San Borja',
  destino: 'UPC',
  dia: 'Viernes',
  fecha: 'Viernes, 6 nov',
  hora: '07:30',
  puntoEncuentro: 'Av. Arequipa 1234',
  ruta: 'Av. Arequipa 1234 → Campus UPC',
  capacidad: 3,
  aceptados: 1,
  contribucion: 10,
  conductor: { nombre: 'Juan Pérez', detalle: 'Estudiante UPC · San Borja', iniciales: 'JP' },
  estado: 'PROGRAMADO',
};

describe('filtrarViajes', () => {
  it('returns every scheduled trip when the filter is empty', () => {
    expect(filtrarViajes([viaje], {})).toEqual([viaje]);
  });

  it('matches origin and day case-insensitively', () => {
    expect(filtrarViajes([viaje], { origen: 'san borja' })).toEqual([viaje]);
    expect(filtrarViajes([viaje], { dia: 'viernes' })).toEqual([viaje]);
    expect(filtrarViajes([viaje], { dia: 'Lunes' })).toEqual([]);
  });

  it('matches an exact departure time and skips cancelled trips', () => {
    expect(filtrarViajes([viaje], { hora: '07:30' })).toEqual([viaje]);
    expect(filtrarViajes([viaje], { hora: '08:00' })).toEqual([]);
    expect(filtrarViajes([{ ...viaje, estado: 'CANCELADO' }], {})).toEqual([]);
  });
});

describe('accionViaje', () => {
  it('offers to join when there is no active request', () => {
    expect(accionViaje(viaje)).toBe('unirse');
    expect(accionViaje(viaje, { viajeId: 1, estado: 'CANCELADA' })).toBe('unirse');
  });

  it('offers cancelling the request while it is pending', () => {
    expect(accionViaje(viaje, { viajeId: 1, estado: 'PENDIENTE' })).toBe('cancelar-solicitud');
  });

  it('offers cancelling the trip once the request is accepted', () => {
    expect(accionViaje(viaje, { viajeId: 1, estado: 'ACEPTADA' })).toBe('cancelar-viaje');
  });

  it('offers no action on a cancelled trip', () => {
    expect(accionViaje({ ...viaje, estado: 'CANCELADO' })).toBeNull();
  });
});
