import { Component, inject } from '@angular/core';
import { NotificacionesService, TipoNotificacion } from '../../services/notificaciones.service';
import { IconoComponent } from '../icono/icono';
import { NombreIcono } from '../icono/iconos.generados';

const ICONOS: Record<TipoNotificacion, NombreIcono> = {
  exito: 'circle-check',
  error: 'circle-alert',
  info: 'info',
  alerta: 'triangle-alert',
};

@Component({
  selector: 'app-notificaciones',
  imports: [IconoComponent],
  templateUrl: './notificaciones.html',
  styleUrl: './notificaciones.scss',
})
export class NotificacionesComponent {
  protected readonly servicio = inject(NotificacionesService);
  protected readonly iconos = ICONOS;
}
