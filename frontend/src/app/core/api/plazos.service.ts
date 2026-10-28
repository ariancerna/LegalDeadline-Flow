import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Pagina, Plazo, PlazoEstado, RiesgoPlazo } from '../models';
import { aParams } from './params';

export interface FiltrosPlazo {
  page?: number;
  size?: number;
  expedienteId?: number | null;
  estado?: PlazoEstado | '';
  desde?: string;
  hasta?: string;
}

export interface PlazoDatos {
  tipo: string;
  fechaLimite: string;
}

/** RF12–RF15: /api/v1/plazos */
@Injectable({ providedIn: 'root' })
export class PlazosService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/plazos`;

  listar(filtros: FiltrosPlazo = {}): Observable<Pagina<Plazo>> {
    return this.http.get<Pagina<Plazo>>(this.url, { params: aParams({ ...filtros }) });
  }

  crear(expedienteId: number, datos: PlazoDatos): Observable<Plazo> {
    return this.http.post<Plazo>(this.url, { expedienteId, ...datos });
  }

  actualizar(id: number, datos: PlazoDatos, version: number): Observable<Plazo> {
    return this.http.put<Plazo>(`${this.url}/${id}`, { ...datos, version });
  }

  anular(id: number, motivo: string, version: number): Observable<Plazo> {
    return this.http.patch<Plazo>(`${this.url}/${id}/anulacion`, { motivo, version });
  }

  riesgo(id: number): Observable<RiesgoPlazo> {
    return this.http.get<RiesgoPlazo>(`${this.url}/${id}/riesgo`);
  }
}
