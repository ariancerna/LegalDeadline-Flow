import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ICONOS, NombreIcono } from './iconos.generados';

/** Icono SVG de Lucide dibujado con elementos nativos (sin innerHTML). */
@Component({
  selector: 'app-icono',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', style: 'display:inline-flex;line-height:0' },
  templateUrl: './icono.html',
})
export class IconoComponent {
  readonly nombre = input.required<NombreIcono>();
  readonly tamano = input(16);
  readonly grosor = input(2);
  protected readonly elementos = computed(() => ICONOS[this.nombre()] ?? []);
}
