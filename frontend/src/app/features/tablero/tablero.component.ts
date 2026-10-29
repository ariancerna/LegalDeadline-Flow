import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Alerta, AlertasStore } from '../../core/alertas.store';
import { ConsultasService } from '../../core/api/consultas.service';
import { ExpedientesService } from '../../core/api/expedientes.service';
import { PlazosService } from '../../core/api/plazos.service';
import { AuthService } from '../../core/auth/auth.service';
import { interpretarError } from '../../core/errores';
import { ExpedientesCache } from '../../core/expedientes.cache';
import { Evento, Expediente, Indicadores, NIVELES_RIESGO, NivelRiesgo } from '../../core/models';
import { ResponsablesStore } from '../../core/responsables.store';
import { AvatarComponent } from '../../shared/avatar.component';
import { CifraPipe } from '../../shared/cifra';
import { ContadorDirective } from '../../shared/contador.directive';
import { EtiquetaPipe } from '../../shared/etiqueta.pipe';
import { EVENTOS, detalleLegible } from '../../shared/eventos';
import {
  fechaLarga,
  formatoFecha,
  haceCuanto,
  hoyLima,
  mesCorto,
  nombreMes,
  sumarDias,
  textoDias,
} from '../../shared/fechas';
import { GraficoColumnasComponent, SerieColumnas } from '../../shared/grafico-columnas.component';
import { IconoComponent } from '../../shared/icono.component';
import { VacioComponent } from '../../shared/vacio.component';
import { LineaVencimientosComponent } from './linea-vencimientos.component';

/** Casillas de la barra de carga: cada una es una tarea activa. */
const CASILLAS = 12;
/** Ancho de una casilla más su separación, en píxeles. */
const PASO_CASILLA = 16;

interface DatosGrafico {
  categorias: string[];
  subetiquetas: string[];
  detalles: string[];
  series: SerieColumnas[];
}

/** RF17 / RF22: tablero del supervisor (diseño «Tablero Supervisor»). */
@Component({
  selector: 'app-tablero',
  imports: [
    RouterLink,
    EtiquetaPipe,
    CifraPipe,
    IconoComponent,
    AvatarComponent,
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
  private readonly expedientesApi = inject(ExpedientesService);
  protected readonly auth = inject(AuthService);
  protected readonly alertas = inject(AlertasStore);
  protected readonly responsables = inject(ResponsablesStore);
  protected readonly expedientes = inject(ExpedientesCache);
  protected readonly textoDias = textoDias;
  protected readonly haceCuanto = haceCuanto;
  protected readonly formatoFecha = formatoFecha;
  protected readonly eventosInfo = EVENTOS;
  protected readonly detalleLegible = detalleLegible;
  protected readonly niveles = NIVELES_RIESGO;
  protected readonly pasoCasilla = PASO_CASILLA;

  protected readonly hoy = hoyLima();
  protected readonly fechaHoy = capitalizar(fechaLarga(this.hoy));
  protected readonly indicadores = signal<Indicadores | null>(null);
  protected readonly actividad = signal<Evento[] | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly criticos = computed(
    () => this.indicadores()?.riesgoPlazosActivos.CRITICO ?? 0,
  );

  /** El plazo más urgente: el primero de la campana (crítico o alto, ordenado por días). */
  protected readonly urgente = computed(() => this.alertas.lista()?.[0] ?? null);
  /** Expediente del plazo más urgente, para mostrar su responsable y sus tareas. */
  protected readonly expedienteUrgente = signal<Expediente | null>(null);

  /** Texto del sello: «VENCIÓ / HACE 6 DÍAS», «VENCE / HOY» o «VENCE EN / 2 DÍAS». */
  protected readonly sello = computed<[string, string] | null>(() => {
    const u = this.urgente();
    if (!u) return null;
    const d = u.riesgo.diasRestantes;
    const n = Math.abs(d);
    const dias = `${n} ${n === 1 ? 'DÍA' : 'DÍAS'}`;
    if (d < 0) return ['VENCIÓ', `HACE ${dias}`];
    if (d === 0) return ['VENCE', 'HOY'];
    if (d === 1) return ['VENCE', 'MAÑANA'];
    return ['VENCE EN', dias];
  });

  /** Ingresos y conclusiones de los últimos 12 meses. */
  protected readonly movimiento = computed<DatosGrafico | null>(() => {
    const m = this.indicadores()?.movimientoMensual;
    if (!m) return null;
    return {
      categorias: m.map((x) => mesCorto(x.mes + '-01')),
      // El año aparece bajo el primer mes y bajo cada enero.
      subetiquetas: m.map((x, i) => (i === 0 || x.mes.endsWith('-01') ? x.mes.slice(0, 4) : '')),
      detalles: m.map(
        (x) => `${capitalizar(nombreMes(Number(x.mes.slice(5, 7)) - 1))} ${x.mes.slice(0, 4)}`,
      ),
      series: [
        { nombre: 'Ingresados', color: 'var(--serie-1)', valores: m.map((x) => x.ingresados) },
        { nombre: 'Concluidos', color: 'var(--serie-2)', valores: m.map((x) => x.concluidos) },
      ],
    };
  });

  /** Plazos activos de las próximas 8 semanas, desde hoy. */
  protected readonly semanas = signal<DatosGrafico | null>(null);

  /** Agenda: plazos del horizonte, primero los vencidos. */
  protected readonly registro = computed(() => (this.alertas.proximos() ?? []).slice(0, 12));

  protected readonly totalRiesgo = computed(() => {
    const r = this.indicadores()?.riesgoPlazosActivos ?? {};
    return NIVELES_RIESGO.reduce((s, n) => s + (r[n] ?? 0), 0);
  });

  /** Los seis responsables con más tareas activas, con una casilla por tarea. */
  protected readonly equipo = computed(() =>
    [...this.responsables.lista()]
      .sort((a, b) => b.tareasActivas - a.tareasActivas)
      .slice(0, 6)
      .map((r) => ({
        ...r,
        exceso: r.tareasActivas - r.umbral,
        casillas: Array.from({ length: CASILLAS }, (_, i) =>
          i < Math.min(r.tareasActivas, r.umbral) ? 'dentro' : i < r.tareasActivas ? 'fuera' : '',
        ),
      })),
  );
  protected readonly umbral = computed(() => this.equipo()[0]?.umbral ?? 5);

  constructor() {
    // Al cambiar el plazo más urgente se consulta su expediente (responsable y tareas activas).
    effect(() => {
      const id = this.urgente()?.plazo.expedienteId;
      if (id === undefined || this.expedienteUrgente()?.id === id) return;
      this.expedientesApi.obtener(id).subscribe({
        next: (e) => this.expedienteUrgente.set(e),
        error: () => this.expedienteUrgente.set(null),
      });
    });
  }

  ngOnInit(): void {
    this.consultas.indicadores().subscribe({
      next: (i) => this.indicadores.set(i),
      error: (e) => this.error.set(interpretarError(e).mensaje),
    });
    this.alertas.recargar();
    this.responsables.asegurar();
    this.cargarSemanas();
    if (this.auth.puedeVerAuditoria()) {
      this.consultas.eventos({ size: 6 }).subscribe({
        next: (p) => this.actividad.set(p.content),
        error: () => this.actividad.set([]),
      });
    }
  }

  private cargarSemanas(): void {
    const fin = sumarDias(this.hoy, 8 * 7 - 1);
    this.plazos.listarTodo({ estado: 'ACTIVO', desde: this.hoy, hasta: fin }).subscribe({
      next: (plazos) => {
        const conteo = new Array(8).fill(0);
        for (const p of plazos) {
          const semana = Math.floor(diasEntre(this.hoy, p.fechaLimite) / 7);
          if (semana >= 0 && semana < 8) conteo[semana]++;
        }
        const inicios = conteo.map((_, i) => sumarDias(this.hoy, i * 7));
        const corta = (f: string) => `${f.slice(8, 10)}/${f.slice(5, 7)}`;
        this.semanas.set({
          categorias: inicios.map((f) => `${f.slice(8, 10)} ${mesCorto(f)}`),
          subetiquetas: inicios.map((_, i) => (i === 0 ? 'esta' : '')),
          detalles: inicios.map((f) => `Semana ${corta(f)} – ${corta(sumarDias(f, 6))}`),
          series: [{ nombre: 'Plazos', color: 'var(--serie-1)', valores: conteo }],
        });
      },
      error: () => this.semanas.set(null),
    });
  }

  protected cantidad(nivel: NivelRiesgo): number {
    return this.indicadores()?.riesgoPlazosActivos[nivel] ?? 0;
  }

  protected porcentaje(nivel: NivelRiesgo): number {
    const t = this.totalRiesgo();
    return t === 0 ? 0 : (this.cantidad(nivel) / t) * 100;
  }

  protected textoRiesgo(): string {
    return NIVELES_RIESGO.map((n) => `${this.cantidad(n)} ${n.toLowerCase()}`).join(', ');
  }

  protected mesDe(a: Alerta): string {
    return a.plazo.fechaLimite === this.hoy ? 'hoy' : mesCorto(a.plazo.fechaLimite);
  }

  /** «8 plazos críticos» lleva a la agenda, donde aparecen primero los vencidos. */
  protected irAgenda(): void {
    document.getElementById('agenda')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
