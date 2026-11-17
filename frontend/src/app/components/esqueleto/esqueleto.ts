import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Filas de carga con brillo, para tablas y listas. */
@Component({
  selector: 'app-esqueleto',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './esqueleto.html',
  styleUrl: './esqueleto.scss',
})
export class EsqueletoComponent {
  readonly filas = input(5);
  protected filasArr(): number[] {
    return Array.from({ length: this.filas() }, (_, i) => i);
  }
}
