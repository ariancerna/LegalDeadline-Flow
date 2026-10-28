import { Injectable, inject, signal } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import { descomponerAsunto } from '../shared/asunto';
import { ExpedientesService } from './api/expedientes.service';

interface Resumen {
  codigo: string;
  asunto: string;
}

/** Guarda el código y el asunto de los expedientes ya consultados para mostrarlos en otras tablas. */
@Injectable({ providedIn: 'root' })
export class ExpedientesCache {
  private readonly servicio = inject(ExpedientesService);
  private readonly datos = signal<ReadonlyMap<number, Resumen>>(new Map());

  codigo(id: number): string {
    return this.datos().get(id)?.codigo ?? `#${id}`;
  }

  /** Partes del caso (o el asunto completo si no sigue la convención). */
  titulo(id: number): string {
    const r = this.datos().get(id);
    return r ? descomponerAsunto(r.asunto).titulo : '';
  }

  registrar(id: number, codigo: string, asunto = ''): void {
    this.datos.update((m) => new Map(m).set(id, { codigo, asunto }));
  }

  /** Registra el expediente que acompaña a cada tarea o plazo de un listado. */
  registrarVarios(
    filas: readonly { expedienteId: number; expedienteCodigo?: string; expedienteAsunto?: string }[],
  ): void {
    const nuevas = filas.filter((f) => f.expedienteCodigo && !this.datos().has(f.expedienteId));
    if (nuevas.length === 0) return;
    this.datos.update((m) => {
      const copia = new Map(m);
      for (const f of nuevas)
        copia.set(f.expedienteId, { codigo: f.expedienteCodigo!, asunto: f.expedienteAsunto ?? '' });
      return copia;
    });
  }

  /** Consulta los expedientes que aún no están en caché. */
  cargar(ids: number[]): void {
    const faltantes = [...new Set(ids)].filter((id) => !this.datos().has(id));
    if (faltantes.length === 0) return;
    forkJoin(
      faltantes.map((id) => this.servicio.obtener(id).pipe(catchError(() => of(null)))),
    ).subscribe((lista) => {
      this.datos.update((m) => {
        const copia = new Map(m);
        for (const e of lista) if (e) copia.set(e.id, { codigo: e.codigo, asunto: e.asunto });
        return copia;
      });
    });
  }
}
