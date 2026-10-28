import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { Rol } from '../core/models';
import { ResponsablesStore } from '../core/responsables.store';
import { EtiquetaPipe } from '../shared/etiqueta.pipe';
import { NotificacionesComponent } from './notificaciones.component';

interface Enlace {
  ruta: string;
  texto: string;
  icono: string;
  roles?: Rol[];
}

const ENLACES: Enlace[] = [
  { ruta: '/tablero', texto: 'Tablero', icono: '▦' },
  { ruta: '/expedientes', texto: 'Expedientes', icono: '📁' },
  { ruta: '/tareas', texto: 'Tareas', icono: '✓' },
  { ruta: '/plazos', texto: 'Plazos', icono: '⏱' },
  { ruta: '/carga', texto: 'Carga de trabajo', icono: '⚖' },
  {
    ruta: '/auditoria',
    texto: 'Auditoría',
    icono: '🛈',
    roles: ['ADMINISTRADOR', 'SUPERVISOR', 'AUDITOR'],
  },
  { ruta: '/usuarios', texto: 'Usuarios', icono: '👤', roles: ['ADMINISTRADOR'] },
];

/** Estructura principal: menú lateral por rol, barra superior y contenido. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, EtiquetaPipe, NotificacionesComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  protected readonly auth = inject(AuthService);
  private readonly responsables = inject(ResponsablesStore);
  protected readonly menuAbierto = signal(false);

  protected readonly enlaces = computed(() => {
    const rol = this.auth.rol();
    return ENLACES.filter((e) => !e.roles || (rol !== null && e.roles.includes(rol)));
  });

  constructor() {
    this.responsables.asegurar();
  }

  protected salir(): void {
    this.responsables.limpiar();
    this.auth.logout();
  }
}
