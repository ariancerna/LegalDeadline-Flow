import { Rol } from '../core/models';

export type IconoMenu =
  'tablero' | 'expedientes' | 'tareas' | 'plazos' | 'carga' | 'auditoria' | 'usuarios';

export interface EnlaceNav {
  ruta: string;
  texto: string;
  icono: IconoMenu;
  roles?: Rol[];
  /** Contador que se muestra junto al enlace. */
  contador?: 'alertas' | 'sobrecarga';
}

export const NAVEGACION: EnlaceNav[] = [
  { ruta: '/tablero', texto: 'Tablero', icono: 'tablero' },
  { ruta: '/expedientes', texto: 'Expedientes', icono: 'expedientes' },
  { ruta: '/tareas', texto: 'Tareas', icono: 'tareas' },
  { ruta: '/plazos', texto: 'Plazos', icono: 'plazos', contador: 'alertas' },
  { ruta: '/carga', texto: 'Carga de trabajo', icono: 'carga', contador: 'sobrecarga' },
  {
    ruta: '/auditoria',
    texto: 'Auditoría',
    icono: 'auditoria',
    roles: ['ADMINISTRADOR', 'SUPERVISOR', 'AUDITOR'],
  },
  { ruta: '/usuarios', texto: 'Usuarios', icono: 'usuarios', roles: ['ADMINISTRADOR'] },
];

export function enlacesPara(rol: Rol | null): EnlaceNav[] {
  return NAVEGACION.filter((e) => !e.roles || (rol !== null && e.roles.includes(rol)));
}
