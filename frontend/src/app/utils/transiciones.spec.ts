import { TRANSICIONES, esActiva, requiereConfirmacion } from './transiciones';

describe('transiciones de tareas (RF10)', () => {
  it('las tareas finalizadas no cambian de estado', () => {
    expect(TRANSICIONES.CERRADA).toEqual([]);
    expect(TRANSICIONES.CANCELADA).toEqual([]);
  });

  it('una tarea en progreso puede volver a pendiente', () => {
    expect(TRANSICIONES.EN_PROGRESO).toContain('PENDIENTE');
  });

  it('solo pendiente y en progreso son activas (RN06)', () => {
    expect(esActiva('PENDIENTE')).toBe(true);
    expect(esActiva('EN_PROGRESO')).toBe(true);
    expect(esActiva('CERRADA')).toBe(false);
  });

  it('cerrar una tarea ALTA exige confirmación (RN03)', () => {
    expect(requiereConfirmacion('ALTA', 'CERRADA')).toBe(true);
    expect(requiereConfirmacion('ALTA', 'CANCELADA')).toBe(false);
    expect(requiereConfirmacion('MEDIA', 'CERRADA')).toBe(false);
  });
});
