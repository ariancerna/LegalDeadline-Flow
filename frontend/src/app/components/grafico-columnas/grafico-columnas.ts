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
  templateUrl: './grafico-columnas.html',
  styleUrl: './grafico-columnas.scss',
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
