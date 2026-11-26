import { ExpedienteEstado, NivelRiesgo } from './catalogos.model';

export interface Expediente {
  id: number;
  codigo: string;
  asunto: string;
  responsableId: number;
  estado: ExpedienteEstado;
  creadoEn: string;
  actualizadoEn: string;
  version: number;
  /** Tareas pendientes o en progreso. */
  tareasActivas: number;
  /** Plazo activo más cercano, con su riesgo (RN04); null si no tiene. */
  proximoPlazo: ProximoPlazo | null;
}

export interface ProximoPlazo {
  id: number;
  tipo: string;
  fechaLimite: string;
  diasRestantes: number;
  nivel: NivelRiesgo;
}
