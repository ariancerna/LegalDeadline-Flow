import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Expediente, ExpedienteEstado, Pagina, Tarea } from '../models';
import { aParams } from './params';

export interface FiltrosExpediente {
  page?: number;
  size?: number;
  estado?: ExpedienteEstado | '';
  responsableId?: number | null;
  q?: string;
}

export interface ExpedienteDatos {
  codigo: string;
  asunto: string;
  responsableId: number;
}

/** RF03–RF06: /api/v1/expedientes */
@Injectable({ providedIn: 'root' })
export class ExpedientesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/expedientes`;

  listar(filtros: FiltrosExpediente = {}): Observable<Pagina<Expediente>> {
    return this.http.get<Pagina<Expediente>>(this.url, { params: aParams({ ...filtros }) });
  }

  obtener(id: number): Observable<Expediente> {
    return this.http.get<Expediente>(`${this.url}/${id}`);
  }

  crear(datos: ExpedienteDatos): Observable<Expediente> {
    return this.http.post<Expediente>(this.url, datos);
  }

  actualizar(id: number, datos: ExpedienteDatos, version: number): Observable<Expediente> {
    return this.http.put<Expediente>(`${this.url}/${id}`, { ...datos, version });
  }

  cerrar(id: number, version: number): Observable<Expediente> {
    return this.http.patch<Expediente>(`${this.url}/${id}/cierre`, { version });
  }

  archivar(id: number, version: number): Observable<Expediente> {
    return this.http.delete<Expediente>(`${this.url}/${id}`, { body: { version } });
  }

  tareas(id: number): Observable<Tarea[]> {
    return this.http.get<Tarea[]>(`${this.url}/${id}/tareas`);
  }
}
