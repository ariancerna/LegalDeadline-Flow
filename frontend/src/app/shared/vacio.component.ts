import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NombreIcono } from './iconos.generados';

/** Estado vacío: un título, una línea de explicación y una acción opcional (ng-content). */
@Component({
  selector: 'app-vacio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3>{{ titulo() }}</h3>
    @if (texto()) {
      <p>{{ texto() }}</p>
    }
    <div class="accion"><ng-content /></div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      padding: 28px 20px;
      gap: 4px;
    }
    h3 {
      font-size: 0.95rem;
    }
    p {
      color: var(--texto-3);
      max-width: 440px;
      font-size: 0.875rem;
    }
    .accion:not(:empty) {
      margin-top: 10px;
    }
  `,
})
export class VacioComponent {
  /** Se conserva por compatibilidad; el estado vacío ya no muestra icono. */
  readonly icono = input<NombreIcono>('inbox');
  readonly titulo = input.required<string>();
  readonly texto = input<string>('');
}
