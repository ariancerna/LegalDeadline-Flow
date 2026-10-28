import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Pagina, Prioridad, Tarea, TareaEstado } from '../models';
import { aParams } from './params';

export interface FiltrosTarea {
  page?: number;
  size?: number;
  expedienteId?: number | null;
  responsableId?: number | null;
  estado?: TareaEstado | '';
  prioridad?: Prioridad | '';
  desde?: string;
  hasta?: string;
}

export interface TareaDatos {
  titulo: string;
  tipo: string;
  responsableId: number;
  prioridad: Prioridad;
  fechaLimite: string;
}

/** RF07–RF11: /api/v1/tareas */
@Injectable({ providedIn: 'root' })
export class TareasService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/tareas`;

  listar(filtros: FiltrosTarea = {}): Observable<Pagina<Tarea>> {
    return this.http.get<Pagina<Tarea>>(this.url, { params: aParams({ ...filtros }) });
  }

  obtener(id: number): Observable<Tarea> {
    return this.http.get<Tarea>(`${this.url}/${id}`);
  }

  crear(expedienteId: number, datos: TareaDatos): Observable<Tarea> {
    return this.http.post<Tarea>(this.url, { expedienteId, ...datos });
  }

  actualizar(id: number, datos: TareaDatos, version: number): Observable<Tarea> {
    return this.http.put<Tarea>(`${this.url}/${id}`, { ...datos, version });
  }

  cambiarEstado(
    id: number,
    nuevoEstado: TareaEstado,
    version: number,
    confirmacionSupervisor = false,
  ): Observable<Tarea> {
    return this.http.patch<Tarea>(`${this.url}/${id}/estado`, {
      nuevoEstado,
      confirmacionSupervisor,
      version,
    });
  }

  cancelar(id: number, version: number): Observable<Tarea> {
    return this.http.delete<Tarea>(`${this.url}/${id}`, { body: { version } });
  }
}
