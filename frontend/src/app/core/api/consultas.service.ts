import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CargaResponsable, Evento, EventoTipo, Indicadores, Pagina } from '../models';
import { aParams } from './params';

export interface FiltrosEvento {
  page?: number;
  size?: number;
  tipo?: EventoTipo | '';
  usuarioId?: number | null;
  desde?: string; // ISO-8601 instant
  hasta?: string;
  /** Historial de un expediente: sus eventos y los de sus tareas y plazos. */
  expedienteId?: number;
}

/** Consultas de solo lectura: carga (RF16), indicadores (RF17) y auditoría (RF18). */
@Injectable({ providedIn: 'root' })
export class ConsultasService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  carga(): Observable<CargaResponsable[]> {
    return this.http.get<CargaResponsable[]>(`${this.api}/responsables/carga`);
  }

  indicadores(): Observable<Indicadores> {
    return this.http.get<Indicadores>(`${this.api}/indicadores`);
  }

  eventos(filtros: FiltrosEvento = {}): Observable<Pagina<Evento>> {
    return this.http.get<Pagina<Evento>>(`${this.api}/auditoria/eventos`, {
      params: aParams({ ...filtros, sort: 'fecha,desc' }),
    });
  }
}
