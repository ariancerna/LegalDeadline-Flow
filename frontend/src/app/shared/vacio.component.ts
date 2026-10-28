import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconoComponent } from './icono.component';
import { NombreIcono } from './iconos.generados';

/** Estado vacío con icono, mensaje y una acción opcional (ng-content). */
@Component({
  selector: 'app-vacio',
  imports: [IconoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="icono"><app-icono [nombre]="icono()" [tamano]="22" /></div>
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
      padding: 44px 24px;
      gap: 6px;
    }
    .icono {
      width: 48px;
      height: 48px;
      display: grid;
      place-items: center;
      border-radius: 14px;
      background: var(--marca-suave);
      color: var(--marca-texto);
      margin-bottom: 8px;
    }
    p {
      color: var(--texto-3);
      max-width: 360px;
      font-size: 0.875rem;
    }
    .accion:not(:empty) {
      margin-top: 12px;
    }
  `,
})
export class VacioComponent {
  readonly icono = input<NombreIcono>('inbox');
  readonly titulo = input.required<string>();
  readonly texto = input<string>('');
}
