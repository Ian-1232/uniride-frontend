import { signal } from '@angular/core';

// shortcut: estados reducidos a los que usa el módulo 3; el enum completo (RECHAZADA,
// VENCIDO, EN_PROGRESO…) llega con los módulos 4 y 5.
export type EstadoViaje = 'PROGRAMADO' | 'CANCELADO';
export type EstadoSolicitud = 'PENDIENTE' | 'ACEPTADA' | 'CANCELADA';
export type TipoCompensacion = 'DINERO' | 'GASOLINA' | 'FAVOR';

export interface Conductor {
  readonly nombre: string;
  readonly detalle: string;
  readonly iniciales: string;
}

export interface Viaje {
  readonly id: number;
  readonly origen: string;
  readonly destino: string;
  readonly dia: string;
  readonly fecha: string;
  readonly hora: string;
  readonly puntoEncuentro: string;
  readonly ruta: string;
  readonly capacidad: number;
  /** Pasajeros aceptados sin incluir al usuario actual. */
  readonly aceptados: number;
  readonly contribucion: number;
  readonly conductor: Conductor;
  readonly estado: EstadoViaje;
}

export interface Solicitud {
  readonly viajeId: number;
  readonly estado: EstadoSolicitud;
}

export interface MetodoCompensacion {
  readonly id: number;
  readonly tipo: TipoCompensacion;
  readonly descripcion: string;
}

export interface BadgeEstado {
  readonly etiqueta: string;
  readonly tono: 'info' | 'success' | 'warning' | 'danger';
}

export interface FiltroBusqueda {
  readonly origen?: string | null;
  readonly dia?: string | null;
  readonly hora?: string | null;
}

export const DIAS_SEMANA = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
] as const;

export const ETIQUETAS_COMPENSACION: Record<TipoCompensacion, string> = {
  DINERO: 'Dinero',
  GASOLINA: 'Gasolina',
  FAVOR: 'Favor',
};

export const METODOS_COMPENSACION: readonly MetodoCompensacion[] = [
  { id: 1, tipo: 'DINERO', descripcion: 'Yape - Juan Pérez' },
  { id: 2, tipo: 'DINERO', descripcion: 'Plin - Juan Pérez' },
  { id: 3, tipo: 'GASOLINA', descripcion: 'Ayuda con gasolina' },
  { id: 4, tipo: 'FAVOR', descripcion: 'Favor: apoyo con tareas' },
];

const MUESTRAS: readonly Viaje[] = [
  {
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
    conductor: {
      nombre: 'Juan Pérez',
      detalle: 'Estudiante UPC · San Borja',
      iniciales: 'JP',
    },
    estado: 'PROGRAMADO',
  },
  {
    id: 2,
    origen: 'Surco',
    destino: 'UPC',
    dia: 'Lunes',
    fecha: 'Lunes, 9 nov',
    hora: '07:00',
    puntoEncuentro: 'Caminos del Inca 155',
    ruta: 'Caminos del Inca 155 → Campus UPC',
    capacidad: 4,
    aceptados: 3,
    contribucion: 10,
    conductor: {
      nombre: 'Camila Rojas',
      detalle: 'Estudiante UPC · Surco',
      iniciales: 'CR',
    },
    estado: 'PROGRAMADO',
  },
  {
    id: 3,
    origen: 'Los Olivos',
    destino: 'UPC',
    dia: 'Miércoles',
    fecha: 'Miércoles, 12 nov',
    hora: '07:45',
    puntoEncuentro: 'Av. Tupac Amaru 4500',
    ruta: 'Av. Tupac Amaru 4500 → Campus UPC',
    capacidad: 4,
    aceptados: 1,
    contribucion: 8,
    conductor: {
      nombre: 'Luis Torres',
      detalle: 'Estudiante UPC · Los Olivos',
      iniciales: 'LT',
    },
    estado: 'PROGRAMADO',
  },
  {
    id: 4,
    origen: 'Callao',
    destino: 'UPC',
    dia: 'Viernes',
    fecha: 'Viernes, 14 nov',
    hora: '06:50',
    puntoEncuentro: 'Av. Argentina 2060',
    ruta: 'Av. Argentina 2060 → Campus UPC',
    capacidad: 4,
    aceptados: 2,
    contribucion: 10,
    conductor: {
      nombre: 'María Vega',
      detalle: 'Estudiante UPC · Callao',
      iniciales: 'MV',
    },
    estado: 'PROGRAMADO',
  },
  {
    id: 5,
    origen: 'Miraflores',
    destino: 'UPC',
    dia: 'Lunes',
    fecha: 'Lunes, 9 nov',
    hora: '07:15',
    puntoEncuentro: 'Av. Pardo 540',
    ruta: 'Av. Pardo 540 → Campus UPC',
    capacidad: 4,
    aceptados: 2,
    contribucion: 12,
    conductor: {
      nombre: 'Diego Ramírez',
      detalle: 'Estudiante UPC · Miraflores',
      iniciales: 'DR',
    },
    estado: 'PROGRAMADO',
  },
  {
    id: 6,
    origen: 'San Miguel',
    destino: 'UPC',
    dia: 'Martes',
    fecha: 'Martes, 10 nov',
    hora: '08:00',
    puntoEncuentro: 'Av. Universitaria 480',
    ruta: 'Av. Universitaria 480 → Campus UPC',
    capacidad: 5,
    aceptados: 2,
    contribucion: 10,
    conductor: {
      nombre: 'Ana Paredes',
      detalle: 'Estudiante UPC · San Miguel',
      iniciales: 'AP',
    },
    estado: 'PROGRAMADO',
  },
  {
    id: 7,
    origen: 'Villa El Salvador',
    destino: 'UPC',
    dia: 'Jueves',
    fecha: 'Jueves, 13 nov',
    hora: '06:45',
    puntoEncuentro: 'Av. Revolución 1550',
    ruta: 'Av. Revolución 1550 → Campus UPC',
    capacidad: 4,
    aceptados: 0,
    contribucion: 8,
    conductor: {
      nombre: 'Pedro Soto',
      detalle: 'Estudiante UPC · Villa El Salvador',
      iniciales: 'PS',
    },
    estado: 'PROGRAMADO',
  },
  {
    id: 8,
    origen: 'Independencia',
    destino: 'UPC',
    dia: 'Viernes',
    fecha: 'Viernes, 20 nov',
    hora: '07:30',
    puntoEncuentro: 'Av. Tupac Amaru 850',
    ruta: 'Av. Tupac Amaru 850 → Campus UPC',
    capacidad: 3,
    aceptados: 1,
    contribucion: 10,
    conductor: {
      nombre: 'Rosa Chávez',
      detalle: 'Estudiante UPC · Independencia',
      iniciales: 'RC',
    },
    estado: 'PROGRAMADO',
  },
];

// shortcut: estado en memoria; se reemplaza por GET/POST al conectar el backend.
export const VIAJES = signal<readonly Viaje[]>(MUESTRAS);
export const SOLICITUDES = signal<readonly Solicitud[]>([
  { viajeId: 1, estado: 'ACEPTADA' },
  { viajeId: 2, estado: 'ACEPTADA' },
  { viajeId: 3, estado: 'PENDIENTE' },
  { viajeId: 4, estado: 'PENDIENTE' },
]);

export const ORIGENES = [...new Set(MUESTRAS.map((viaje) => viaje.origen))];

export function filtrarViajes(viajes: readonly Viaje[], filtro: FiltroBusqueda): Viaje[] {
  const origen = filtro.origen?.trim().toLowerCase() ?? '';
  const dia = filtro.dia?.trim().toLowerCase() ?? '';
  const hora = filtro.hora?.trim() ?? '';

  return viajes.filter(
    (viaje) =>
      viaje.estado === 'PROGRAMADO' &&
      (origen === '' || viaje.origen.toLowerCase().includes(origen)) &&
      (dia === '' || viaje.dia.toLowerCase() === dia) &&
      (hora === '' || viaje.hora === hora),
  );
}

export type AccionViaje = 'unirse' | 'cancelar-solicitud' | 'cancelar-viaje' | null;

export function accionViaje(viaje: Viaje, solicitud?: Solicitud): AccionViaje {
  if (viaje.estado === 'CANCELADO') {
    return null;
  }
  if (solicitud?.estado === 'ACEPTADA') {
    return 'cancelar-viaje';
  }
  if (solicitud?.estado === 'PENDIENTE') {
    return 'cancelar-solicitud';
  }
  return 'unirse';
}

export function solicitudDe(
  solicitudes: readonly Solicitud[],
  viajeId: number,
): Solicitud | undefined {
  return solicitudes.find(
    (solicitud) => solicitud.viajeId === viajeId && solicitud.estado !== 'CANCELADA',
  );
}

export function viajesDeSolicitud(
  solicitudes: readonly Solicitud[],
  viajes: readonly Viaje[],
  estado: 'ACEPTADA' | 'PENDIENTE',
): Viaje[] {
  const ids = solicitudes
    .filter((solicitud) => solicitud.estado === estado)
    .map((solicitud) => solicitud.viajeId);
  return viajes.filter((viaje) => ids.includes(viaje.id) && viaje.estado === 'PROGRAMADO');
}

export function badgeSolicitud(solicitud?: Solicitud): BadgeEstado {
  if (solicitud?.estado === 'ACEPTADA') {
    return { etiqueta: 'Confirmado', tono: 'success' };
  }
  if (solicitud?.estado === 'PENDIENTE') {
    return { etiqueta: 'Pendiente', tono: 'warning' };
  }
  return { etiqueta: 'Disponible', tono: 'info' };
}

export function badgeDetalle(viaje: Viaje, solicitud?: Solicitud): BadgeEstado {
  if (viaje.estado === 'CANCELADO') {
    return { etiqueta: 'Cancelado', tono: 'danger' };
  }
  if (solicitud?.estado === 'ACEPTADA') {
    return { etiqueta: 'Confirmado', tono: 'success' };
  }
  if (solicitud?.estado === 'PENDIENTE') {
    return { etiqueta: 'Solicitud pendiente', tono: 'warning' };
  }
  return { etiqueta: 'PROGRAMADO', tono: 'info' };
}

export function cuposDisponibles(viaje: Viaje, solicitud?: Solicitud): number {
  const ocupados = viaje.aceptados + (solicitud?.estado === 'ACEPTADA' ? 1 : 0);
  return viaje.capacidad - ocupados;
}

export function cuposTexto(cupos: number): string {
  return `${cupos} ${cupos === 1 ? 'cupo libre' : 'cupos libres'}`;
}

export function asientosDetalle(viaje: Viaje, solicitud?: Solicitud): string {
  if (solicitud?.estado === 'ACEPTADA') {
    const libres = viaje.capacidad - viaje.aceptados - 1;
    return `${cuposTexto(libres)} · ${viaje.aceptados + 1} aceptados`;
  }
  return `${cuposDisponibles(viaje)} de ${viaje.capacidad} cupos`;
}

export function salidaTexto(viaje: Viaje): string {
  return `${viaje.fecha} · ${viaje.hora}`;
}
