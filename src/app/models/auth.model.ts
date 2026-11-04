export type Rol = 'CONDUCTOR' | 'PASAJERO';

export interface Usuario {
  id: number;
  correo: string;
  nombre: string;
  apellidos: string;
  telefono: string;
  rol: Rol;
  cuentaVerificada: boolean;
}

export interface LoginRespuesta {
  token: string;
  mensaje: string;
  usuario: Usuario;
}
