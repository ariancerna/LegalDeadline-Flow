import { Prioridad, TareaEstado } from '../../core/models';

/** Transiciones permitidas por TareaService.validarTransicion (RF10). */
export const TRANSICIONES: Record<TareaEstado, TareaEstado[]> = {
  PENDIENTE: ['EN_PROGRESO', 'CERRADA', 'CANCELADA'],
  EN_PROGRESO: ['PENDIENTE', 'CERRADA', 'CANCELADA'],
  CERRADA: [],
  CANCELADA: [],
};

export function esActiva(estado: TareaEstado): boolean {
  return estado === 'PENDIENTE' || estado === 'EN_PROGRESO';
}

/** RN03: cerrar una tarea ALTA exige confirmación de un supervisor o administrador. */
export function requiereConfirmacion(prioridad: Prioridad, nuevoEstado: TareaEstado): boolean {
  return prioridad === 'ALTA' && nuevoEstado === 'CERRADA';
}
