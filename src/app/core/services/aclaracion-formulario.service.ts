import { Injectable } from '@angular/core';
import {
  CampoAclaracion,
  EspecificacionAclaracion,
  OpcionAclaracion,
  ValoresAclaracion,
} from '../models/aclaracion.models';
import { ChatRespuesta, ResultadoAgente } from '../models/agente.models';

export const LIMITE_MENSAJE_AGENTE = 1000;

interface Concepto {
  readonly patron: RegExp;
  readonly campo: Omit<CampoAclaracion, 'obligatorio'>;
  readonly frase: string;
}

const CATALOGO: readonly Concepto[] = [
  {
    patron: /^origen(?: de la ruta(?: propia)?)?$/,
    campo: { id: 'origen', etiqueta: 'Origen', tipo: 'text', longitudMaxima: 120 },
    frase: 'origen',
  },
  {
    patron: /^origen actual(?: de la ruta)?$/,
    campo: { id: 'origenActual', etiqueta: 'Origen actual', tipo: 'text', longitudMaxima: 120 },
    frase: 'origen actual',
  },
  {
    patron: /^nuevo origen$/,
    campo: { id: 'nuevoOrigen', etiqueta: 'Nuevo origen', tipo: 'text', longitudMaxima: 120 },
    frase: 'nuevo origen',
  },
  {
    patron: /^destino(?: de la ruta(?: propia)?)?$/,
    campo: { id: 'destino', etiqueta: 'Destino', tipo: 'text', longitudMaxima: 120 },
    frase: 'destino',
  },
  {
    patron: /^destino actual(?: de la ruta)?$/,
    campo: { id: 'destinoActual', etiqueta: 'Destino actual', tipo: 'text', longitudMaxima: 120 },
    frase: 'destino actual',
  },
  {
    patron: /^puntos? de referencia$/,
    campo: {
      id: 'referencias',
      etiqueta: 'Puntos de referencia',
      tipo: 'textarea',
      longitudMaxima: 250,
    },
    frase: 'puntos de referencia',
  },
  {
    patron: /^capacidad(?: maxima)?(?: (?:mayor a|mayor que|superior a) (?:0|cero)| positiva)?$/,
    campo: {
      id: 'capacidad',
      etiqueta: 'Capacidad máxima',
      tipo: 'number',
      minimo: 1,
      maximo: 2147483647,
      ayuda: 'Ingresa un número entero mayor que cero.',
    },
    frase: 'capacidad máxima de',
  },
  {
    patron: /^fecha(?: exacta)?$/,
    campo: { id: 'fecha', etiqueta: 'Fecha', tipo: 'date' },
    frase: 'fecha',
  },
  {
    patron: /^nueva fecha$/,
    campo: { id: 'nuevaFecha', etiqueta: 'Nueva fecha', tipo: 'date' },
    frase: 'nueva fecha',
  },
  {
    patron: /^hora(?: exacta)?$/,
    campo: { id: 'hora', etiqueta: 'Hora', tipo: 'time' },
    frase: 'hora',
  },
  {
    patron: /^nueva hora$/,
    campo: { id: 'nuevaHora', etiqueta: 'Nueva hora', tipo: 'time' },
    frase: 'nueva hora',
  },
  {
    patron: /^(?:tipo de compensacion|(?:nuevo )?tipo del metodo de compensacion)$/,
    campo: {
      id: 'compensacion',
      etiqueta: 'Tipo de compensación',
      tipo: 'text',
      longitudMaxima: 60,
    },
    frase: 'tipo de compensación',
  },
  {
    patron: /^(?:nueva )?descripcion(?: del metodo)?$/,
    campo: { id: 'descripcion', etiqueta: 'Descripción', tipo: 'textarea', longitudMaxima: 240 },
    frase: 'descripción',
  },
  {
    patron: /^(?:cantidad|numero) de pasajeros$/,
    campo: {
      id: 'pasajeros',
      etiqueta: 'Cantidad de pasajeros',
      tipo: 'number',
      minimo: 1,
      maximo: 2147483647,
    },
    frase: 'cantidad de pasajeros:',
  },
  {
    patron: /^nombre del conductor$/,
    campo: { id: 'conductor', etiqueta: 'Nombre del conductor', tipo: 'text', longitudMaxima: 120 },
    frase: 'nombre del conductor',
  },
];

const TIPOS_COMPENSACION: readonly OpcionAclaracion[] = [
  { valor: 'DINERO', etiqueta: 'Dinero' },
  { valor: 'GASOLINA', etiqueta: 'Gasolina' },
  { valor: 'FAVOR', etiqueta: 'Favor' },
];

const LISTA_COMPENSACION =
  /^(?:prefieres compensar con |(?:(?:indica|elige|selecciona) (?:como prefieres compensar|(?:el )?tipo de compensacion)|que tipo de compensacion prefieres|que tipo quieres para el nuevo metodo):\s*)(.+)$/;
const PEDIDO_OPCIONES =
  /^(?:(?:elige|selecciona) (?:el )?(origen|destino|nombre del conductor)|que (origen|destino) prefieres)$/;
const PEDIDO =
  /^(?:por favor,? )?(?:(?:completa|indica|especifica|proporciona|ingresa|dime|necesito|me falta(?:n)?)\s*:?\s+|(?:cual(?:es)? (?:es|son|sera|seran)|puedes indicar)\s+)(.+)$/;

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\*\*|__/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function datosDe(resultado: ResultadoAgente): Record<string, unknown> | null {
  return resultado.datos && typeof resultado.datos === 'object' && !Array.isArray(resultado.datos)
    ? (resultado.datos as Record<string, unknown>)
    : null;
}

function compensacion(opciones: readonly OpcionAclaracion[]): CampoAclaracion {
  return {
    id: 'compensacion',
    etiqueta: 'Tipo de compensación',
    tipo: 'select',
    obligatorio: true,
    opciones,
  };
}

function leerOpciones(texto: string): OpcionAclaracion[] {
  const valores = texto.split(/\s*,\s*(?:o\s+)?|\s+o\s+/);
  if (valores.length < 2 || new Set(valores).size !== valores.length) return [];
  const opciones = valores.map((valor) =>
    TIPOS_COMPENSACION.find((opcion) => opcion.valor.toLowerCase() === valor),
  );
  return opciones.every((opcion) => opcion !== undefined) ? opciones : [];
}

function leerOpcionesCitadas(oracion: string): CampoAclaracion | null {
  const separador = oracion.indexOf(':');
  if (separador < 0) return null;
  const pedido = PEDIDO_OPCIONES.exec(normalizar(oracion.slice(0, separador)).replace(/^¿/, ''));
  if (!pedido) return null;
  const campo = CATALOGO.find(({ patron }) => patron.test(pedido[1] ?? pedido[2]))?.campo;
  const lista = oracion
    .slice(separador + 1)
    .trim()
    .replace(/[.?!]+$/, '')
    .trimEnd();
  const citado = '(?:«[^«»\\r\\n<>]{1,120}»|"[^"\\r\\n<>]{1,120}")';
  if (
    !campo ||
    !new RegExp(`^${citado}(?:\\s*(?:,\\s*(?:o\\s+)?|\\s+o\\s+)${citado}){1,5}$`, 'iu').test(lista)
  ) {
    return null;
  }
  const valores = Array.from(lista.matchAll(/«([^»]+)»|"([^"]+)"/g), (opcion) =>
    (opcion[1] ?? opcion[2]).trim(),
  );
  if (valores.some((valor) => !valor) || new Set(valores.map(normalizar)).size !== valores.length) {
    return null;
  }
  return {
    ...campo,
    tipo: 'select',
    obligatorio: true,
    opciones: valores.map((valor) => ({ valor, etiqueta: valor })),
  };
}

function leerCampos(pedido: string, herramienta?: string): CampoAclaracion[] {
  const lista = pedido
    .replace(/^(?:los siguientes datos|estos datos)\s*:\s*/, '')
    .replace(
      / (?:del viaje|de la salida|para (?:crear|programar|reprogramar) (?:la ruta|el viaje))$/,
      '',
    );
  const partes = lista.split(/(?:\s*,\s*(?:y\s+)?|\s+y\s+)(?![^()]*\))/);
  const campos: CampoAclaracion[] = [];
  for (const parte of partes) {
    const opcional = /\s+(?:\(opcional\)|opcional|si (?:quieres|lo deseas))$/.exec(parte);
    const expresion = (opcional ? parte.slice(0, opcional.index) : parte).replace(
      /^(?:el|la|los|las|un|una) /,
      '',
    );
    const conOpciones = /^(tipo de compensacion) \(([^()]+)\)$/.exec(expresion);
    const concepto = conOpciones?.[1] ?? expresion;
    const campo = CATALOGO.find((entrada) => entrada.patron.test(concepto))?.campo;
    if (!campo) return [];
    const opciones = conOpciones ? leerOpciones(conOpciones[2]) : [];
    if (conOpciones && !opciones.length) return [];
    const nuevaHora =
      campo.id === 'hora' &&
      (herramienta === 'reprogramarViaje' || campos.some(({ id }) => id === 'nuevaFecha'));
    const control = nuevaHora ? { ...campo, id: 'nuevaHora', etiqueta: 'Nueva hora' } : campo;
    if (campos.some(({ id }) => id === control.id)) return [];
    campos.push({ ...(conOpciones ? compensacion(opciones) : control), obligatorio: !opcional });
  }
  return campos;
}

@Injectable({ providedIn: 'root' })
export class AclaracionFormularioService {
  crear(respuesta: ChatRespuesta, solicitud: string): EspecificacionAclaracion | null {
    const operacion = respuesta.operacion;
    if (
      !respuesta.conversationId ||
      !solicitud.trim() ||
      respuesta.advertencia ||
      respuesta.resolucionConfirmacion ||
      operacion?.confirmacion ||
      (operacion && !['DATOS_FALTANTES', 'AMBIGUO'].includes(operacion.estado))
    )
      return null;

    const resultados = respuesta.resultados ?? [];
    // Este resultado de US29 identifica el dato exacto y el backend mantiene el viaje en un borrador.
    if (
      !operacion &&
      resultados.length === 1 &&
      resultados[0].tipo === 'sugerirContribucionViaje' &&
      datosDe(resultados[0])?.['estado'] === 'FALTAN_PASAJEROS'
    ) {
      const campo = CATALOGO.find(({ campo }) => campo.id === 'pasajeros')!.campo;
      return {
        campos: [{ ...campo, obligatorio: true }],
        contexto: solicitud,
        respuestaBreve: 'valor',
      };
    }

    const resultado = resultados
      .filter((item) => {
        const datos = datosDe(item);
        return (
          !!operacion &&
          datos?.['estado'] === operacion.estado &&
          datos['detalle'] === operacion.detalle
        );
      })
      .at(-1);
    if (
      !operacion &&
      (resultados.length ||
        respuesta.viajes?.length ||
        respuesta.rutas?.length ||
        respuesta.metodosCompensacion?.length)
    )
      return null;

    // Un adaptador para un esquema explícito podría resolver los campos antes de interpretar estos textos.
    const fuentes = [operacion?.detalle, respuesta.message];
    for (const fuente of fuentes) {
      if (!fuente) continue;
      const especificacion = this.interpretar(
        fuente,
        solicitud,
        resultado?.tipo,
        operacion?.estado,
      );
      if (especificacion) return especificacion;
    }
    return null;
  }

  construirMensaje(especificacion: EspecificacionAclaracion, valores: ValoresAclaracion): string {
    const fragmentos = especificacion.campos.flatMap((campo) => {
      const valor = String(valores[campo.id] ?? '')
        .trim()
        .replace(/\s+/g, ' ');
      if (!valor) return [];
      if (especificacion.respuestaBreve === 'valor') return [valor];
      if (especificacion.respuestaBreve === 'campo') return [`${campo.etiqueta}: ${valor}`];
      const frase =
        CATALOGO.find(({ campo: entrada }) => entrada.id === campo.id)?.frase ?? campo.etiqueta;
      const unidad = campo.id === 'capacidad' ? (valor === '1' ? ' pasajero' : ' pasajeros') : '';
      return [`${frase} ${valor}${unidad}`];
    });
    if (!fragmentos.length) return '';
    if (especificacion.respuestaBreve) return fragmentos.join(', ');
    const ultima = fragmentos.pop();
    const datos = fragmentos.length ? `${fragmentos.join(', ')} y ${ultima}` : ultima;
    const contexto = especificacion.contexto.trim();
    const unirContexto =
      /^(?:quiero|necesito) [^.!?¿¡:;\n]+$/iu.test(contexto) && !/\bcon\b/iu.test(contexto);
    const completo = unirContexto
      ? `${contexto} con ${datos}`
      : `Para continuar con la solicitud «${contexto}», indico ${datos}.`;
    return completo.length <= LIMITE_MENSAJE_AGENTE
      ? completo
      : `Para continuar con mi solicitud anterior, indico ${datos}.`;
  }

  private interpretar(
    fuente: string,
    contexto: string,
    herramienta?: string,
    estado?: string,
  ): EspecificacionAclaracion | null {
    const campos: CampoAclaracion[] = [];
    for (const original of fuente.trim().split(/(?<=[.?!])\s+/)) {
      const oracion = normalizar(original);
      const frase = oracion.replace(/^[¿¡]+|[.?!]+$/g, '');
      const lista = LISTA_COMPENSACION.exec(frase);
      const opciones = lista ? leerOpciones(lista[1]) : [];
      if (opciones.length) {
        return {
          campos: [compensacion(opciones)],
          opcionesRapidas: true,
          contexto,
          respuestaBreve: frase.startsWith('que tipo quieres para el nuevo metodo:')
            ? 'valor'
            : undefined,
        };
      }
      const campoConOpciones = leerOpcionesCitadas(original);
      if (campoConOpciones) return { campos: [campoConOpciones], opcionesRapidas: true, contexto };
      if (estado === 'AMBIGUO') continue;

      if (
        !estado &&
        /^que descripcion quieres asignar a tu nuevo metodo (dinero|gasolina|favor)$/.test(frase)
      ) {
        const campo = CATALOGO.find(({ campo }) => campo.id === 'descripcion')!.campo;
        return { campos: [{ ...campo, obligatorio: true }], contexto, respuestaBreve: 'campo' };
      }
      const opcional = /^si (?:quieres|lo deseas),\s*/.exec(frase);
      const peticion = opcional ? frase.slice(opcional[0].length) : frase;
      const pedido = PEDIDO.exec(peticion);
      if (!pedido) continue;
      // En respuestas sin operación, se exige una pregunta o un imperativo directo de aclaración.
      if (
        !estado &&
        !oracion.endsWith('?') &&
        !/^(?:indica|completa|dime|especifica)\b/.test(peticion)
      )
        continue;
      const nuevos = leerCampos(pedido[1], herramienta);
      if (!nuevos.length || nuevos.some(({ id }) => campos.some((campo) => campo.id === id))) {
        return null;
      }
      campos.push(...nuevos.map((campo) => (opcional ? { ...campo, obligatorio: false } : campo)));
    }
    return campos.length ? { campos, contexto } : null;
  }
}
