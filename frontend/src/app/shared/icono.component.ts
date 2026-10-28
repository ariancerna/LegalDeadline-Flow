import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ICONOS, NombreIcono } from './iconos.generados';

/** Icono SVG de Lucide dibujado con elementos nativos (sin innerHTML). */
@Component({
  selector: 'app-icono',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', style: 'display:inline-flex;line-height:0' },
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      [attr.width]="tamano()"
      [attr.height]="tamano()"
      [attr.stroke-width]="grosor()"
    >
      @for (el of elementos(); track $index) {
        @switch (el[0]) {
          @case ('path') {
            <svg:path [attr.d]="el[1]['d']" />
          }
          @case ('circle') {
            <svg:circle [attr.cx]="el[1]['cx']" [attr.cy]="el[1]['cy']" [attr.r]="el[1]['r']" />
          }
          @case ('rect') {
            <svg:rect
              [attr.x]="el[1]['x']"
              [attr.y]="el[1]['y']"
              [attr.width]="el[1]['width']"
              [attr.height]="el[1]['height']"
              [attr.rx]="el[1]['rx']"
              [attr.ry]="el[1]['ry']"
            />
          }
          @case ('line') {
            <svg:line
              [attr.x1]="el[1]['x1']"
              [attr.y1]="el[1]['y1']"
              [attr.x2]="el[1]['x2']"
              [attr.y2]="el[1]['y2']"
            />
          }
          @case ('polyline') {
            <svg:polyline [attr.points]="el[1]['points']" />
          }
        }
      }
    </svg>
  `,
})
export class IconoComponent {
  readonly nombre = input.required<NombreIcono>();
  readonly tamano = input(16);
  readonly grosor = input(2);
  protected readonly elementos = computed(() => ICONOS[this.nombre()] ?? []);
}
