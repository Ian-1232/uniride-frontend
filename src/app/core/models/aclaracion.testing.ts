import { AclaracionAgenteV1 } from './aclaracion.models';
import { ChatRespuesta } from './agente.models';

// Fixtures de docs/agente_aclaraciones.md en el backend.
export const CONVERSACION = 'ee2a58bc-82e1-46cf-86c3-e286316a87d1';
export const ACLARACION_RUTA: AclaracionAgenteV1 = {
  version: 1,
  id: 'cead719a-918b-4555-8d27-2fbdf6421720',
  operacion: 'crearRuta',
  contexto: 'Crear una ruta',
  campos: [
    { id: 'referencias', etiqueta: 'Puntos de referencia', tipo: 'textarea', obligatorio: true },
    {
      id: 'capacidad',
      etiqueta: 'Capacidad máxima',
      tipo: 'number',
      obligatorio: true,
      minimo: 1,
      maximo: 2147483647,
    },
  ],
  respuestaBreve: 'campo',
};

export const ACLARACION_REFERENCIAS: AclaracionAgenteV1 = {
  ...ACLARACION_RUTA,
  id: 'c883be48-2639-4b78-a5cf-7b6c8325bda6',
  campos: [ACLARACION_RUTA.campos[0]],
  respuestaBreve: 'valor',
};

export const ACLARACION_ELIMINAR: AclaracionAgenteV1 = {
  version: 1,
  id: '5fdc652f-ae2f-4bbc-a6cc-e6c12ee4baf1',
  operacion: 'eliminarRuta',
  contexto: 'Identificar la ruta que quieres eliminar',
  campos: ['origen', 'destino'].map((campo) => ({
    id: campo + 'Actual',
    etiqueta: campo === 'origen' ? 'Origen actual' : 'Destino actual',
    tipo: 'text',
    obligatorio: false,
    longitudMaxima: 255,
    ayuda: 'Completa al menos uno de estos campos.',
  })),
  alMenosUno: ['origenActual', 'destinoActual'],
  respuestaBreve: 'campo',
};

export const ACLARACION_CUPO: AclaracionAgenteV1 = {
  version: 1,
  id: 'e428b153-5794-4400-86e0-878002db5047',
  operacion: 'solicitarUnirse',
  contexto: 'Solicitar un cupo',
  campos: [
    {
      id: 'compensacion',
      etiqueta: 'Tipo de compensación',
      tipo: 'select',
      obligatorio: true,
      opciones: [
        { valor: 'DINERO', etiqueta: 'Dinero' },
        { valor: 'GASOLINA', etiqueta: 'Gasolina' },
        { valor: 'FAVOR', etiqueta: 'Favor' },
      ],
    },
  ],
  opcionesRapidas: true,
  respuestaBreve: 'campo',
};

export const CONVERSACION_VIAJE = 'ff4291eb-85b3-4e85-93a4-f9b745340452';
export const ACLARACION_VIAJE: AclaracionAgenteV1 = {
  version: 1,
  id: '6c9bace5-d0b3-4d34-a1cb-5d45b0ea57a3',
  operacion: 'crearViaje',
  contexto: 'Crear un viaje',
  campos: [
    {
      id: 'ruta',
      etiqueta: 'Ruta registrada',
      tipo: 'select',
      obligatorio: true,
      opciones: [
        {
          valor: '22e75375-0978-45ea-8535-bb459262cf32',
          etiqueta: '1. Surco → UPC Monterrico · Capacidad 3 · Parque central',
        },
        {
          valor: '0c262523-1dd1-42dd-9bb0-a48fe4a6d4bc',
          etiqueta: '2. Barranco → UPC Villa · Capacidad 4 · Plaza de Barranco',
        },
      ],
    },
    { id: 'fecha', etiqueta: 'Fecha', tipo: 'date', obligatorio: true },
    { id: 'hora', etiqueta: 'Hora', tipo: 'time', obligatorio: true },
  ],
  respuestaBreve: 'campo',
};

export const ACLARACION_HORA_VIAJE: AclaracionAgenteV1 = {
  ...ACLARACION_VIAJE,
  id: 'ee009b7e-63ee-46fd-95be-282778f935cb',
  campos: [ACLARACION_VIAJE.campos[2]],
};

export const ACLARACION_CORREGIR_RUTA: AclaracionAgenteV1 = {
  ...ACLARACION_VIAJE,
  id: '728a3aad-033c-4c94-ba9b-58538be4d3ed',
  campos: [
    {
      ...ACLARACION_VIAJE.campos[0],
      opciones: [
        {
          valor: '19252154-3384-46d4-abce-0d35ef31e4c5',
          etiqueta: '1. Surco → UPC Monterrico · Capacidad 3 · Parque central',
        },
      ],
    },
  ],
  opcionesRapidas: true,
  respuestaBreve: 'valor',
};

export const ACLARACION_RUTAS_SIMILARES: AclaracionAgenteV1 = {
  ...ACLARACION_CORREGIR_RUTA,
  id: '658ff969-eddf-4083-9acc-39626ed499ad',
  campos: [
    {
      ...ACLARACION_VIAJE.campos[0],
      opciones: [
        {
          valor: 'e1fdc837-3e2b-4838-8776-3c34980e17bd',
          etiqueta: '1. Surco → UPC Monterrico · Capacidad 3 · Parque central',
        },
        {
          valor: '944c514d-1969-431b-a286-225abaf9e363',
          etiqueta: '2. Surco → UPC Monterrico · Capacidad 3 · Óvalo Higuereta',
        },
      ],
    },
  ],
};

export function respuestaV1(
  aclaracion: AclaracionAgenteV1,
  message = 'Completa los datos solicitados.',
): ChatRespuesta {
  return {
    message,
    aclaracion,
    conversationId: CONVERSACION,
    operacion: null,
    advertencia: null,
    viajes: [],
    rutas: [],
    metodosCompensacion: [],
    resultados: [],
  };
}
