import { Component, OnDestroy, OnInit, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AlertasStore } from '../../core/alertas.store';
import { ConsultasService } from '../../core/api/consultas.service';
import { ExpedientesService } from '../../core/api/expedientes.service';
import { PlazosService } from '../../core/api/plazos.service';
import { AuthService } from '../../core/auth/auth.service';
import { interpretarError } from '../../core/errores';
import { ExpedientesCache } from '../../core/expedientes.cache';
import { MigasService } from '../../core/migas.service';
import { Evento, Expediente, Plazo, Tarea } from '../../core/models';
import { NotificacionesService } from '../../core/notificaciones.service';
import { ResponsablesStore } from '../../core/responsables.store';
import { AvatarComponent } from '../../shared/avatar.component';
import { DialogoComponent } from '../../shared/dialogo.component';
import { EtiquetaPipe } from '../../shared/etiqueta.pipe';
import { tono } from '../../shared/etiquetas';
import { EVENTOS, nombreDesdeEmail } from '../../shared/eventos';
import { FechaPipe } from '../../shared/fecha.pipe';
import { diasHasta, haceCuanto, hoyLima, textoDias } from '../../shared/fechas';
import { IconoComponent } from '../../shared/icono.component';
import { VacioComponent } from '../../shared/vacio.component';
import { PlazoFormComponent } from '../plazos/plazo-form.component';
import { PlazosTablaComponent } from '../plazos/plazos-tabla.component';
import { TareaFormComponent } from '../tareas/tarea-form.component';
import { TareasTablaComponent } from '../tareas/tareas-tabla.component';
import { esActiva } from '../tareas/transiciones';
import { ExpedienteFormComponent } from './expediente-form.component';

type Accion = 'editar' | 'cerrar' | 'archivar' | 'tarea' | 'plazo';
type Pestana = 'tareas' | 'plazos' | 'actividad';

/** Detalle de un expediente con sus tareas, plazos e historial (RF05, RF06, RF11, RF12, RF18). */
@Component({
  selector: 'app-expediente-detalle',
  imports: [
    RouterLink,
    EtiquetaPipe,
    FechaPipe,
    DialogoComponent,
    ExpedienteFormComponent,
    TareasTablaComponent,
    TareaFormComponent,
    PlazosTablaComponent,
    PlazoFormComponent,
    IconoComponent,
    AvatarComponent,
    VacioComponent,
  ],
  templateUrl: './expediente-detalle.component.html',
  styleUrl: './expediente-detalle.component.scss',
})
export class ExpedienteDetalleComponent implements OnInit, OnDestroy {
  private readonly servicio = inject(ExpedientesService);
  private readonly plazosServicio = inject(PlazosService);
  private readonly consultas = inject(ConsultasService);
  private readonly avisos = inject(NotificacionesService);
  private readonly cache = inject(ExpedientesCache);
  private readonly migas = inject(MigasService);
  private readonly alertas = inject(AlertasStore);
  protected readonly auth = inject(AuthService);
  protected readonly responsables = inject(ResponsablesStore);
  protected readonly tono = tono;
  protected readonly eventosInfo = EVENTOS;
  protected readonly nombreDesdeEmail = nombreDesdeEmail;
  protected readonly haceCuanto = haceCuanto;
  protected readonly textoDias = textoDias;
  private readonly hoy = hoyLima();

  /** Parámetro :id de la ruta (withComponentInputBinding). */
  readonly id = input.required<string>();

  protected readonly expediente = signal<Expediente | null>(null);
  protected readonly tareas = signal<Tarea[]>([]);
  protected readonly plazos = signal<Plazo[]>([]);
  protected readonly eventos = signal<Evento[] | null>(null);
  protected readonly pestana = signal<Pestana>('tareas');
  protected readonly accion = signal<Accion | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly errorAccion = signal<string | null>(null);
  protected readonly enviando = signal(false);

  protected readonly abierto = computed(() => this.expediente()?.estado === 'ABIERTO');
  protected readonly tareasActivas = computed(
    () => this.tareas().filter((t) => esActiva(t.estado)).length,
  );
  protected readonly tareasCerradas = computed(
    () => this.tareas().filter((t) => t.estado === 'CERRADA').length,
  );
  protected readonly plazosActivos = computed(() =>
    this.plazos().filter((p) => p.estado === 'ACTIVO'),
  );
  /** RN10: no se puede cerrar ni archivar con tareas o plazos activos. */
  protected readonly tienePendientes = computed(
    () => this.tareasActivas() + this.plazosActivos().length > 0,
  );
  protected readonly progreso = computed(() => {
    const consideradas = this.tareasActivas() + this.tareasCerradas();
    return consideradas === 0 ? 0 : Math.round((this.tareasCerradas() / consideradas) * 100);
  });
  protected readonly proximos = computed(() =>
    [...this.plazosActivos()]
      .sort((a, b) => a.fechaLimite.localeCompare(b.fechaLimite))
      .slice(0, 4),
  );

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.migas.detalle.set(null);
  }

  protected dias(p: Plazo): number {
    return diasHasta(p.fechaLimite, this.hoy);
  }

  protected cambiarPestana(p: Pestana): void {
    this.pestana.set(p);
    if (p === 'actividad' && this.eventos() === null) this.cargarActividad();
  }

  protected cargar(): void {
    const id = Number(this.id());
    this.error.set(null);
    this.servicio.obtener(id).subscribe({
      next: (e) => {
        this.expediente.set(e);
        this.cache.registrar(e.id, e.codigo);
        this.migas.detalle.set(e.codigo);
      },
      error: (e) => this.error.set(interpretarError(e).mensaje),
    });
    this.servicio.tareas(id).subscribe({ next: (t) => this.tareas.set(t), error: () => undefined });
    this.plazosServicio.listar({ expedienteId: id, size: 100 }).subscribe({
      next: (p) => this.plazos.set(p.content),
      error: () => undefined,
    });
    if (this.eventos() !== null) this.cargarActividad();
  }

  /**
   * Historial del expediente: eventos del propio expediente y de sus tareas y plazos.
   * La API filtra por tipo, usuario y fecha; aquí se filtran los recursos de este expediente.
   */
  private cargarActividad(): void {
    if (!this.auth.puedeVerAuditoria()) return;
    const id = Number(this.id());
    this.consultas.eventos({ size: 100 }).subscribe({
      next: (p) => {
        const tareas = new Set(this.tareas().map((t) => t.id));
        const plazos = new Set(this.plazos().map((x) => x.id));
        this.eventos.set(
          p.content.filter(
            (e) =>
              (e.recurso === 'EXPEDIENTE' && e.recursoId === id) ||
              (e.recurso === 'TAREA' && tareas.has(e.recursoId)) ||
              (e.recurso === 'PLAZO' && plazos.has(e.recursoId)),
          ),
        );
      },
      error: () => this.eventos.set([]),
    });
  }

  protected abrir(accion: Accion): void {
    this.errorAccion.set(null);
    this.accion.set(accion);
  }

  protected terminado(): void {
    this.accion.set(null);
    this.alertas.recargar();
    this.cargar();
  }

  protected finalizar(tipo: 'cerrar' | 'archivar'): void {
    const e = this.expediente();
    if (!e) return;
    const peticion =
      tipo === 'cerrar'
        ? this.servicio.cerrar(e.id, e.version)
        : this.servicio.archivar(e.id, e.version);
    this.enviando.set(true);
    this.errorAccion.set(null);
    peticion.subscribe({
      next: () => {
        this.avisos.exito(tipo === 'cerrar' ? 'Expediente cerrado.' : 'Expediente archivado.');
        this.enviando.set(false);
        this.terminado();
      },
      error: (err) => {
        this.errorAccion.set(interpretarError(err).mensaje);
        this.enviando.set(false);
      },
    });
  }
}
