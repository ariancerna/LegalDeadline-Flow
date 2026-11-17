export type TareaEstado = 'PENDIENTE' | 'EN_PROGRESO' | 'CERRADA' | 'CANCELADA';

export type Prioridad = 'BAJA' | 'MEDIA' | 'ALTA';

export interface Tarea {
  id: number;
  expedienteId: number;
  expedienteCodigo: string;
  expedienteAsunto: string;
  titulo: string;
  tipo: string;
  responsableId: number;
  prioridad: Prioridad;
  fechaLimite: string;
  estado: TareaEstado;
  creadoEn: string;
  actualizadoEn: string;
  version: number;
}
