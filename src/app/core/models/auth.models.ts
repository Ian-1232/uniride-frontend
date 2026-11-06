export type RoleType = 'CONDUCTOR' | 'PASAJERO';

export interface UserSession {
  id?: number;
  nombre: string;
  apellidos?: string;
  iniciales: string;
  correo: string;
  rol: RoleType;
  telefono?: string;
  token?: string;
}

export interface LoginRequest {
  correo: string;
  contrasena: string;
  recordarDispositivo?: boolean;
}

export interface RegisterRequest {
  nombre: string;
  apellidos: string;
  telefono: string;
  correo: string;
  contrasena: string;
  rol: RoleType;
}

export interface AuthResponse {
  token: string;
  tipo: string;
  usuario: UserSession;
}
