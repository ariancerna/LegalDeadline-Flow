import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { PlazosService } from './api/plazos.service';
import { ExpedientesCache } from './expedientes.cache';
import { Plazo, RiesgoPlazo } from './models';
import { hoyLima, sumarDias } from '../shared/fechas';

export interface Alerta {
  plazo: Plazo;
  riesgo: RiesgoPlazo;
}

/**
 * Alertas de proximidad de plazos (alcance mínimo del caso):
 * plazos activos vencidos o que vencen en los próximos 10 días con riesgo CRÍTICO o ALTO.
 * El riesgo lo calcula el backend (RN04). La comparten la campana y el tablero.
 */
@Injectable({ providedIn: 'root' })
export class AlertasStore {
  private readonly plazos = inject(PlazosService);
  private readonly expedientes = inject(ExpedientesCache);

  readonly lista = signal<Alerta[] | null>(null);
  readonly criticas = computed(
    () => (this.lista() ?? []).filter((a) => a.riesgo.nivel === 'CRITICO').length,
  );
  readonly total = computed(() => this.lista()?.length ?? 0);

  recargar(): void {
    this.plazos
      .listar({ estado: 'ACTIVO', hasta: sumarDias(hoyLima(), 10), size: 50 })
      .pipe(
        switchMap((pagina) =>
          pagina.content.length === 0
            ? of([] as Alerta[])
            : forkJoin(
                pagina.content.map((plazo) =>
                  this.plazos.riesgo(plazo.id).pipe(
                    map((riesgo): Alerta | null => ({ plazo, riesgo })),
                    catchError(() => of(null)),
                  ),
                ),
              ).pipe(map((l) => l.filter((a): a is Alerta => a !== null))),
        ),
      )
      .subscribe({
        next: (todas) => {
          const urgentes = todas
            .filter((a) => a.riesgo.nivel === 'CRITICO' || a.riesgo.nivel === 'ALTO')
            .sort((a, b) => a.riesgo.diasRestantes - b.riesgo.diasRestantes);
          this.expedientes.cargar(urgentes.map((a) => a.plazo.expedienteId));
          this.lista.set(urgentes);
        },
        error: () => this.lista.set([]),
      });
  }

  limpiar(): void {
    this.lista.set(null);
  }
}
