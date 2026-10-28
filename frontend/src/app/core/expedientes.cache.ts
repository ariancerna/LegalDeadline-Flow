import { Injectable, inject, signal } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import { ExpedientesService } from './api/expedientes.service';

/** Guarda el código de los expedientes ya consultados para mostrarlo en tablas de tareas y plazos. */
@Injectable({ providedIn: 'root' })
export class ExpedientesCache {
  private readonly servicio = inject(ExpedientesService);
  private readonly codigos = signal<ReadonlyMap<number, string>>(new Map());

  codigo(id: number): string {
    return this.codigos().get(id) ?? `#${id}`;
  }

  registrar(id: number, codigo: string): void {
    this.codigos.update((m) => new Map(m).set(id, codigo));
  }

  /** Consulta los expedientes que aún no están en caché. */
  cargar(ids: number[]): void {
    const faltantes = [...new Set(ids)].filter((id) => !this.codigos().has(id));
    if (faltantes.length === 0) return;
    forkJoin(
      faltantes.map((id) => this.servicio.obtener(id).pipe(catchError(() => of(null)))),
    ).subscribe((lista) => {
      this.codigos.update((m) => {
        const copia = new Map(m);
        for (const e of lista) if (e) copia.set(e.id, e.codigo);
        return copia;
      });
    });
  }
}
