import { Component, inject } from '@angular/core';
import { NotificacionesService } from '../core/notificaciones.service';

@Component({
  selector: 'app-notificaciones',
  template: `
    <div class="pila" aria-live="polite">
      @for (n of servicio.lista(); track n.id) {
        <div [class]="'toast toast-' + n.tipo" role="status">
          <span>{{ n.mensaje }}</span>
          <button type="button" aria-label="Cerrar notificación" (click)="servicio.cerrar(n.id)">
            ✕
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .pila {
      position: fixed;
      right: 16px;
      bottom: 16px;
      z-index: 100;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: min(380px, calc(100vw - 32px));
    }
    .toast {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      justify-content: space-between;
      padding: 12px 14px;
      border-radius: 8px;
      color: #fff;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.2);
      font-weight: 500;
    }
    .toast button {
      background: none;
      border: none;
      color: inherit;
      cursor: pointer;
      opacity: 0.8;
    }
    .toast-exito {
      background: #15803d;
    }
    .toast-error {
      background: #b91c1c;
    }
    .toast-info {
      background: #1e3a5f;
    }
    .toast-alerta {
      background: #b45309;
    }
  `,
})
export class NotificacionesComponent {
  protected readonly servicio = inject(NotificacionesService);
}
