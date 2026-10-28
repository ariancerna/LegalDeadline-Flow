import { CargaResponsable, Prioridad, Tarea } from '../../core/models';
import { recomendarReasignaciones } from './recomendacion';

function carga(id: number, tareasActivas: number, umbral = 5): CargaResponsable {
  return {
    responsableId: id,
    nombre: `R${id}`,
    rol: 'RESPONSABLE',
    tareasActivas,
    umbral,
    sobrecargado: tareasActivas > umbral,
  };
}

function tarea(id: number, prioridad: Prioridad, fechaLimite: string, responsableId = 1): Tarea {
  return {
    id,
    expedienteId: 1,
    titulo: `T${id}`,
    tipo: 'ESCRITO',
    responsableId,
    prioridad,
    fechaLimite,
    estado: 'PENDIENTE',
    creadoEn: '',
    actualizadoEn: '',
    version: 0,
  };
}

describe('recomendarReasignaciones', () => {
  it('no sugiere nada si nadie supera el umbral (igualarlo no es sobrecarga)', () => {
    expect(recomendarReasignaciones([carga(1, 5), carga(2, 0)], new Map())).toEqual([]);
  });

  it('mueve solo el exceso y empieza por la tarea menos urgente', () => {
    const tareas = [
      tarea(1, 'ALTA', '2026-11-01'),
      tarea(2, 'BAJA', '2026-11-05'),
      tarea(3, 'BAJA', '2026-12-20'),
      tarea(4, 'MEDIA', '2026-11-02'),
      tarea(5, 'MEDIA', '2026-11-03'),
      tarea(6, 'ALTA', '2026-11-04'),
      tarea(7, 'MEDIA', '2026-11-10'),
    ];
    const s = recomendarReasignaciones(
      [carga(1, 7), carga(2, 1), carga(3, 3)],
      new Map([[1, tareas]]),
    );
    expect(s.map((x) => x.tarea.id)).toEqual([3, 2]); // BAJA más lejana, luego la otra BAJA
    expect(s.every((x) => x.desde.responsableId === 1)).toBe(true);
    expect(s[0].hacia.responsableId).toBe(2); // el menos cargado
    expect(s[1].hacia.responsableId).toBe(2); // sigue siendo el menos cargado (2 < 3)
    expect(s[1].cargaOrigen).toBe(5);
  });

  it('nunca deja al receptor sobre el umbral', () => {
    const tareas = [
      tarea(1, 'BAJA', '2026-11-01'),
      tarea(2, 'BAJA', '2026-11-02'),
      tarea(3, 'BAJA', '2026-11-03'),
    ];
    const s = recomendarReasignaciones([carga(1, 8), carga(2, 4)], new Map([[1, tareas]]));
    expect(s).toHaveLength(1);
    expect(s[0].cargaReceptor).toBe(5);
  });

  it('no sugiere si nadie tiene capacidad', () => {
    const s = recomendarReasignaciones(
      [carga(1, 7), carga(2, 5)],
      new Map([[1, [tarea(1, 'BAJA', '2026-11-01')]]]),
    );
    expect(s).toEqual([]);
  });
});
