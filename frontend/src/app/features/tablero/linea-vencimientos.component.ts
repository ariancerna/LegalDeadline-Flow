import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Alerta } from '../../core/alertas.store';
import { ExpedientesCache } from '../../core/expedientes.cache';
import { EtiquetaPipe } from '../../shared/etiqueta.pipe';
import { etiqueta } from '../../shared/etiquetas';
import { sumarDias } from '../../shared/fechas';

interface Columna {
  clave: string;
  dia: string;
  numero: string;
  hoy: boolean;
  finDeSemana: boolean;
  vencidos: boolean;
  plazos: Alerta[];
}

const INICIALES = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const VISIBLES = 3;
const GRAVEDAD = ['CRITICO', 'ALTO', 'MEDIO', 'BAJO'];

/**
 * Próximos 14 días (diseño «Tablero Supervisor»): una columna de vencidos, hoy en tinta y los
 * días siguientes, con hasta tres plazos por día coloreados por riesgo y «+N más».
 */
@Component({
  selector: 'app-linea-vencimientos',
  imports: [RouterLink, EtiquetaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="regla">
      @for (c of columnas(); track c.clave) {
        <div
          class="columna"
          [class.hoy]="c.hoy"
          [class.finde]="c.finDeSemana"
          [class.vencidos]="c.vencidos"
        >
          <div class="fecha">
            <span class="dia">{{ c.dia }}</span>
            <span class="numero">{{ c.numero }}</span>
          </div>
          <div class="marcas">
            @for (a of c.plazos.slice(0, visibles); track a.plazo.id) {
              <a
                [class]="'marca r-' + a.riesgo.nivel"
                [routerLink]="['/expedientes', a.plazo.expedienteId]"
                [title]="titulo(a)"
                [attr.aria-label]="titulo(a)"
              >
                <span class="tipo">{{ a.plazo.tipo | etiqueta: 'corta' }}</span>
                <span class="exp">{{ numero(a) }}</span>
              </a>
            }
            @if (c.plazos.length > visibles) {
              <a
                class="mas"
                routerLink="/plazos"
                [queryParams]="c.vencidos ? { ver: 'vencidos' } : { vista: 'calendario' }"
                >+{{ c.plazos.length - visibles }} más</a
              >
            }
            @if (c.finDeSemana && c.plazos.length === 0) {
              <span class="inhabil">Inhábil</span>
            }
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './linea-vencimientos.component.scss',
})
export class LineaVencimientosComponent {
  protected readonly expedientes = inject(ExpedientesCache);
  protected readonly visibles = VISIBLES;

  readonly alertas = input.required<Alerta[]>();
  readonly hoy = input.required<string>();
  readonly dias = input(14);

  protected readonly columnas = computed<Columna[]>(() => {
    const hoy = this.hoy();
    const porFecha = new Map<string, Alerta[]>();
    const vencidos: Alerta[] = [];
    for (const a of this.alertas()) {
      if (a.plazo.fechaLimite < hoy) vencidos.push(a);
      else {
        if (!porFecha.has(a.plazo.fechaLimite)) porFecha.set(a.plazo.fechaLimite, []);
        porFecha.get(a.plazo.fechaLimite)!.push(a);
      }
    }
    // En un día con muchos plazos se ven primero los de mayor riesgo.
    const ordenar = (lista: Alerta[]) =>
      lista.sort((x, y) => GRAVEDAD.indexOf(x.riesgo.nivel) - GRAVEDAD.indexOf(y.riesgo.nivel));
    ordenar(vencidos);
    for (const lista of porFecha.values()) ordenar(lista);

    const columnas: Columna[] = [
      {
        clave: 'vencidos',
        dia: 'Vencidos',
        numero: String(vencidos.length),
        hoy: false,
        finDeSemana: false,
        vencidos: true,
        plazos: vencidos,
      },
    ];
    for (let i = 0; i < this.dias(); i++) {
      const fecha = sumarDias(hoy, i);
      const semana = new Date(`${fecha}T12:00:00Z`).getUTCDay();
      columnas.push({
        clave: fecha,
        dia: i === 0 ? 'Hoy' : INICIALES[semana],
        numero: String(Number(fecha.slice(8, 10))),
        hoy: i === 0,
        finDeSemana: semana === 0 || semana === 6,
        vencidos: false,
        plazos: porFecha.get(fecha) ?? [],
      });
    }
    return columnas;
  });

  /** Número corto del expediente: los cinco primeros dígitos (00733 de 00733-2026-0-1801). */
  protected numero(a: Alerta): string {
    return this.expedientes.codigo(a.plazo.expedienteId).split('-')[0];
  }

  protected titulo(a: Alerta): string {
    return [
      etiqueta(a.riesgo.nivel),
      etiqueta(a.plazo.tipo),
      this.expedientes.codigo(a.plazo.expedienteId),
      this.expedientes.titulo(a.plazo.expedienteId),
    ]
      .filter(Boolean)
      .join(' · ');
  }
}
