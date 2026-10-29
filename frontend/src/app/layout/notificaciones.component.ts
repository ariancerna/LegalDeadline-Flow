import { Component, inject } from '@angular/core';
import { NotificacionesService, TipoNotificacion } from '../core/notificaciones.service';
import { IconoComponent } from '../shared/icono.component';
import { NombreIcono } from '../shared/iconos.generados';

const ICONOS: Record<TipoNotificacion, NombreIcono> = {
  exito: 'circle-check',
  error: 'circle-alert',
  info: 'info',
  alerta: 'triangle-alert',
};

@Component({
  selector: 'app-notificaciones',
  imports: [IconoComponent],
  template: `
    <div class="pila" aria-live="polite">
      @for (n of servicio.lista(); track n.id) {
        <div [class]="'toast t-' + n.tipo" role="status">
          <span class="icono"><app-icono [nombre]="iconos[n.tipo]" [tamano]="18" /></span>
          <span class="mensaje">{{ n.mensaje }}</span>
          <button type="button" aria-label="Cerrar notificación" (click)="servicio.cerrar(n.id)">
            <app-icono nombre="x" [tamano]="15" />
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .pila {
      position: fixed;
      right: 20px;
      bottom: 20px;
      z-index: 100;
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: min(380px, calc(100vw - 32px));
    }
    // Notificación en tinta, abajo a la derecha; se oculta sola.
    .toast {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      padding: 12px 12px 12px 14px;
      border-radius: var(--radio-3);
      background: var(--primario);
      color: var(--texto-invertido);
      box-shadow: var(--sombra-flotante);
      font-size: var(--t-sm);
      font-weight: 500;
      line-height: 1.4;
      animation: entrar 0.22s cubic-bezier(0.2, 0.9, 0.3, 1.2) both;
    }
    .icono {
      flex-shrink: 0;
      margin-top: 1px;
    }
    .mensaje {
      flex: 1;
    }
    .t-exito .icono {
      color: oklch(0.82 0.1 150);
    }
    .t-error .icono {
      color: oklch(0.75 0.15 27);
    }
    .t-info .icono {
      color: oklch(0.8 0.08 245);
    }
    .t-alerta .icono {
      color: oklch(0.82 0.12 70);
    }
    button {
      background: none;
      border: none;
      color: inherit;
      opacity: 0.7;
      cursor: pointer;
      padding: 2px;
      border-radius: var(--radio-1);
    }
    button:hover {
      opacity: 1;
    }
    @keyframes entrar {
      from {
        opacity: 0;
        transform: translateY(10px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: none;
      }
    }
  `,
})
export class NotificacionesComponent {
  protected readonly servicio = inject(NotificacionesService);
  protected readonly iconos = ICONOS;
}
