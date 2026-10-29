import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NombreIcono } from './iconos.generados';

/** Estado vacío: un título, una línea de explicación y una acción opcional (ng-content). */
@Component({
  selector: 'app-vacio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="carpeta" aria-hidden="true"></span>
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
      align-items: center;
      text-align: center;
      padding: 32px 24px;
      gap: 6px;
    }
    // Una carpeta manila vacía: el estado vacío habla el idioma del expediente.
    .carpeta {
      position: relative;
      width: 54px;
      height: 40px;
      margin: 8px 0 10px;
      background: var(--manila-suave);
      border: 1px solid var(--manila-borde);
      border-radius: 2px 4px 4px 4px;
    }
    .carpeta::before {
      content: '';
      position: absolute;
      left: -1px;
      top: -8px;
      width: 22px;
      height: 8px;
      background: var(--manila-suave);
      border: 1px solid var(--manila-borde);
      border-bottom: none;
      border-radius: 3px 3px 0 0;
    }
    h3 {
      font-size: var(--t-md);
      font-weight: 650;
    }
    p {
      color: var(--texto-2);
      max-width: 400px;
      font-size: var(--t-sm);
    }
    .accion:not(:empty) {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 8px;
      margin-top: 12px;
    }
  `,
})
export class VacioComponent {
  /** Se conserva por compatibilidad; el estado vacío ya no muestra icono. */
  readonly icono = input<NombreIcono>('inbox');
  readonly titulo = input.required<string>();
  readonly texto = input<string>('');
}
