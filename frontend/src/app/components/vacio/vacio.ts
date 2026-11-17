import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NombreIcono } from '../icono/iconos.generados';

/** Estado vacío: un título, una línea de explicación y una acción opcional (ng-content). */
@Component({
  selector: 'app-vacio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './vacio.html',
  styleUrl: './vacio.scss',
})
export class VacioComponent {
  /** Se conserva por compatibilidad; el estado vacío ya no muestra icono. */
  readonly icono = input<NombreIcono>('inbox');
  readonly titulo = input.required<string>();
  readonly texto = input<string>('');
}
