import { EventoTipo } from '../core/models';
import { NombreIcono } from './iconos.generados';

export interface PresentacionEvento {
  icono: NombreIcono;
  tono: 'marca' | 'exito' | 'aviso' | 'peligro' | 'info' | 'neutro';
  verbo: string;
}

/** Cómo se muestra cada tipo de evento de auditoría. */
export const EVENTOS: Record<EventoTipo, PresentacionEvento> = {
  EXPEDIENTE_CREADO: { icono: 'folder', tono: 'marca', verbo: 'registró el expediente' },
  EXPEDIENTE_ACTUALIZADO: { icono: 'pencil', tono: 'info', verbo: 'actualizó el expediente' },
  EXPEDIENTE_CERRADO: { icono: 'circle-check', tono: 'exito', verbo: 'cerró el expediente' },
  EXPEDIENTE_ARCHIVADO: { icono: 'archive', tono: 'neutro', verbo: 'archivó el expediente' },
  TAREA_CREADA: { icono: 'list-checks', tono: 'marca', verbo: 'creó la tarea' },
  TAREA_ACTUALIZADA: { icono: 'pencil', tono: 'info', verbo: 'actualizó la tarea' },
  TAREA_CANCELADA: { icono: 'ban', tono: 'neutro', verbo: 'canceló la tarea' },
  TAREA_ESTADO_CAMBIADO: {
    icono: 'arrow-right-left',
    tono: 'info',
    verbo: 'cambió el estado de la tarea',
  },
  PLAZO_CREADO: { icono: 'calendar-clock', tono: 'marca', verbo: 'registró el plazo' },
  PLAZO_ACTUALIZADO: { icono: 'pencil', tono: 'info', verbo: 'modificó el plazo' },
  PLAZO_ANULADO: { icono: 'calendar-x', tono: 'peligro', verbo: 'anuló el plazo' },
  USUARIO_CREADO: { icono: 'user-plus', tono: 'marca', verbo: 'creó la cuenta' },
  USUARIO_ACTUALIZADO: { icono: 'user-check', tono: 'info', verbo: 'actualizó la cuenta' },
  USUARIO_PASSWORD_CAMBIADO: {
    icono: 'key-round',
    tono: 'aviso',
    verbo: 'cambió la contraseña de la cuenta',
  },
};

export function nombreDesdeEmail(email: string | null): string {
  if (!email) return 'Sistema';
  const local = email.split('@')[0].replace(/[._-]+/g, ' ');
  return local.replace(/\b\w/g, (c) => c.toUpperCase());
}
