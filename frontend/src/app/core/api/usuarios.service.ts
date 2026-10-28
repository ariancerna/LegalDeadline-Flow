import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Rol, Usuario } from '../models';

export interface UsuarioNuevo {
  nombre: string;
  email: string;
  password: string;
  rol: Rol;
}

export interface UsuarioCambios {
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  password?: string | null;
}

/** RF02: /api/v1/usuarios (solo administrador). */
@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/usuarios`;

  listar(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.url);
  }

  crear(datos: UsuarioNuevo): Observable<Usuario> {
    return this.http.post<Usuario>(this.url, datos);
  }

  actualizar(id: number, datos: UsuarioCambios): Observable<Usuario> {
    const cuerpo = { ...datos, password: datos.password ? datos.password : null };
    return this.http.put<Usuario>(`${this.url}/${id}`, cuerpo);
  }

  desactivar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
