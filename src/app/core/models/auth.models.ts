export type RoleType = 'CONDUCTOR' | 'PASAJERO';

export interface UsuarioRespuesta {
  id?: number;
  correo: string;
  nombre: string;
  apellidos?: string;
  telefono?: string;
  rol: RoleType;
  cuentaVerificada?: boolean;
}

export interface UserSession extends UsuarioRespuesta {
  iniciales: string;
}

export interface LoginRequest {
  correo: string;
  contrasena: string;
  recordarDispositivo?: boolean;
}

export interface RegistroRequest {
  correo: string;
  contrasena: string;
  nombre: string;
  apellidos: string;
  telefono: string;
  rol: RoleType;
  aceptaTerminos: boolean;
}

/** Alias para compatibilidad hacia atrás */
export type RegisterRequest = RegistroRequest;

export interface VerificarCodigoRequest {
  correo: string;
  codigo: string;
}

export interface ReenviarCodigoRequest {
  correo: string;
}

export interface AuthRespuesta {
  token?: string | null;
  mensaje: string;
  usuario?: UsuarioRespuesta | null;
}

/** Alias para compatibilidad hacia atrás */
export type AuthResponse = AuthRespuesta;

export interface ErrorRespuesta {
  mensaje: string;
  campos?: Record<string, string>;
}
