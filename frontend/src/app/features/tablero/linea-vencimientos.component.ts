import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Alerta } from '../../core/alertas.store';
import { ExpedientesCache } from '../../core/expedientes.cache';
import { EtiquetaPipe } from '../../shared/etiqueta.pipe';
import { mesCorto, sumarDias } from '../../shared/fechas';

interface Columna {
  clave: string;
  dia: string;
  numero: string;
  mes: string;
  hoy: boolean;
  finDeSemana: boolean;
  vencidos: boolean;
  plazos: Alerta[];
}

const INICIALES = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const VISIBLES = 3;

/** Regla de 14 días con los plazos activos marcados en su fecha y coloreados por riesgo. */
@Component({
  selector: 'app-linea-vencimientos',
  imports: [RouterLink, EtiquetaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="regla" role="list" aria-label="Vencimientos de los próximos días">
      @for (c of columnas(); track c.clave) {
        <div
          class="columna"
          role="listitem"
          [class.hoy]="c.hoy"
          [class.finde]="c.finDeSemana"
          [class.vencidos]="c.vencidos"
        >
          <div class="fecha">
            @if (c.vencidos) {
              <span class="dia">Vencidos</span>
              <span class="numero">{{ c.plazos.length }}</span>
            } @else {
              <span class="dia">{{ c.dia }}</span>
              <span class="numero">{{ c.numero }}</span>
              @if (c.numero === '01' || c.hoy) {
                <span class="mes">{{ c.mes }}</span>
              }
            }
          </div>
          <div class="marcas">
            @for (a of c.plazos.slice(0, visibles); track a.plazo.id) {
              <a
                class="marca"
                [class]="'marca r-' + a.riesgo.nivel"
                [routerLink]="['/expedientes', a.plazo.expedienteId]"
                [title]="
                  (a.plazo.tipo | etiqueta) +
                  ' · ' +
                  expedientes.codigo(a.plazo.expedienteId) +
                  ' · ' +
                  expedientes.titulo(a.plazo.expedienteId)
                "
              >
                <span class="tipo">{{ a.plazo.tipo | etiqueta: 'corta' }}</span>
                <span class="exp">{{ expedientes.codigo(a.plazo.expedienteId).slice(0, 10) }}</span>
              </a>
            }
            @if (c.plazos.length > visibles) {
              <span class="mas">+{{ c.plazos.length - visibles }}</span>
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
    const gravedad = ['CRITICO', 'ALTO', 'MEDIO', 'BAJO'];
    for (const lista of porFecha.values())
      lista.sort((x, y) => gravedad.indexOf(x.riesgo.nivel) - gravedad.indexOf(y.riesgo.nivel));
    const columnas: Columna[] = [];
    if (vencidos.length > 0) {
      columnas.push({
        clave: 'vencidos',
        dia: '',
        numero: '',
        mes: '',
        hoy: false,
        finDeSemana: false,
        vencidos: true,
        plazos: vencidos,
      });
    }
    for (let i = 0; i <= this.dias(); i++) {
      const fecha = sumarDias(hoy, i);
      const semana = new Date(`${fecha}T12:00:00Z`).getUTCDay();
      columnas.push({
        clave: fecha,
        dia: i === 0 ? 'Hoy' : INICIALES[semana],
        numero: fecha.slice(8, 10),
        mes: mesCorto(fecha),
        hoy: i === 0,
        finDeSemana: semana === 0 || semana === 6,
        vencidos: false,
        plazos: porFecha.get(fecha) ?? [],
      });
    }
    return columnas;
  });
}
