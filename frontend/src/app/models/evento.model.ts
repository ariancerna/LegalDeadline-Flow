import { EventoTipo } from './catalogos.model';

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
