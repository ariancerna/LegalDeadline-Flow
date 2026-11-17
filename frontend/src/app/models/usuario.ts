export type Rol = 'ADMINISTRADOR' | 'SUPERVISOR' | 'RESPONSABLE' | 'AUDITOR';

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  version: number;
}

export interface LoginRespuesta {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  usuario: Usuario;
}
