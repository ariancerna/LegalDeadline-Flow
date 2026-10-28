import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { AlertasStore } from '../../core/alertas.store';
import { ConsultasService } from '../../core/api/consultas.service';
import { PlazosService } from '../../core/api/plazos.service';
import { TareasService } from '../../core/api/tareas.service';
import { AuthService } from '../../core/auth/auth.service';
import { interpretarError } from '../../core/errores';
import { ExpedientesCache } from '../../core/expedientes.cache';
import { Evento, Indicadores, NivelRiesgo, Prioridad } from '../../core/models';
import { ResponsablesStore } from '../../core/responsables.store';
import { AvatarComponent } from '../../shared/avatar.component';
import { EtiquetaPipe } from '../../shared/etiqueta.pipe';
import { EVENTOS, nombreDesdeEmail } from '../../shared/eventos';
import { FechaPipe } from '../../shared/fecha.pipe';
import { fechaLarga, haceCuanto, hoyLima, sumarDias, textoDias } from '../../shared/fechas';
import { IconoComponent } from '../../shared/icono.component';
import { VacioComponent } from '../../shared/vacio.component';
import { DonaRiesgoComponent } from './dona-riesgo.component';

interface ItemAgenda {
  clave: string;
  tipo: 'plazo' | 'tarea';
  titulo: string;
  expedienteId: number;
  fecha: string;
  prioridad?: Prioridad;
  plazoId?: number;
}

interface DiaAgenda {
  fecha: string;
  etiqueta: string;
  items: ItemAgenda[];
}

/** RF17 / RF22: tablero con indicadores, riesgo, alertas, agenda, carga y actividad. */
@Component({
  selector: 'app-tablero',
  imports: [
    RouterLink,
    EtiquetaPipe,
    FechaPipe,
    IconoComponent,
    AvatarComponent,
    VacioComponent,
    DonaRiesgoComponent,
  ],
  templateUrl: './tablero.component.html',
  styleUrl: './tablero.component.scss',
})
export class TableroComponent implements OnInit {
  private readonly consultas = inject(ConsultasService);
  private readonly plazos = inject(PlazosService);
  private readonly tareas = inject(TareasService);
  protected readonly auth = inject(AuthService);
  protected readonly alertas = inject(AlertasStore);
  protected readonly responsables = inject(ResponsablesStore);
  protected readonly expedientes = inject(ExpedientesCache);
  protected readonly textoDias = textoDias;
  protected readonly haceCuanto = haceCuanto;
  protected readonly eventosInfo = EVENTOS;
  protected readonly nombreDesdeEmail = nombreDesdeEmail;

  protected readonly hoy = hoyLima();
  protected readonly fechaHoy = fechaLarga(this.hoy);
  protected readonly indicadores = signal<Indicadores | null>(null);
  protected readonly agenda = signal<DiaAgenda[] | null>(null);
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
    return `${parte}, ${nombre}`;
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
    if (partes.length === 0) return 'Todo en orden: no hay plazos críticos ni tareas vencidas.';
    return `Hoy requieren atención ${partes.join(' y ')}.`;
  });

  /** Nivel de riesgo de los plazos con alerta (crítico o alto). */
  private readonly nivelesAlerta = computed(
    () =>
      new Map<number, NivelRiesgo>(
        (this.alertas.lista() ?? []).map((a) => [a.plazo.id, a.riesgo.nivel]),
      ),
  );

  protected nivel(item: ItemAgenda): NivelRiesgo | undefined {
    return item.plazoId === undefined ? undefined : this.nivelesAlerta().get(item.plazoId);
  }

  protected readonly equipo = computed(() =>
    [...this.responsables.lista()].sort((a, b) => b.tareasActivas - a.tareasActivas).slice(0, 5),
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
    this.cargarAgenda();
    if (this.auth.puedeVerAuditoria()) {
      this.consultas.eventos({ size: 6 }).subscribe({
        next: (p) => this.actividad.set(p.content),
        error: () => this.actividad.set([]),
      });
    }
  }

  protected ancho(valor: number): number {
    return Math.min(100, (valor / this.escalaEquipo()) * 100);
  }

  /** Agenda: plazos y tareas activas que vencen en los próximos 14 días (y los ya vencidos). */
  private cargarAgenda(): void {
    const hasta = sumarDias(this.hoy, 14);
    const vacio = { content: [], totalElements: 0, totalPages: 0, number: 0, size: 0 };
    forkJoin([
      this.plazos.listar({ estado: 'ACTIVO', hasta, size: 50 }).pipe(catchError(() => of(vacio))),
      this.tareas
        .listar({ estado: 'PENDIENTE', hasta, size: 50 })
        .pipe(catchError(() => of(vacio))),
      this.tareas
        .listar({ estado: 'EN_PROGRESO', hasta, size: 50 })
        .pipe(catchError(() => of(vacio))),
    ]).subscribe(([plazos, pendientes, enProgreso]) => {
      const items: ItemAgenda[] = [
        ...plazos.content.map<ItemAgenda>((p) => ({
          clave: 'p' + p.id,
          tipo: 'plazo',
          titulo: p.tipo,
          expedienteId: p.expedienteId,
          fecha: p.fechaLimite,
          plazoId: p.id,
        })),
        ...[...pendientes.content, ...enProgreso.content].map<ItemAgenda>((t) => ({
          clave: 't' + t.id,
          tipo: 'tarea',
          titulo: t.titulo,
          expedienteId: t.expedienteId,
          fecha: t.fechaLimite,
          prioridad: t.prioridad,
        })),
      ];
      this.expedientes.cargar(items.map((i) => i.expedienteId));
      const grupos = new Map<string, ItemAgenda[]>();
      for (const item of items.sort((a, b) => a.fecha.localeCompare(b.fecha))) {
        const clave = item.fecha < this.hoy ? 'vencidos' : item.fecha;
        if (!grupos.has(clave)) grupos.set(clave, []);
        grupos.get(clave)!.push(item);
      }
      this.agenda.set(
        [...grupos.entries()].slice(0, 7).map(([fecha, lista]) => ({
          fecha,
          etiqueta:
            fecha === 'vencidos'
              ? 'Vencidos'
              : fecha === this.hoy
                ? 'Hoy'
                : fecha === sumarDias(this.hoy, 1)
                  ? 'Mañana'
                  : fechaLarga(fecha),
          items: lista,
        })),
      );
    });
  }
}
