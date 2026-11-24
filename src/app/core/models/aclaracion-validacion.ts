import { AclaracionAgenteV1, CampoAclaracion, OpcionAclaracion } from './aclaracion.models';
import { fechaLocalValida } from './perfil.models';

const TIPOS = new Set(['text', 'textarea', 'number', 'date', 'time', 'select']);
const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const TEXTO_PROHIBIDO =
  /[<>\p{Cc}]|\b(?:https?|ftp|file|javascript|data|vbscript):|www\.|\/api\/|bearer\s|eyJ[\w.-]{12,}|(?:gsk_|sk-)[\w-]{12,}|\b(?:jwt|contrase[nñ]a|password|api[_ -]?key|clave de api)\b/iu;

export function esUuidAgente(valor: unknown): valor is string {
  return typeof valor === 'string' && UUID.test(valor);
}

function objeto(valor: unknown, claves: readonly string[]): valor is Record<string, unknown> {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return false;
  const prototipo: unknown = Object.getPrototypeOf(valor);
  return (
    (prototipo === Object.prototype || prototipo === null) &&
    Object.keys(valor).every((clave) => claves.includes(clave))
  );
}

function texto(valor: unknown, maximo: number): valor is string {
  return (
    typeof valor === 'string' &&
    !!valor.trim() &&
    valor.length <= maximo &&
    !TEXTO_PROHIBIDO.test(valor)
  );
}

function identificador(valor: unknown): valor is string {
  return (
    typeof valor === 'string' &&
    /^[a-z][a-z0-9_]{0,63}$/i.test(valor) &&
    !Object.hasOwn(Object.prototype, valor) &&
    valor.toLowerCase() !== 'prototype'
  );
}

function entero(valor: unknown): valor is number {
  return (
    typeof valor === 'number' &&
    Number.isInteger(valor) &&
    valor >= -2147483648 &&
    valor <= 2147483647
  );
}

function opcion(valor: unknown): valor is OpcionAclaracion {
  return (
    objeto(valor, ['valor', 'etiqueta']) &&
    texto(valor['valor'], 255) &&
    valor['valor'] === valor['valor'].trim() &&
    texto(valor['etiqueta'], 255)
  );
}

export function tieneValor(valor: unknown): boolean {
  return valor != null && (typeof valor !== 'string' || !!valor.trim());
}

export function errorCampoAclaracion(campo: CampoAclaracion, valor: unknown): string | null {
  if (!tieneValor(valor)) return campo.obligatorio ? 'Completa este campo.' : null;
  if (campo.tipo === 'number') {
    if (!entero(valor)) return 'Ingresa un número entero válido.';
    if (campo.minimo != null && valor < campo.minimo)
      return `Ingresa un número desde ${campo.minimo}.`;
    if (campo.maximo != null && valor > campo.maximo)
      return `Ingresa un número hasta ${campo.maximo}.`;
    return null;
  }
  if (typeof valor !== 'string') return 'Ingresa un valor válido.';
  const limpio = valor.trim();
  switch (campo.tipo) {
    case 'date':
      return fechaLocalValida(limpio) ? null : 'Ingresa una fecha válida.';
    case 'time':
      return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(limpio) ? null : 'Ingresa una hora válida.';
    case 'select':
      return campo.opciones?.some((opcion) => opcion.valor === valor)
        ? null
        : 'Selecciona una opción de la lista.';
    default:
      return campo.longitudMaxima != null && limpio.length > campo.longitudMaxima
        ? `Usa hasta ${campo.longitudMaxima} caracteres.`
        : null;
  }
}

function campoValido(valor: unknown): valor is CampoAclaracion {
  if (
    !objeto(valor, [
      'id',
      'etiqueta',
      'tipo',
      'obligatorio',
      'inicial',
      'opciones',
      'minimo',
      'maximo',
      'longitudMaxima',
      'ayuda',
    ])
  )
    return false;
  const {
    id,
    etiqueta,
    tipo,
    obligatorio,
    inicial,
    opciones,
    minimo,
    maximo,
    longitudMaxima,
    ayuda,
  } = valor;
  if (
    !identificador(id) ||
    !texto(etiqueta, 120) ||
    typeof tipo !== 'string' ||
    !TIPOS.has(tipo) ||
    typeof obligatorio !== 'boolean' ||
    (ayuda !== undefined && !texto(ayuda, 240))
  )
    return false;
  if (tipo === 'select') {
    if (
      !Array.isArray(opciones) ||
      opciones.length < 1 ||
      opciones.length > 10 ||
      !opciones.every(opcion) ||
      new Set(opciones.map((item) => item.valor)).size !== opciones.length
    )
      return false;
  } else if (opciones !== undefined) return false;
  if (minimo !== undefined && (tipo !== 'number' || !entero(minimo))) return false;
  if (maximo !== undefined && (tipo !== 'number' || !entero(maximo))) return false;
  if (entero(minimo) && entero(maximo) && minimo > maximo) return false;
  if (
    longitudMaxima !== undefined &&
    ((tipo !== 'text' && tipo !== 'textarea') ||
      !entero(longitudMaxima) ||
      longitudMaxima < 1 ||
      longitudMaxima > 1000)
  )
    return false;
  return (
    inicial === undefined ||
    ((tipo === 'number' ? entero(inicial) : texto(inicial, 255)) &&
      errorCampoAclaracion(valor as unknown as CampoAclaracion, inicial) === null)
  );
}

export function leerAclaracionV1(valor: unknown): AclaracionAgenteV1 | null {
  if (
    !objeto(valor, [
      'version',
      'id',
      'operacion',
      'contexto',
      'campos',
      'alMenosUno',
      'opcionesRapidas',
      'respuestaBreve',
    ])
  )
    return null;
  const { version, id, operacion, contexto, campos, alMenosUno, opcionesRapidas, respuestaBreve } =
    valor;
  if (
    version !== 1 ||
    !esUuidAgente(id) ||
    !identificador(operacion) ||
    !texto(contexto, 120) ||
    !Array.isArray(campos) ||
    campos.length < 1 ||
    campos.length > 8 ||
    !campos.every(campoValido) ||
    new Set(campos.map((campo) => campo.id)).size !== campos.length
  )
    return null;
  if (
    alMenosUno !== undefined &&
    (!Array.isArray(alMenosUno) ||
      alMenosUno.length < 2 ||
      new Set(alMenosUno).size !== alMenosUno.length ||
      !alMenosUno.every(
        (id) =>
          typeof id === 'string' && campos.some((campo) => campo.id === id && !campo.obligatorio),
      ))
  )
    return null;
  if (opcionesRapidas !== undefined && typeof opcionesRapidas !== 'boolean') return null;
  if (opcionesRapidas && (campos.length !== 1 || campos[0].tipo !== 'select')) return null;
  if (
    respuestaBreve !== undefined &&
    respuestaBreve !== 'campo' &&
    !(respuestaBreve === 'valor' && campos.length === 1)
  )
    return null;
  return { version, id, operacion, contexto, campos, alMenosUno, opcionesRapidas, respuestaBreve };
}
