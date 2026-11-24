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
  // Los borradores del backend pueden exigir una respuesta breve en la misma conversación.
  readonly respuestaBreve?: 'valor' | 'campo';
}
