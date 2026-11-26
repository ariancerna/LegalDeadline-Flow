import { Rol } from './catalogos.model';

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

export interface CargaResponsable {
  responsableId: number;
  nombre: string;
  rol: Rol;
  tareasActivas: number;
  umbral: number;
  sobrecargado: boolean;
}
