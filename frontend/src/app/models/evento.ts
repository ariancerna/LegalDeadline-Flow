export type EventoTipo =
  | 'EXPEDIENTE_CREADO'
  | 'EXPEDIENTE_ACTUALIZADO'
  | 'EXPEDIENTE_CERRADO'
  | 'EXPEDIENTE_ARCHIVADO'
  | 'TAREA_CREADA'
  | 'TAREA_ACTUALIZADA'
  | 'TAREA_CANCELADA'
  | 'TAREA_ESTADO_CAMBIADO'
  | 'PLAZO_CREADO'
  | 'PLAZO_ACTUALIZADO'
  | 'PLAZO_ANULADO'
  | 'USUARIO_CREADO'
  | 'USUARIO_ACTUALIZADO'
  | 'USUARIO_PASSWORD_CAMBIADO';

export interface Evento {
  id: number;
  tipo: EventoTipo;
  recurso: string;
  recursoId: number;
  detalle: string;
  fecha: string;
  usuarioId: number | null;
  usuarioEmail: string | null;
}
