import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Alerta } from '../../services/alertas.store';
import { ExpedientesCache } from '../../services/expedientes.cache';
import { EtiquetaPipe } from '../../utils/etiqueta.pipe';
import { etiqueta } from '../../utils/etiquetas';
import { sumarDias } from '../../utils/fechas';

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
  templateUrl: './linea-vencimientos.html',
  styleUrl: './linea-vencimientos.scss',
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
