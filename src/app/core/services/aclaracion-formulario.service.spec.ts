import { ChatRespuesta } from '../models/agente.models';
import {
  ACLARACION_CUPO,
  ACLARACION_ELIMINAR,
  ACLARACION_REFERENCIAS,
  ACLARACION_RUTA,
  respuestaV1,
} from '../models/aclaracion.testing';
import { AclaracionFormularioService } from './aclaracion-formulario.service';

describe('AclaracionFormularioService', () => {
  const servicio = new AclaracionFormularioService();
  const fraseAntigua = 'Completa el origen, los puntos de referencia y una capacidad mayor a cero.';
  const [referencias, capacidad] = ACLARACION_RUTA.campos;

  it.each([
    ACLARACION_REFERENCIAS,
    ACLARACION_RUTA,
    {
      ...ACLARACION_RUTA,
      campos: [
        { id: 'origen', etiqueta: 'Origen', tipo: 'text' as const, obligatorio: true },
        referencias,
        capacidad,
      ],
    },
  ])('crea los campos de $operacion exclusivamente desde el v1', (descriptor) => {
    const primero = servicio.crear(respuestaV1(descriptor, fraseAntigua), '');
    const segundo = servicio.crear(
      respuestaV1(descriptor, 'Un mensaje sin pregunta ni campos.'),
      'Otro texto',
    );
    expect(primero).toEqual(segundo);
    expect(primero?.campos).toEqual(descriptor.campos);
  });

  it('puede adaptar una operación futura sin catálogo de campos ni herramienta conocida', () => {
    const descriptor = {
      ...ACLARACION_REFERENCIAS,
      operacion: 'buscarCombinacion',
      campos: [{ ...referencias, id: 'referenciaNueva', inicial: 'Punto central' }],
    };
    expect(servicio.crear(respuestaV1(descriptor), '')?.campos).toEqual(descriptor.campos);
  });

  it.each([
    ['UUID inválido', { id: 'no-es-un-uuid' }],
    ['versión desconocida', { version: 2 }],
    ['operación inválida', { operacion: '/api/rutas' }],
    ['contexto inválido', { contexto: '<img src=x>' }],
    ['campos duplicados', { campos: [referencias, referencias] }],
    ['campo malicioso', { campos: [{ ...referencias, id: 'constructor' }] }],
    ['ID de prototipo', { campos: [{ ...referencias, id: '__proto__' }] }],
    ['tipo fuera del contrato', { campos: [{ ...referencias, tipo: 'html' }] }],
    ['propiedad no admitida', { campos: [{ ...referencias, onclick: 'run()' }] }],
    ['ayuda insegura', { campos: [{ ...referencias, ayuda: 'javascript:alert(1)' }] }],
    ['obligatorio no booleano', { campos: [{ ...referencias, obligatorio: 'false' }] }],
    ['opcionesRapidas no booleano', { opcionesRapidas: 'false' }],
    ['opcionesRapidas con dos campos', { opcionesRapidas: true }],
    ['límite incoherente', { campos: [{ ...capacidad, minimo: 8, maximo: 3 }] }],
    ['longitud fuera de rango', { campos: [{ ...referencias, longitudMaxima: 1001 }] }],
    ['inicial numérico fuera de rango', { campos: [{ ...capacidad, inicial: 0 }] }],
    [
      'fecha inicial inválida',
      { campos: [{ ...referencias, tipo: 'date', inicial: '2026-02-30' }] },
    ],
    ['hora inicial inválida', { campos: [{ ...referencias, tipo: 'time', inicial: '09:10:05' }] }],
    [
      'opciones duplicadas',
      {
        campos: [
          {
            ...ACLARACION_CUPO.campos[0],
            opciones: [
              { valor: 'A', etiqueta: 'Uno' },
              { valor: 'A', etiqueta: 'Dos' },
            ],
          },
        ],
      },
    ],
    [
      'valor inicial fuera del selector',
      { campos: [{ ...ACLARACION_CUPO.campos[0], inicial: 'OTRO' }] },
    ],
    ['select vacío', { campos: [{ ...ACLARACION_CUPO.campos[0], opciones: [] }] }],
    ['alternativos que no existen', { alMenosUno: ['fecha', 'hora'] }],
    ['alternativos duplicados', { alMenosUno: ['referencias', 'referencias'] }],
    ['alternativos obligatorios', { alMenosUno: ['referencias', 'capacidad'] }],
    ['formato breve incompatible', { respuestaBreve: 'valor' }],
    ['sin campos', { campos: [] }],
    [
      'demasiados campos',
      { campos: Array.from({ length: 9 }, (_, i) => ({ ...referencias, id: 'campo' + i })) },
    ],
  ])('rechaza %s y evita el fallback textual', (_, cambios) => {
    const respuesta = {
      ...respuestaV1(ACLARACION_RUTA, fraseAntigua),
      aclaracion: { ...ACLARACION_RUTA, ...cambios },
    } as unknown as ChatRespuesta;
    expect(servicio.crear(respuesta, 'Crea una ruta')).toBeNull();
  });

  it('distingue descriptor ausente de descriptor nulo o con claves de prototipo', () => {
    const { aclaracion, ...antigua } = respuestaV1(ACLARACION_RUTA, fraseAntigua);
    expect(servicio.crear(antigua, 'Crea una ruta')?.campos).toHaveLength(3);
    for (const valor of [null, undefined, JSON.parse('{"__proto__":{"campos":[]}}')]) {
      expect(servicio.crear({ ...antigua, aclaracion: valor }, 'Crea una ruta')).toBeNull();
    }
  });

  it('serializa enteros, cadenas escapadas y solo claves solicitadas, con resumen separado', () => {
    const envio = servicio.prepararEnvio(ACLARACION_RUTA, {
      referencias: 'UPC "Villa"\nPuerta A',
      capacidad: 3,
      origen: 'Surco',
    });
    expect(envio?.tecnico).toBe(
      'Datos de aclaración ' +
        ACLARACION_RUTA.id +
        ': {"referencias":"UPC \\"Villa\\"\\nPuerta A","capacidad":3}',
    );
    expect(envio?.visible).toBe(
      'Crear una ruta\nPuntos de referencia: UPC "Villa"\nPuerta A\nCapacidad máxima: 3',
    );
    expect(servicio.prepararEnvio(ACLARACION_RUTA, { capacidad: 1.5 })).toBeNull();
    expect(servicio.prepararEnvio(ACLARACION_RUTA, { referencias: ' ' })).toBeNull();
  });

  it('admite parciales y traduce el valor de opciones solo en la burbuja', () => {
    expect(
      servicio.prepararEnvio(ACLARACION_ELIMINAR, { origenActual: null, destinoActual: 'UPC' })
        ?.tecnico,
    ).toBe('Datos de aclaración ' + ACLARACION_ELIMINAR.id + ': {"destinoActual":"UPC"}');
    const envio = servicio.prepararEnvio(ACLARACION_CUPO, { compensacion: 'GASOLINA' });
    expect(envio?.tecnico).toContain('{"compensacion":"GASOLINA"}');
    expect(envio?.visible).toContain('Tipo de compensación: Gasolina');
  });

  it('admite el descriptor con advertencia recuperable y lo excluye ante resoluciones o incertidumbre', () => {
    const respuesta = respuestaV1(ACLARACION_RUTA);
    expect(
      servicio.crear(
        {
          ...respuesta,
          advertencia: { codigo: 'PROVIDER_RATE_LIMIT', mensaje: 'Límite temporal.' },
        },
        '',
      ),
    ).not.toBeNull();
    expect(
      servicio.crear(
        {
          ...respuesta,
          advertencia: { codigo: 'PREPARATION_RESULT_UNCERTAIN', mensaje: 'Resultado incierto.' },
        },
        '',
      ),
    ).toBeNull();
    expect(
      servicio.crear(
        {
          ...respuesta,
          resolucionConfirmacion: { estado: 'CANCELADA', confirmacion: null },
        },
        '',
      ),
    ).toBeNull();
  });
});
