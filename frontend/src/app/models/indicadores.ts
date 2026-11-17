import type { NivelRiesgo } from './plazo';
import type { Rol } from './usuario';

export interface MovimientoMes {
  /** Mes en la forma 2026-10. */
  mes: string;
  ingresados: number;
  concluidos: number;
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
  /** Ingresos y conclusiones de los últimos 12 meses. */
  movimientoMensual: MovimientoMes[];
  /** Los últimos 10 años, del más antiguo al actual. */
  movimientoAnual: MovimientoAnio[];
}

export interface MovimientoAnio {
  anio: number;
  ingresados: number;
  concluidos: number;
}
