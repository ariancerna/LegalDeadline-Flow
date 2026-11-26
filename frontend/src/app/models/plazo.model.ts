import { NivelRiesgo, PlazoEstado } from './catalogos.model';

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
