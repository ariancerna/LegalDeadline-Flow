import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Pagina, Plazo, PlazoEstado, RiesgoPlazo } from '../models';
import { ExpedientesCache } from '../expedientes.cache';
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
  private readonly cache = inject(ExpedientesCache);
  private readonly url = `${environment.apiUrl}/plazos`;

  /** Cada plazo trae el código y el asunto de su expediente: se guardan para las demás tablas. */
  listar(filtros: FiltrosPlazo = {}): Observable<Pagina<Plazo>> {
    return this.http
      .get<Pagina<Plazo>>(this.url, { params: aParams({ ...filtros }) })
      .pipe(tap((p) => this.cache.registrarVarios(p.content)));
  }

  /**
   * Todas las páginas de un rango (por ejemplo, un mes del calendario), hasta `maxPaginas`.
   * Con 5000 expedientes un mes puede superar las 100 filas de una página.
   */
  listarTodo(filtros: FiltrosPlazo, maxPaginas = 5): Observable<Plazo[]> {
    return new Observable<Plazo[]>((sub) => {
      const acumulado: Plazo[] = [];
      let cancelado = false;
      const pedir = (page: number): void => {
        this.listar({ ...filtros, page, size: 100 }).subscribe({
          next: (p) => {
            if (cancelado) return;
            acumulado.push(...p.content);
            if (page + 1 >= Math.min(p.totalPages, maxPaginas)) {
              sub.next(acumulado);
              sub.complete();
            } else pedir(page + 1);
          },
          error: (e) => sub.error(e),
        });
      };
      pedir(0);
      return () => (cancelado = true);
    });
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
