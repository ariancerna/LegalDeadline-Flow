import { Injectable, computed, inject, signal } from '@angular/core';
import { PlazosService } from './api/plazos.service';
import { Plazo, RiesgoPlazo, riesgoDe } from './models';
import { hoyLima, sumarDias } from '../shared/fechas';

export interface Alerta {
  plazo: Plazo;
  riesgo: RiesgoPlazo;
}

/** Días que cubre el registro de vencimientos del tablero. */
export const HORIZONTE_DIAS = 14;
/** Días para considerar una alerta de proximidad (alcance mínimo del caso). */
const DIAS_ALERTA = 10;

/**
 * Plazos activos vencidos o que vencen en los próximos 14 días, con el riesgo calculado por el
 * backend (RN04). Alimenta la campana, el tablero y su línea de tiempo.
 * Alerta = riesgo CRÍTICO o ALTO dentro de los próximos 10 días (o vencido).
 */
@Injectable({ providedIn: 'root' })
export class AlertasStore {
  private readonly plazosApi = inject(PlazosService);

  /** Todos los plazos del horizonte con su riesgo, ordenados por fecha. */
  readonly proximos = signal<Alerta[] | null>(null);

  readonly lista = computed<Alerta[] | null>(() => {
    const todos = this.proximos();
    if (todos === null) return null;
    const limite = sumarDias(hoyLima(), DIAS_ALERTA);
    return todos
      .filter(
        (a) =>
          (a.riesgo.nivel === 'CRITICO' || a.riesgo.nivel === 'ALTO') &&
          a.plazo.fechaLimite <= limite,
      )
      .sort((a, b) => a.riesgo.diasRestantes - b.riesgo.diasRestantes);
  });
  readonly criticas = computed(
    () => (this.lista() ?? []).filter((a) => a.riesgo.nivel === 'CRITICO').length,
  );
  readonly total = computed(() => this.lista()?.length ?? 0);

  recargar(): void {
    this.plazosApi
      .listarTodo({ estado: 'ACTIVO', hasta: sumarDias(hoyLima(), HORIZONTE_DIAS) }, 3)
      .subscribe({
        next: (plazos) => {
          // Cada plazo ya trae su riesgo: una sola consulta aunque la cartera tenga miles de expedientes.
          this.proximos.set(
            plazos
              .map((plazo) => ({ plazo, riesgo: riesgoDe(plazo) }))
              .sort((a, b) => a.plazo.fechaLimite.localeCompare(b.plazo.fechaLimite)),
          );
        },
        error: () => this.proximos.set([]),
      });
  }

  limpiar(): void {
    this.proximos.set(null);
  }
}
