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
