import type { EventoTipo } from '../models/evento';
import type { ExpedienteEstado } from '../models/expediente';
import type { NivelRiesgo, PlazoEstado } from '../models/plazo';
import type { Prioridad, TareaEstado } from '../models/tarea';
import type { Rol } from '../models/usuario';

// Opciones de los filtros y formularios según los valores de la API.

export const ROLES: Rol[] = ['ADMINISTRADOR', 'SUPERVISOR', 'RESPONSABLE', 'AUDITOR'];
export const EXPEDIENTE_ESTADOS: ExpedienteEstado[] = ['ABIERTO', 'CERRADO', 'ARCHIVADO'];
export const TAREA_ESTADOS: TareaEstado[] = ['PENDIENTE', 'EN_PROGRESO', 'CERRADA', 'CANCELADA'];
export const PRIORIDADES: Prioridad[] = ['BAJA', 'MEDIA', 'ALTA'];
export const PLAZO_ESTADOS: PlazoEstado[] = ['ACTIVO', 'ANULADO'];
export const NIVELES_RIESGO: NivelRiesgo[] = ['CRITICO', 'ALTO', 'MEDIO', 'BAJO'];
export const EVENTO_TIPOS: EventoTipo[] = [
  'EXPEDIENTE_CREADO',
  'EXPEDIENTE_ACTUALIZADO',
  'EXPEDIENTE_CERRADO',
  'EXPEDIENTE_ARCHIVADO',
  'TAREA_CREADA',
  'TAREA_ACTUALIZADA',
  'TAREA_CANCELADA',
  'TAREA_ESTADO_CAMBIADO',
  'PLAZO_CREADO',
  'PLAZO_ACTUALIZADO',
  'PLAZO_ANULADO',
  'USUARIO_CREADO',
  'USUARIO_ACTUALIZADO',
  'USUARIO_PASSWORD_CAMBIADO',
];
