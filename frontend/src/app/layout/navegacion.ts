import { Rol } from '../core/models';
import { NombreIcono } from '../shared/iconos.generados';

export interface EnlaceNav {
  ruta: string;
  texto: string;
  icono: NombreIcono;
  grupo: 'General' | 'Gestión' | 'Control' | 'Administración';
  roles?: Rol[];
  /** Contador que se muestra junto al enlace. */
  contador?: 'alertas' | 'sobrecarga';
}

export const NAVEGACION: EnlaceNav[] = [
  { ruta: '/tablero', texto: 'Tablero', icono: 'layout-dashboard', grupo: 'General' },
  { ruta: '/expedientes', texto: 'Expedientes', icono: 'folder-open', grupo: 'Gestión' },
  { ruta: '/tareas', texto: 'Tareas', icono: 'list-checks', grupo: 'Gestión' },
  {
    ruta: '/plazos',
    texto: 'Plazos',
    icono: 'calendar-clock',
    grupo: 'Gestión',
    contador: 'alertas',
  },
  {
    ruta: '/carga',
    texto: 'Carga de trabajo',
    icono: 'scale',
    grupo: 'Control',
    contador: 'sobrecarga',
  },
  {
    ruta: '/auditoria',
    texto: 'Auditoría',
    icono: 'history',
    grupo: 'Control',
    roles: ['ADMINISTRADOR', 'SUPERVISOR', 'AUDITOR'],
  },
  {
    ruta: '/usuarios',
    texto: 'Usuarios',
    icono: 'users',
    grupo: 'Administración',
    roles: ['ADMINISTRADOR'],
  },
];

export function enlacesPara(rol: Rol | null): EnlaceNav[] {
  return NAVEGACION.filter((e) => !e.roles || (rol !== null && e.roles.includes(rol)));
}
