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
    .toast {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      padding: 12px 12px 12px 14px;
      border-radius: var(--radio-l);
      background: var(--superficie);
      border: 1px solid var(--borde);
      box-shadow: var(--sombra-3);
      color: var(--texto);
      font-size: 0.875rem;
      font-weight: 500;
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
      color: var(--exito);
    }
    .t-error .icono {
      color: var(--peligro);
    }
    .t-info .icono {
      color: var(--info);
    }
    .t-alerta .icono {
      color: var(--aviso);
    }
    .t-error {
      border-left: 3px solid var(--peligro);
    }
    .t-alerta {
      border-left: 3px solid var(--aviso);
    }
    button {
      background: none;
      border: none;
      color: var(--texto-3);
      cursor: pointer;
      padding: 2px;
      border-radius: var(--radio-l);
    }
    button:hover {
      background: var(--superficie-hover);
      color: var(--texto);
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
