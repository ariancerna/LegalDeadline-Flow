import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Filas de carga con brillo, para tablas y listas. */
@Component({
  selector: 'app-esqueleto',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (f of filasArr(); track $index) {
      <div class="fila">
        <span class="esqueleto circ"></span>
        <div class="lineas">
          <span class="esqueleto" style="width: 42%; height: 12px"></span>
          <span class="esqueleto" style="width: 68%; height: 10px"></span>
        </div>
        <span
          class="esqueleto"
          style="width: 72px; height: 20px; border-radius: var(--radio-s)"
        ></span>
      </div>
    }
  `,
  styles: `
    .fila {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 16px;
      border-bottom: 1px solid var(--borde);
    }
    .fila:last-child {
      border-bottom: none;
    }
    .circ {
      width: 30px;
      height: 30px;
      border-radius: var(--radio-s);
      flex-shrink: 0;
    }
    .lineas {
      flex: 1;
      display: grid;
      gap: 7px;
    }
  `,
})
export class EsqueletoComponent {
  readonly filas = input(5);
  protected filasArr(): number[] {
    return Array.from({ length: this.filas() }, (_, i) => i);
  }
}
