import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AlertasStore } from '../../core/alertas.store';
import { ConsultasService } from '../../core/api/consultas.service';
import { AuthService } from '../../core/auth/auth.service';
import { interpretarError } from '../../core/errores';
import { ExpedientesCache } from '../../core/expedientes.cache';
import { Evento, Indicadores, NIVELES_RIESGO } from '../../core/models';
import { ResponsablesStore } from '../../core/responsables.store';
import { EtiquetaPipe } from '../../shared/etiqueta.pipe';
import { EVENTOS, detalleLegible } from '../../shared/eventos';
import {
  fechaLarga,
  haceCuanto,
  hoyLima,
  mesCorto,
  nombreMes,
  sumarDias,
  textoDias,
} from '../../shared/fechas';
import { ContadorDirective } from '../../shared/contador.directive';
import { GraficoColumnasComponent, SerieColumnas } from '../../shared/grafico-columnas.component';
import { PlazosService } from '../../core/api/plazos.service';
import { IconoComponent } from '../../shared/icono.component';
import { VacioComponent } from '../../shared/vacio.component';
import { LineaVencimientosComponent } from './linea-vencimientos.component';

const DIAS_SEMANA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/** RF17 / RF22: tablero como registro de vencimientos del estudio. */
@Component({
  selector: 'app-tablero',
  imports: [
    RouterLink,
    EtiquetaPipe,
    IconoComponent,
    VacioComponent,
    LineaVencimientosComponent,
    GraficoColumnasComponent,
    ContadorDirective,
  ],
  templateUrl: './tablero.component.html',
  styleUrl: './tablero.component.scss',
})
export class TableroComponent implements OnInit {
  private readonly consultas = inject(ConsultasService);
  private readonly plazos = inject(PlazosService);
  protected readonly auth = inject(AuthService);
  protected readonly alertas = inject(AlertasStore);
  protected readonly responsables = inject(ResponsablesStore);
  protected readonly expedientes = inject(ExpedientesCache);
  protected readonly textoDias = textoDias;
  protected readonly haceCuanto = haceCuanto;
  protected readonly mesCorto = mesCorto;
  protected readonly eventosInfo = EVENTOS;
  protected readonly detalleLegible = detalleLegible;
  protected readonly niveles = NIVELES_RIESGO;

  protected readonly hoy = hoyLima();
  protected readonly fechaHoy = capitalizar(fechaLarga(this.hoy));
  protected readonly indicadores = signal<Indicadores | null>(null);
  protected readonly actividad = signal<Evento[] | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly resumen = computed(() => {
    const i = this.indicadores();
    if (!i) return '';
    const criticos = i.riesgoPlazosActivos.CRITICO ?? 0;
    const partes: string[] = [];
    if (criticos > 0)
      partes.push(`${criticos} ${criticos === 1 ? 'plazo crítico' : 'plazos críticos'}`);
    if (i.tareasVencidas > 0)
      partes.push(
        `${i.tareasVencidas} ${i.tareasVencidas === 1 ? 'tarea vencida' : 'tareas vencidas'}`,
      );
    if (partes.length === 0)
      return 'Sin plazos críticos ni tareas vencidas: la cartera está al día.';
    return `Requieren atención: ${partes.join(' y ')}.`;
  });

  /** El plazo más urgente: el primero de la campana (crítico o alto, ordenado por días). */
  protected readonly urgente = computed(() => this.alertas.lista()?.[0] ?? null);

  /** Ingresos y conclusiones de los últimos 12 meses. */
  protected readonly movimiento = computed(() => {
    const m = this.indicadores()?.movimientoMensual;
    if (!m) return null;
    return {
      categorias: m.map((x, i) =>
        i === 0 || x.mes.endsWith('-01')
          ? `${mesCorto(x.mes + '-01')} ${x.mes.slice(2, 4)}`
          : mesCorto(x.mes + '-01'),
      ),
      detalles: m.map((x) => `${nombreMes(Number(x.mes.slice(5, 7)) - 1)} de ${x.mes.slice(0, 4)}`),
      series: [
        { nombre: 'Ingresados', color: 'var(--serie-1)', valores: m.map((x) => x.ingresados) },
        { nombre: 'Concluidos', color: 'var(--serie-2)', valores: m.map((x) => x.concluidos) },
      ] as SerieColumnas[],
    };
  });

  /** Plazos activos de las próximas 8 semanas (de lunes a domingo). */
  protected readonly semanas = signal<{
    categorias: string[];
    detalles: string[];
    series: SerieColumnas[];
  } | null>(null);

  /** Registro: plazos del horizonte, primero los vencidos. */
  protected readonly registro = computed(() => (this.alertas.proximos() ?? []).slice(0, 10));

  protected readonly totalRiesgo = computed(() => {
    const r = this.indicadores()?.riesgoPlazosActivos ?? {};
    return NIVELES_RIESGO.reduce((s, n) => s + (r[n] ?? 0), 0);
  });

  protected readonly equipo = computed(() =>
    [...this.responsables.lista()].sort((a, b) => b.tareasActivas - a.tareasActivas).slice(0, 6),
  );
  protected readonly escalaEquipo = computed(() =>
    Math.max(6, ...this.equipo().map((r) => Math.max(r.tareasActivas, r.umbral + 1))),
  );

  ngOnInit(): void {
    this.consultas.indicadores().subscribe({
      next: (i) => this.indicadores.set(i),
      error: (e) => this.error.set(interpretarError(e).mensaje),
    });
    this.alertas.recargar();
    this.cargarSemanas();
    if (this.auth.puedeVerAuditoria()) {
      this.consultas.eventos({ size: 6 }).subscribe({
        next: (p) => this.actividad.set(p.content),
        error: () => this.actividad.set([]),
      });
    }
  }

  private cargarSemanas(): void {
    const dia = (new Date(`${this.hoy}T12:00:00Z`).getUTCDay() + 6) % 7; // lunes = 0
    const lunes = sumarDias(this.hoy, -dia);
    const fin = sumarDias(lunes, 8 * 7 - 1);
    this.plazos.listarTodo({ estado: 'ACTIVO', desde: lunes, hasta: fin }).subscribe({
      next: (plazos) => {
        const conteo = new Array(8).fill(0);
        for (const p of plazos) {
          const semana = Math.floor(diasEntre(lunes, p.fechaLimite) / 7);
          if (semana >= 0 && semana < 8) conteo[semana]++;
        }
        const inicios = conteo.map((_, i) => sumarDias(lunes, i * 7));
        this.semanas.set({
          categorias: inicios.map((f, i) =>
            i === 0 ? 'Esta' : `${Number(f.slice(8, 10))} ${mesCorto(f)}`,
          ),
          detalles: inicios.map(
            (f) =>
              `Semana del ${Number(f.slice(8, 10))} ${mesCorto(f)} al ${Number(sumarDias(f, 6).slice(8, 10))} ${mesCorto(sumarDias(f, 6))}`,
          ),
          series: [{ nombre: 'Plazos', color: 'var(--serie-1)', valores: conteo }],
        });
      },
      error: () => this.semanas.set(null),
    });
  }

  protected cantidad(nivel: string): number {
    const r = this.indicadores()?.riesgoPlazosActivos ?? {};
    return r[nivel as keyof typeof r] ?? 0;
  }

  protected porcentaje(nivel: string): number {
    const t = this.totalRiesgo();
    return t === 0 ? 0 : (this.cantidad(nivel) / t) * 100;
  }

  protected ancho(valor: number): number {
    return Math.min(100, (valor / this.escalaEquipo()) * 100);
  }

  protected diaSemana(fecha: string): string {
    return DIAS_SEMANA[new Date(`${fecha}T12:00:00Z`).getUTCDay()];
  }
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function diasEntre(desde: string, hasta: string): number {
  return Math.round(
    (Date.parse(`${hasta}T12:00:00Z`) - Date.parse(`${desde}T12:00:00Z`)) / 86400000,
  );
}
