import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NIVELES_RIESGO, NivelRiesgo } from '../../core/models';
import { EtiquetaPipe } from '../../shared/etiqueta.pipe';

const COLOR: Record<NivelRiesgo, string> = {
  CRITICO: 'var(--riesgo-critico)',
  ALTO: 'var(--riesgo-alto)',
  MEDIO: 'var(--riesgo-medio)',
  BAJO: 'var(--riesgo-bajo)',
};

/** Gráfico de dona con la distribución del riesgo de los plazos activos (RF15/RF17). */
@Component({
  selector: 'app-dona-riesgo',
  imports: [EtiquetaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="contenedor">
      <svg
        viewBox="0 0 140 140"
        role="img"
        [attr.aria-label]="'Riesgo de ' + total() + ' plazos activos'"
      >
        <circle
          cx="70"
          cy="70"
          [attr.r]="R"
          fill="none"
          stroke="var(--neutro-suave)"
          stroke-width="16"
        />
        @for (s of segmentos(); track s.nivel) {
          <circle
            cx="70"
            cy="70"
            [attr.r]="R"
            fill="none"
            [attr.stroke]="s.color"
            stroke-width="16"
            [attr.stroke-dasharray]="s.largo + ' ' + (C - s.largo)"
            [attr.stroke-dashoffset]="-s.inicio"
            transform="rotate(-90 70 70)"
            class="segmento"
          />
        }
        <text x="70" y="66" text-anchor="middle" class="total">{{ total() }}</text>
        <text x="70" y="86" text-anchor="middle" class="leyenda-centro">plazos activos</text>
      </svg>
      <ul>
        @for (n of niveles; track n) {
          <li>
            <span class="punto" [style.background]="color[n]"></span>
            <span class="nombre">{{ n | etiqueta }}</span>
            <strong class="num">{{ cantidad(n) }}</strong>
            <span class="pct num">{{ porcentaje(n) }}%</span>
          </li>
        }
      </ul>
    </div>
  `,
  styles: `
    .contenedor {
      display: flex;
      align-items: center;
      gap: 28px;
      flex-wrap: wrap;
      justify-content: center;
    }
    svg {
      width: 168px;
      height: 168px;
      flex-shrink: 0;
    }
    .segmento {
      transition: stroke-dasharray 0.6s ease;
    }
    .total {
      font-family: 'Source Serif 4 Variable', Georgia, serif;
      font-size: 30px;
      font-weight: 600;
      fill: var(--texto);
    }
    .leyenda-centro {
      font-size: 9.5px;
      fill: var(--texto-3);
    }
    ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 10px;
      flex: 1;
      min-width: 170px;
    }
    li {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.875rem;
    }
    .punto {
      width: 10px;
      height: 10px;
      border-radius: 3px;
    }
    .nombre {
      flex: 1;
      color: var(--texto-2);
    }
    .pct {
      width: 40px;
      text-align: right;
      color: var(--texto-3);
      font-size: 0.8rem;
    }
  `,
})
export class DonaRiesgoComponent {
  readonly datos = input.required<Partial<Record<NivelRiesgo, number>>>();
  protected readonly niveles = NIVELES_RIESGO;
  protected readonly color = COLOR;
  protected readonly R = 54;
  protected readonly C = 2 * Math.PI * 54;

  protected readonly total = computed(() =>
    NIVELES_RIESGO.reduce((s, n) => s + (this.datos()[n] ?? 0), 0),
  );

  protected readonly segmentos = computed(() => {
    const total = this.total();
    if (total === 0) return [];
    const hueco = NIVELES_RIESGO.filter((n) => (this.datos()[n] ?? 0) > 0).length > 1 ? 2 : 0;
    let inicio = 0;
    return NIVELES_RIESGO.filter((n) => (this.datos()[n] ?? 0) > 0).map((nivel) => {
      const largoTotal = ((this.datos()[nivel] ?? 0) / total) * this.C;
      const s = { nivel, color: COLOR[nivel], inicio, largo: Math.max(0, largoTotal - hueco) };
      inicio += largoTotal;
      return s;
    });
  });

  protected cantidad(n: NivelRiesgo): number {
    return this.datos()[n] ?? 0;
  }

  protected porcentaje(n: NivelRiesgo): number {
    const t = this.total();
    return t === 0 ? 0 : Math.round((this.cantidad(n) / t) * 100);
  }
}
