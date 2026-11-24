export type TipoCampoAclaracion = 'text' | 'number' | 'date' | 'time' | 'select' | 'textarea';
export type ValorAclaracion = string | number | null;
export type ValoresAclaracion = Readonly<Record<string, ValorAclaracion>>;

export interface OpcionAclaracion {
  readonly valor: string;
  readonly etiqueta: string;
}

export interface CampoAclaracion {
  readonly id: string;
  readonly etiqueta: string;
  readonly tipo: TipoCampoAclaracion;
  readonly obligatorio: boolean;
  readonly inicial?: ValorAclaracion;
  readonly opciones?: readonly OpcionAclaracion[];
  readonly minimo?: number;
  readonly maximo?: number;
  readonly longitudMaxima?: number;
  readonly ayuda?: string;
}

export interface EspecificacionAclaracion {
  readonly campos: readonly CampoAclaracion[];
  readonly opcionesRapidas?: boolean;
  readonly contexto: string;
  readonly alMenosUno?: readonly string[];
  readonly respuestaBreve?: 'valor' | 'campo';
}

export interface AclaracionAgenteV1 extends EspecificacionAclaracion {
  readonly version: 1;
  readonly id: string;
  readonly operacion: string;
}

export interface EnvioAclaracion {
  readonly tecnico: string;
  readonly visible: string;
}

export function esEstructurada(
  especificacion: EspecificacionAclaracion,
): especificacion is AclaracionAgenteV1 {
  return 'version' in especificacion;
}
