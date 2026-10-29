import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

export interface SerieColumnas {
  nombre: string;
  /** Variable CSS del color de la serie, por ejemplo var(--serie-1). */
  color: string;
  valores: number[];
}

const ALTO = 170;

/**
 * Columnas agrupadas (diseño «Movimiento de la cartera» / «Plazos por semana»).
 * - Encabezado con título, subtítulo, leyenda y el botón «Ver tabla».
 * - Una sola escala con números redondos y cuadrícula fina.
 * - Tooltip al pasar el mouse o con el teclado; la vista de tabla tiene los mismos valores.
 * - Las columnas crecen al aparecer (se desactiva con «reducir movimiento»).
 */
@Component({
  selector: 'app-grafico-columnas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cabecera">
      <div class="titulos">
        <h2>{{ titulo() }}</h2>
        @if (subtitulo()) {
          <span class="subtitulo">{{ subtitulo() }}</span>
        }
      </div>
      <div class="derecha">
        @if (series().length > 1) {
          <ul class="leyenda">
            @for (s of series(); track s.nombre) {
              <li><i [style.background]="s.color"></i>{{ s.nombre }}</li>
            }
          </ul>
        }
        <button
          type="button"
          class="vista"
          [attr.aria-pressed]="tabla()"
          (click)="tabla.set(!tabla())"
        >
          {{ tabla() ? 'Ver gráfico' : 'Ver tabla' }}
        </button>
      </div>
    </div>

    @if (tabla()) {
      <table class="tabla-datos">
        <thead>
          <tr>
            <th scope="col">{{ nombreCategoria() }}</th>
            @for (s of series(); track s.nombre) {
              <th scope="col" class="num">{{ s.nombre }}</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (c of categorias(); track $index; let i = $index) {
            <tr>
              <td>{{ nombre(i) }}</td>
              @for (s of series(); track s.nombre) {
                <td class="num">{{ s.valores[i] }}</td>
              }
            </tr>
          }
        </tbody>
      </table>
    } @else {
      <div class="grafico">
        <div class="eje-y" [style.height.px]="alto">
          @for (t of ticks(); track t.valor) {
            <span [style.bottom.%]="t.pos">{{ t.valor }}</span>
          }
        </div>
        <div>
          <div class="area" [style.height.px]="alto" (mouseleave)="activo.set(null)">
            @for (t of ticks(); track t.valor) {
              <span class="linea" [style.bottom.%]="t.pos"></span>
            }
            <div class="columnas">
              @for (c of categorias(); track $index; let i = $index) {
                <div
                  class="grupo"
                  tabindex="0"
                  [class.activo]="activo() === i"
                  [attr.aria-label]="textoGrupo(i)"
                  (mouseenter)="activo.set(i)"
                  (focus)="activo.set(i)"
                  (blur)="activo.set(null)"
                >
                  @if (etiquetas()) {
                    <span
                      class="valor"
                      [style.bottom]="'calc(' + altura(series()[0].valores[i]) + '% + 3px)'"
                      >{{ series()[0].valores[i] }}</span
                    >
                  }
                  <div class="barras">
                    @for (s of series(); track s.nombre) {
                      <span
                        class="barra"
                        [class.ancha]="series().length === 1"
                        [style.height.%]="altura(s.valores[i])"
                        [style.background]="s.color"
                      ></span>
                    }
                  </div>
                  @if (activo() === i) {
                    <div
                      class="tooltip"
                      role="tooltip"
                      [class.izquierda]="i > categorias().length * 0.6"
                    >
                      <b>{{ nombre(i) }}</b>
                      @for (s of series(); track s.nombre) {
                        <span class="fila"
                          ><i [style.background]="s.color"></i>{{ s.nombre }}
                          <b>{{ s.valores[i] }}</b></span
                        >
                      }
                    </div>
                  }
                </div>
              }
            </div>
          </div>
          <div class="eje-x">
            @for (c of categorias(); track $index; let i = $index) {
              <span [class.resaltado]="i === resaltar()"
                ><span>{{ c }}</span
                ><b>{{ subetiquetas().at(i) ?? '' }}</b></span
              >
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .cabecera {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;
      flex-wrap: wrap;
    }
    .titulos {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    h2 {
      font-size: var(--t-md);
      font-weight: 650;
    }
    .subtitulo {
      font-size: var(--t-sm);
      color: var(--texto-3);
    }
    .derecha {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .leyenda {
      display: flex;
      gap: 14px;
      margin: 0;
      padding: 0;
      list-style: none;
      font-size: var(--t-xs);
      color: var(--texto-2);

      li {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      i {
        width: 10px;
        height: 10px;
      }
    }
    .vista {
      height: 32px;
      padding: 0 10px;
      border-radius: var(--radio-2);
      border: 1px solid var(--borde);
      background: var(--superficie);
      color: var(--texto-2);
      font: inherit;
      font-size: var(--t-sm);
      cursor: pointer;
      white-space: nowrap;
    }
    .vista:hover {
      background: var(--superficie-hover);
      color: var(--texto);
    }
    .grafico {
      display: grid;
      grid-template-columns: 26px minmax(0, 1fr);
      gap: 8px;
    }
    .eje-y {
      position: relative;

      span {
        position: absolute;
        right: 0;
        transform: translateY(50%);
        font-size: 11px;
        color: var(--texto-3);
        font-variant-numeric: tabular-nums;
      }
    }
    .area {
      position: relative;
      border-bottom: 1px solid var(--borde-fuerte);
    }
    .linea {
      position: absolute;
      left: 0;
      right: 0;
      border-top: 1px solid var(--cuadricula);
    }
    .columnas {
      position: absolute;
      inset: 0;
      display: flex;
    }
    .grupo {
      position: relative;
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      outline: none;
      cursor: default;

      &.activo,
      &:focus-visible {
        background: var(--superficie-hover);
      }
    }
    .barras {
      display: flex;
      align-items: flex-end;
      justify-content: center;
      gap: 2px;
      height: 100%;
      width: 100%;
    }
    .valor {
      position: absolute;
      left: 0;
      right: 0;
      text-align: center;
      animation: aparecer 0.3s 0.7s both;
      font-size: 11px;
      color: var(--texto-2);
      font-variant-numeric: tabular-nums;
    }
    // Las columnas crecen desde la base al aparecer.
    .barra {
      width: 10px;
      transform-origin: bottom;
      animation: crecer 0.85s cubic-bezier(0.2, 0.8, 0.2, 1) both;

      &.ancha {
        width: min(22px, 60%);
      }
    }
    @keyframes aparecer {
      from {
        opacity: 0;
      }
    }
    @keyframes crecer {
      from {
        transform: scaleY(0);
      }
    }
    .tooltip {
      position: absolute;
      top: 4px;
      left: calc(50% + 14px);
      z-index: 5;
      width: max-content;
      display: flex;
      flex-direction: column;
      gap: 3px;
      padding: 8px 10px;
      background: var(--superficie);
      border: 1px solid var(--borde-fuerte);
      border-radius: var(--radio-2);
      box-shadow: var(--sombra-flotante);
      font-size: var(--t-xs);
      pointer-events: none;

      &.izquierda {
        left: auto;
        right: calc(50% + 14px);
      }

      > b {
        font-size: var(--t-sm);
        font-weight: 650;
      }

      .fila {
        display: flex;
        align-items: center;
        gap: 6px;
        font-variant-numeric: tabular-nums;

        i {
          width: 8px;
          height: 8px;
        }

        b {
          margin-left: auto;
          padding-left: 12px;
        }
      }
    }
    .eje-x {
      display: flex;
      padding-top: 6px;

      > span {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        font-size: 11px;
        line-height: 1.25;
        color: var(--texto-3);
        min-width: 0;

        b {
          color: var(--texto-2);
          font-weight: 600;
        }
      }

      .resaltado > span {
        color: var(--texto);
        font-weight: 650;
      }
    }
    .tabla-datos {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--t-sm);
      font-variant-numeric: tabular-nums;

      th {
        text-align: left;
        padding: 5px 8px;
        font-weight: 600;
        font-size: var(--t-xs);
        color: var(--texto-2);
        border-bottom: 1px solid var(--borde);
      }

      td {
        padding: 4px 8px;
        border-bottom: 1px solid var(--borde);
      }

      .num {
        text-align: right;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .barra,
      .valor {
        animation: none;
      }
    }
  `,
})
export class GraficoColumnasComponent {
  private readonly elemento = inject(ElementRef<HTMLElement>);

  readonly titulo = input('');
  readonly subtitulo = input('');
  readonly categorias = input.required<string[]>();
  /** Segunda línea de cada etiqueta del eje (por ejemplo, el año o «esta»). */
  readonly subetiquetas = input<string[]>([]);
  /** Texto largo de cada categoría para el tooltip y la tabla (por ejemplo, «Octubre 2026»). */
  readonly detalles = input<string[]>([]);
  readonly series = input.required<SerieColumnas[]>();
  readonly nombreCategoria = input('Periodo');
  readonly descripcion = input('Gráfico de columnas');
  /** Índice de la categoría que se destaca (por ejemplo, el mes o la semana actual). */
  readonly resaltar = input<number | null>(null);
  /** Valor sobre cada columna; solo con pocas categorías y una serie. */
  readonly etiquetas = input(false);

  protected readonly alto = ALTO;
  protected readonly activo = signal<number | null>(null);
  protected readonly tabla = signal(false);
  protected readonly ancho = signal(600);

  constructor() {
    const destruir = inject(DestroyRef);
    afterNextRender(() => {
      const medir = () => this.ancho.set(this.elemento.nativeElement.clientWidth);
      medir();
      if (typeof ResizeObserver === 'undefined') return;
      const observador = new ResizeObserver(medir);
      observador.observe(this.elemento.nativeElement);
      destruir.onDestroy(() => observador.disconnect());
    });
  }

  /** Escala con números redondos: 0, 25, 50… o 0, 10, 20… */
  private readonly escala = computed(() => {
    const maximo = Math.max(1, ...this.series().flatMap((s) => s.valores));
    const pasos = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000];
    const paso = pasos.find((p) => maximo / p <= 4) ?? Math.ceil(maximo / 4);
    return { tope: Math.ceil(maximo / paso) * paso, paso };
  });

  protected readonly ticks = computed(() => {
    const { tope, paso } = this.escala();
    const lista: { valor: number; pos: number }[] = [];
    for (let v = 0; v <= tope; v += paso) lista.push({ valor: v, pos: (v / tope) * 100 });
    return lista;
  });

  protected altura(valor: number | undefined): number {
    return ((valor ?? 0) / this.escala().tope) * 100;
  }

  protected nombre(i: number): string {
    return this.detalles().at(i) ?? this.categorias()[i];
  }

  protected textoGrupo(i: number): string {
    return `${this.nombre(i)}: ${this.series()
      .map((s) => `${s.valores[i]} ${s.nombre.toLowerCase()}`)
      .join(', ')}`;
  }
}
