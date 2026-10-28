import { Rol } from '../models';

// Reglas de interfaz que reflejan AccesoService del backend.
// Solo deciden qué se muestra: el servidor vuelve a validar cada operación.

/** Administrador y supervisor gestionan todo (crear expedientes, reasignar, aprobar ALTA). */
export function esGestor(rol: Rol | null | undefined): boolean {
  return rol === 'ADMINISTRADOR' || rol === 'SUPERVISOR';
}

/** Puede registrar o modificar tareas y plazos (gestor o responsable asignado). */
export function puedeEscribir(rol: Rol | null | undefined): boolean {
  return esGestor(rol) || rol === 'RESPONSABLE';
}

/** Consulta la bitácora de auditoría. */
export function puedeVerAuditoria(rol: Rol | null | undefined): boolean {
  return rol === 'ADMINISTRADOR' || rol === 'SUPERVISOR' || rol === 'AUDITOR';
}

/** Ve información de todos los expedientes (no solo los asignados). */
export function lecturaGlobal(rol: Rol | null | undefined): boolean {
  return esGestor(rol) || rol === 'AUDITOR';
}
