import { DecimalPipe } from '@angular/common';
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
import { fechaLarga, haceCuanto, hoyLima, mesCorto, textoDias } from '../../shared/fechas';
import { IconoComponent } from '../../shared/icono.component';
import { VacioComponent } from '../../shared/vacio.component';
import { LineaVencimientosComponent } from './linea-vencimientos.component';

const DIAS_SEMANA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/** RF17 / RF22: tablero como registro de vencimientos del estudio. */
@Component({
  selector: 'app-tablero',
  imports: [
    RouterLink,
    DecimalPipe,
    EtiquetaPipe,
    IconoComponent,
    VacioComponent,
    LineaVencimientosComponent,
  ],
  templateUrl: './tablero.component.html',
  styleUrl: './tablero.component.scss',
})
export class TableroComponent implements OnInit {
  private readonly consultas = inject(ConsultasService);
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
  protected readonly fechaHoy = fechaLarga(this.hoy);
  protected readonly indicadores = signal<Indicadores | null>(null);
  protected readonly actividad = signal<Evento[] | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly saludo = computed(() => {
    const hora = Number(
      new Intl.DateTimeFormat('en-GB', {
        hour: 'numeric',
        hour12: false,
        timeZone: 'America/Lima',
      }).format(new Date()),
    );
    const parte = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';
    const nombre = this.auth.usuario()?.nombre.split(' ')[0] ?? '';
    return `${parte}, ${nombre}.`;
  });

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
      return 'Sin plazos críticos ni tareas vencidas. La cartera está al día.';
    return `Requieren atención hoy: ${partes.join(' y ')}.`;
  });

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
    if (this.auth.puedeVerAuditoria()) {
      this.consultas.eventos({ size: 6 }).subscribe({
        next: (p) => this.actividad.set(p.content),
        error: () => this.actividad.set([]),
      });
    }
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
