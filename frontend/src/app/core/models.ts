// Tipos que reflejan los DTO del backend (pe.edu.utp.legaldeadlineflow.api.dto).

export type Rol = 'ADMINISTRADOR' | 'SUPERVISOR' | 'RESPONSABLE' | 'AUDITOR';
export type ExpedienteEstado = 'ABIERTO' | 'CERRADO' | 'ARCHIVADO';
export type TareaEstado = 'PENDIENTE' | 'EN_PROGRESO' | 'CERRADA' | 'CANCELADA';
export type Prioridad = 'BAJA' | 'MEDIA' | 'ALTA';
export type PlazoEstado = 'ACTIVO' | 'ANULADO';
export type NivelRiesgo = 'CRITICO' | 'ALTO' | 'MEDIO' | 'BAJO';
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

/** Página de Spring Data (solo los campos que usa el cliente). */
export interface Pagina<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  version: number;
}

export interface LoginRespuesta {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  usuario: Usuario;
}

export interface Expediente {
  id: number;
  codigo: string;
  asunto: string;
  responsableId: number;
  estado: ExpedienteEstado;
  creadoEn: string;
  actualizadoEn: string;
  version: number;
}

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

export interface Plazo {
  id: number;
  expedienteId: number;
  expedienteCodigo: string;
  expedienteAsunto: string;
  tipo: string;
  fechaLimite: string;
  estado: PlazoEstado;
  motivoAnulacion: string | null;
  creadoEn: string;
  anuladoEn: string | null;
  actualizadoEn: string;
  version: number;
  /** Riesgo calculado por el backend (RN04) al consultar el plazo. */
  nivelRiesgo: NivelRiesgo;
  diasRestantes: number;
  tareasPendientes: number;
}

export interface RiesgoPlazo {
  plazoId: number;
  estado: PlazoEstado;
  nivel: NivelRiesgo;
  diasRestantes: number;
  tareasPendientes: number;
}

/** El riesgo que ya trae el plazo, con la misma forma que GET /plazos/{id}/riesgo. */
export function riesgoDe(p: Plazo): RiesgoPlazo {
  return {
    plazoId: p.id,
    estado: p.estado,
    nivel: p.nivelRiesgo,
    diasRestantes: p.diasRestantes,
    tareasPendientes: p.tareasPendientes,
  };
}

export interface CargaResponsable {
  responsableId: number;
  nombre: string;
  rol: Rol;
  tareasActivas: number;
  umbral: number;
  sobrecargado: boolean;
}

export interface Indicadores {
  fechaCalculo: string;
  expedientesAbiertos: number;
  expedientesCerrados: number;
  expedientesArchivados: number;
  tareasActivas: number;
  tareasCerradas: number;
  tareasCanceladas: number;
  tareasVencidas: number;
  porcentajeTareasCerradas: number;
  plazosActivos: number;
  plazosAnulados: number;
  plazosVencidos: number;
  plazosProximos: number;
  riesgoPlazosActivos: Partial<Record<NivelRiesgo, number>>;
}

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

/** Cuerpo de error uniforme del backend (ApiError). */
export interface ApiError {
  timestamp?: string;
  status: number;
  error?: string;
  code?: string;
  message?: string;
  path?: string;
  violations?: { campo: string; mensaje: string }[];
}
