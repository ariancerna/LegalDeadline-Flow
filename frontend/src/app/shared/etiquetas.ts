import { NivelRiesgo } from '../core/models';

const ETIQUETAS: Record<string, string> = {
  ADMINISTRADOR: 'Administrador',
  SUPERVISOR: 'Supervisor',
  RESPONSABLE: 'Responsable',
  AUDITOR: 'Auditor',
  ABIERTO: 'Abierto',
  CERRADO: 'Cerrado',
  ARCHIVADO: 'Archivado',
  PENDIENTE: 'Pendiente',
  EN_PROGRESO: 'En progreso',
  CERRADA: 'Cerrada',
  CANCELADA: 'Cancelada',
  BAJA: 'Baja',
  MEDIA: 'Media',
  ALTA: 'Alta',
  ACTIVO: 'Activo',
  ANULADO: 'Anulado',
  CRITICO: 'Crítico',
  ALTO: 'Alto',
  MEDIO: 'Medio',
  BAJO: 'Bajo',
};

/** Convierte un valor de enum del backend (EN_PROGRESO) en texto legible (En progreso). */
export function etiqueta(valor: string | null | undefined): string {
  if (!valor) return '—';
  if (ETIQUETAS[valor]) return ETIQUETAS[valor];
  const texto = valor.replace(/_/g, ' ').toLowerCase();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Clase CSS del badge según el estado o la prioridad. */
export function tono(valor: string | null | undefined): string {
  switch (valor) {
    case 'ABIERTO':
    case 'ACTIVO':
    case 'EN_PROGRESO':
      return 'badge-info';
    case 'CERRADO':
    case 'CERRADA':
      return 'badge-exito';
    case 'ARCHIVADO':
    case 'CANCELADA':
    case 'ANULADO':
      return 'badge-neutro';
    case 'PENDIENTE':
    case 'MEDIA':
      return 'badge-aviso';
    case 'ALTA':
      return 'badge-error';
    case 'BAJA':
      return 'badge-neutro';
    default:
      return '';
  }
}

export function claseRiesgo(nivel: NivelRiesgo | null | undefined): string {
  return nivel ? `riesgo-${nivel}` : 'badge-neutro';
}
