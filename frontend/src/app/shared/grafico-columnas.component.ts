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

interface Barra {
  x: number;
  y: number;
  ancho: number;
  alto: number;
  color: string;
  ruta: string;
}

const ALTO = 190;
const MARGEN = { arriba: 18, abajo: 26, izquierda: 30, derecha: 6 };
const GROSOR_MAX = 24;
const SEPARACION = 2;

/**
 * Columnas agrupadas en SVG, sin librerías.
 * - Columnas de 24 px como máximo, extremo de datos redondeado (4 px) y base recta.
 * - 2 px de separación entre columnas, cuadrícula de líneas finas y una sola escala.
 * - Leyenda cuando hay dos o más series; tooltip al pasar el mouse o con el teclado.
 * - Vista de tabla con los mismos valores (el tooltip nunca es la única forma de leerlos).
 * Se dibuja al ancho real del contenedor para que el texto no se encoja en pantallas angostas.
 */
@Component({
  selector: 'app-grafico-columnas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cabecera">
      @if (series().length > 1) {
        <ul class="leyenda">
          @for (s of series(); track s.nombre) {
            <li><i [style.background]="s.color"></i>{{ s.nombre }}</li>
          }
        </ul>
      } @else {
        <span></span>
      }
      <button type="button" class="vista" (click)="tabla.set(!tabla())">
        {{ tabla() ? 'Ver gráfico' : 'Ver tabla' }}
      </button>
    </div>

    @if (tabla()) {
      <div class="tabla-contenedor">
        <table class="tabla">
          <thead>
            <tr>
              <th>{{ nombreCategoria() }}</th>
              @for (s of series(); track s.nombre) {
                <th class="derecha">{{ s.nombre }}</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (c of categorias(); track $index; let i = $index) {
              <tr>
                <td>{{ nombre(i) }}</td>
                @for (s of series(); track s.nombre) {
                  <td class="derecha num">{{ s.valores[i] }}</td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else {
      <div class="lienzo" (pointerleave)="activo.set(null)">
        <svg
          [attr.width]="ancho()"
          [attr.height]="alto"
          [attr.viewBox]="'0 0 ' + ancho() + ' ' + alto"
          role="img"
          [attr.aria-label]="descripcion()"
        >
          @for (t of ticks(); track t.valor) {
            <line
              class="rejilla"
              [attr.x1]="margen.izquierda"
              [attr.x2]="ancho() - margen.derecha"
              [attr.y1]="t.y"
              [attr.y2]="t.y"
            />
            <text class="eje" [attr.x]="margen.izquierda - 6" [attr.y]="t.y + 4" text-anchor="end">
              {{ t.valor }}
            </text>
          }
          @for (g of grupos(); track $index; let i = $index) {
            <g
              class="grupo"
              [class.atenuado]="activo() !== null && activo() !== i"
              [class.resaltado]="i === resaltar()"
              tabindex="0"
              [attr.aria-label]="textoGrupo(i)"
              (pointerenter)="activo.set(i)"
              (focus)="activo.set(i)"
              (blur)="activo.set(null)"
            >
              <rect
                class="zona"
                [attr.x]="g.x0"
                [attr.y]="margen.arriba"
                [attr.width]="g.x1 - g.x0"
                [attr.height]="alto - margen.arriba - margen.abajo"
              />
              @for (b of g.barras; track $index) {
                <path class="barra" [attr.d]="b.ruta" [style.fill]="b.color" />
              }
              @if (etiquetas() && g.total > 0) {
                <text class="valor" [attr.x]="g.centro" [attr.y]="g.cima - 5" text-anchor="middle">
                  {{ g.total }}
                </text>
              }
              @if (etiquetaVisible(i)) {
                <text class="eje" [attr.x]="g.centro" [attr.y]="alto - 8" text-anchor="middle">
                  {{ categorias()[i] }}
                </text>
              }
            </g>
          }
          <line
            class="base"
            [attr.x1]="margen.izquierda"
            [attr.x2]="ancho() - margen.derecha"
            [attr.y1]="alto - margen.abajo"
            [attr.y2]="alto - margen.abajo"
          />
        </svg>
        @if (activo() !== null) {
          @let i = activo()!;
          <div class="tooltip" [style.left.px]="posicionTooltip(i)">
            <small>{{ nombre(i) }}</small>
            @for (s of series(); track s.nombre) {
              <div class="fila">
                <i [style.background]="s.color"></i>
                <strong>{{ s.valores[i] }}</strong>
                <span>{{ s.nombre }}</span>
              </div>
            }
          </div>
        }
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
      margin-bottom: 8px;
    }
    .leyenda {
      display: flex;
      gap: 14px;
      margin: 0;
      padding: 0;
      list-style: none;
      font-size: 0.8rem;
      color: var(--texto-2);

      li {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      i {
        width: 10px;
        height: 10px;
        border-radius: 2px;
      }
    }
    .vista {
      border: none;
      background: none;
      padding: 2px 0;
      color: var(--marca-texto);
      font: inherit;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
    }
    .lienzo {
      position: relative;
      overflow: hidden;
    }
    svg {
      display: block;
      overflow: visible;
    }
    .rejilla {
      stroke: var(--borde);
      stroke-width: 1;
    }
    .base {
      stroke: var(--borde-fuerte);
      stroke-width: 1;
    }
    .eje {
      fill: var(--texto-3);
      font-size: 11px;
      font-variant-numeric: tabular-nums;
    }
    .valor {
      fill: var(--texto-2);
      font-size: 11px;
      font-weight: 600;
    }
    .zona {
      fill: transparent;
    }
    .grupo {
      outline: none;
      cursor: default;
      transition: opacity 0.15s;
    }
    .grupo.atenuado {
      opacity: 0.45;
    }
    .grupo:focus-visible .zona {
      fill: var(--neutro-suave);
    }
    .grupo.resaltado .eje {
      fill: var(--texto);
      font-weight: 700;
    }
    // Las columnas crecen desde la base al aparecer.
    .barra {
      transform-box: fill-box;
      transform-origin: bottom;
      animation: crecer 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both;
    }
    @keyframes crecer {
      from {
        transform: scaleY(0);
      }
    }
    .tooltip {
      position: absolute;
      top: 4px;
      transform: translateX(-50%);
      min-width: 130px;
      padding: 8px 10px;
      border: 1px solid var(--borde);
      border-radius: var(--radio);
      background: var(--superficie);
      box-shadow: var(--sombra-3);
      pointer-events: none;
      font-size: 0.8rem;

      small {
        display: block;
        margin-bottom: 4px;
        color: var(--texto-3);
      }

      .fila {
        display: flex;
        align-items: center;
        gap: 7px;
      }

      i {
        width: 12px;
        height: 2px;
      }

      strong {
        min-width: 22px;
        font-variant-numeric: tabular-nums;
      }

      span {
        color: var(--texto-2);
      }
    }
    .derecha {
      text-align: right !important;
    }
    @media (prefers-reduced-motion: reduce) {
      .barra {
        animation: none;
      }
    }
  `,
})
export class GraficoColumnasComponent {
  private readonly elemento = inject(ElementRef<HTMLElement>);

  readonly categorias = input.required<string[]>();
  /** Texto largo de cada categoría para el tooltip y la tabla (por ejemplo, «octubre de 2026»). */
  readonly detalles = input<string[]>([]);
  readonly series = input.required<SerieColumnas[]>();
  readonly nombreCategoria = input('Periodo');
  readonly descripcion = input('Gráfico de columnas');
  /** Índice de la categoría que se destaca (por ejemplo, el mes o la semana actual). */
  readonly resaltar = input<number | null>(null);
  /** Valor sobre cada columna; solo con pocas categorías y una serie. */
  readonly etiquetas = input(false);

  protected readonly alto = ALTO;
  protected readonly margen = MARGEN;
  protected readonly ancho = signal(600);
  protected readonly activo = signal<number | null>(null);
  protected readonly tabla = signal(false);

  constructor() {
    const destruir = inject(DestroyRef);
    afterNextRender(() => {
      const medir = () => this.ancho.set(Math.max(260, this.elemento.nativeElement.clientWidth));
      medir();
      if (typeof ResizeObserver === 'undefined') return;
      const observador = new ResizeObserver(medir);
      observador.observe(this.elemento.nativeElement);
      destruir.onDestroy(() => observador.disconnect());
    });
  }

  /** Escala con números redondos: 0, 5, 10… o 0, 20, 40… */
  private readonly escala = computed(() => {
    const maximo = Math.max(1, ...this.series().flatMap((s) => s.valores));
    const pasos = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
    const paso = pasos.find((p) => maximo / p <= 4) ?? Math.ceil(maximo / 4);
    return { tope: Math.ceil(maximo / paso) * paso, paso };
  });

  protected readonly ticks = computed(() => {
    const { tope, paso } = this.escala();
    const lista: { valor: number; y: number }[] = [];
    for (let v = 0; v <= tope; v += paso) lista.push({ valor: v, y: this.y(v) });
    return lista;
  });

  protected readonly grupos = computed(() => {
    const n = this.categorias().length;
    const series = this.series();
    const util = this.ancho() - MARGEN.izquierda - MARGEN.derecha;
    const banda = util / Math.max(1, n);
    const grosor = Math.min(
      GROSOR_MAX,
      (banda * 0.62 - SEPARACION * (series.length - 1)) / series.length,
    );
    const anchoGrupo = grosor * series.length + SEPARACION * (series.length - 1);
    return Array.from({ length: n }, (_, i) => {
      const x0 = MARGEN.izquierda + banda * i;
      const centro = x0 + banda / 2;
      let x = centro - anchoGrupo / 2;
      const barras: Barra[] = series.map((s) => {
        const valor = s.valores[i] ?? 0;
        const y = this.y(valor);
        const alto = this.y(0) - y;
        const barra = {
          x,
          y,
          ancho: grosor,
          alto,
          color: s.color,
          ruta: columna(x, y, grosor, alto),
        };
        x += grosor + SEPARACION;
        return barra;
      });
      const total = series.reduce((suma, s) => suma + (s.valores[i] ?? 0), 0);
      const cima = Math.min(...barras.map((b) => b.y));
      return { x0, x1: x0 + banda, centro, barras, total, cima };
    });
  });

  private y(valor: number): number {
    const alto = ALTO - MARGEN.arriba - MARGEN.abajo;
    return MARGEN.arriba + alto - (valor / this.escala().tope) * alto;
  }

  /** En pantallas angostas se muestra una etiqueta de cada dos (y siempre la destacada). */
  protected etiquetaVisible(i: number): boolean {
    const n = this.categorias().length;
    const banda = (this.ancho() - MARGEN.izquierda - MARGEN.derecha) / Math.max(1, n);
    if (banda >= 44 || i === this.resaltar()) return true;
    const ultima = n - 1;
    return (ultima - i) % 2 === 0 && Math.abs(i - (this.resaltar() ?? -9)) > 1;
  }

  protected posicionTooltip(i: number): number {
    const g = this.grupos()[i];
    return Math.min(Math.max(g.centro, 75), this.ancho() - 75);
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

/** Columna con el extremo superior redondeado (4 px) y la base recta. */
function columna(x: number, y: number, ancho: number, alto: number): string {
  if (alto <= 0) return '';
  const r = Math.min(4, ancho / 2, alto);
  return `M${x},${y + alto}V${y + r}Q${x},${y} ${x + r},${y}H${x + ancho - r}Q${x + ancho},${y} ${x + ancho},${y + r}V${y + alto}Z`;
}
