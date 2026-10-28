import { CargaResponsable, Prioridad, Tarea } from '../../core/models';

export interface Sugerencia {
  tarea: Tarea;
  desde: CargaResponsable;
  hacia: CargaResponsable;
  /** Carga que tendría el receptor después del movimiento. */
  cargaReceptor: number;
  /** Carga que tendría el origen después del movimiento. */
  cargaOrigen: number;
}

const PESO_PRIORIDAD: Record<Prioridad, number> = { BAJA: 0, MEDIA: 1, ALTA: 2 };

/**
 * Recomendación de reasignación con reglas explícitas (reto "balanceador visual"):
 *  1. Origen: responsables con más tareas activas que el umbral (RN06), de mayor a menor carga.
 *  2. Se propone mover solo el exceso (carga − umbral) de cada origen.
 *  3. Se mueven primero las tareas menos urgentes: menor prioridad y, a igual prioridad,
 *     la fecha límite más lejana. Así no se traslada trabajo crítico a última hora.
 *  4. Receptor: el responsable con menor carga que siga en o bajo el umbral después del movimiento.
 *     Si nadie tiene capacidad, no se sugiere nada para esa tarea.
 * La recomendación no se aplica sola: el supervisor decide (RF16).
 */
export function recomendarReasignaciones(
  cargas: CargaResponsable[],
  tareasActivas: ReadonlyMap<number, Tarea[]>,
): Sugerencia[] {
  const simulada = new Map(cargas.map((c) => [c.responsableId, c.tareasActivas]));
  const origenes = cargas
    .filter((c) => c.tareasActivas > c.umbral)
    .sort((a, b) => b.tareasActivas - a.tareasActivas);
  const sugerencias: Sugerencia[] = [];

  for (const origen of origenes) {
    const candidatas = [...(tareasActivas.get(origen.responsableId) ?? [])].sort(
      (a, b) =>
        PESO_PRIORIDAD[a.prioridad] - PESO_PRIORIDAD[b.prioridad] ||
        b.fechaLimite.localeCompare(a.fechaLimite) ||
        a.id - b.id,
    );
    for (const tarea of candidatas) {
      const cargaOrigen = simulada.get(origen.responsableId)!;
      if (cargaOrigen <= origen.umbral) break;
      const receptor = cargas
        .filter((c) => c.responsableId !== origen.responsableId)
        .filter((c) => simulada.get(c.responsableId)! + 1 <= c.umbral)
        .sort(
          (a, b) =>
            simulada.get(a.responsableId)! - simulada.get(b.responsableId)! ||
            a.responsableId - b.responsableId,
        )[0];
      if (!receptor) break;
      const cargaReceptor = simulada.get(receptor.responsableId)! + 1;
      simulada.set(receptor.responsableId, cargaReceptor);
      simulada.set(origen.responsableId, cargaOrigen - 1);
      sugerencias.push({
        tarea,
        desde: origen,
        hacia: receptor,
        cargaReceptor,
        cargaOrigen: cargaOrigen - 1,
      });
    }
  }
  return sugerencias;
}
