import type {
  BusquedaRespuesta,
  Pagina,
  SolicitudRespuesta,
  SolicitudHistorialRespuesta,
} from './viajes.models';
/** Fixtures used exclusively by unit/integration tests. */
export const busquedaFixture: BusquedaRespuesta = {
  viajeId: 74,
  rutaId: 9,
  origen: 'Campus Norte',
  destino: 'Biblioteca',
  fecha: '2027-01-01',
  hora: '00:05:00',
  dia: 'Viernes',
  puntosReferencia: 'Referencia de la ruta',
  zonasSinParada: 'Tramo privado',
  notaContribucion: 'Coordinar el aporte',
  capacidadMaxima: 6,
  conductorId: 18,
  conductorNombre: 'Conductora Prueba',
  contribucionSugerida: null,
};
export const solicitudFixture: SolicitudRespuesta = {
  id: 308,
  viajeId: 74,
  rutaId: 9,
  origen: 'Campus Norte',
  destino: 'Biblioteca',
  fecha: '2027-01-01',
  hora: '00:05:00',
  dia: 'Viernes',
  mensaje: 'Consulta de prueba',
  preferenciaCompensacion: 'DINERO',
  estado: 'PENDIENTE',
  motivoRechazo: null,
  fechaCreacion: '2026-11-06T09:00:00',
  advertencia: null,
  pasajeroId: 7,
  pasajeroNombre: 'Pasajera Prueba',
  pasajeroCorreo: 'prueba@upc.edu.pe',
  pasajeroCarrera: null,
  pasajeroDistrito: null,
  acuerdoTerminos: null,
  acuerdoEstado: null,
  metodoCompensacionId: null,
  metodoCompensacionTipo: null,
  metodoCompensacionDescripcion: null,
};
export const historialFixture: SolicitudHistorialRespuesta = {
  solicitud: { ...solicitudFixture, estado: 'ACEPTADA' },
  estadoViaje: 'COMPLETADO',
  soloLectura: true,
  penalidades: [
    { id: 901, tipo: 'LEVE', motivo: 'Penalidad propia de prueba', fecha: '2026-11-05T10:00:00' },
  ],
};
export function pageFixture<T>(
  content: readonly T[],
  page = 0,
  totalElements = content.length,
  size = 10,
): Pagina<T> {
  return {
    content,
    number: page,
    totalElements,
    totalPages: Math.ceil(totalElements / size),
    size,
  };
}
