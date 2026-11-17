import { LowerCasePipe } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { Component, OnDestroy, OnInit, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AlertasStore } from '../../services/alertas.store';
import { ConsultasService } from '../../services/api/consultas.service';
import { ExpedientesService } from '../../services/api/expedientes.service';
import { PlazosService } from '../../services/api/plazos.service';
import { AuthService } from '../../services/auth/auth.service';
import { interpretarError } from '../../services/errores';
import { ExpedientesCache } from '../../services/expedientes.cache';
import { Evento } from '../../models/evento';
import { Expediente } from '../../models/expediente';
import { Plazo } from '../../models/plazo';
import { Tarea } from '../../models/tarea';
import { NotificacionesService } from '../../services/notificaciones.service';
import { ResponsablesStore } from '../../services/responsables.store';
import { AsuntoPipe } from '../../utils/asunto.pipe';
import { AvatarComponent } from '../../components/avatar/avatar';
import { DialogoComponent } from '../../components/dialogo/dialogo';
import { EtiquetaPipe } from '../../utils/etiqueta.pipe';
import { tono } from '../../utils/etiquetas';
import { EVENTOS, detalleLegible } from '../../utils/eventos';
import { FechaPipe } from '../../utils/fecha.pipe';
import { diasHasta, haceCuanto, hoyLima, textoDias } from '../../utils/fechas';
import { IconoComponent } from '../../components/icono/icono';
import { VacioComponent } from '../../components/vacio/vacio';
import { PlazoFormComponent } from '../formulario-plazo/formulario-plazo';
import { PlazosTablaComponent } from '../../components/plazos-tabla/plazos-tabla';
import { TareaFormComponent } from '../formulario-tarea/formulario-tarea';
import { TareasTablaComponent } from '../../components/tareas-tabla/tareas-tabla';
import { esActiva } from '../../utils/transiciones';
import { ExpedienteFormComponent } from '../formulario-expediente/formulario-expediente';

type Accion = 'editar' | 'cerrar' | 'archivar' | 'tarea' | 'plazo';
type Pestana = 'tareas' | 'plazos' | 'actividad';

/** Detalle de un expediente con sus tareas, plazos e historial (RF05, RF06, RF11, RF12, RF18). */
@Component({
  selector: 'app-expediente-detalle',
  imports: [
    LowerCasePipe,
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
    AsuntoPipe,
  ],
  templateUrl: './detalle-expediente.html',
  styleUrl: './detalle-expediente.scss',
})
export class ExpedienteDetalleComponent implements OnInit, OnDestroy {
  private readonly servicio = inject(ExpedientesService);
  private readonly plazosServicio = inject(PlazosService);
  private readonly consultas = inject(ConsultasService);
  private readonly avisos = inject(NotificacionesService);
  private readonly cache = inject(ExpedientesCache);
  private readonly tituloPagina = inject(Title);
  private readonly alertas = inject(AlertasStore);
  protected readonly auth = inject(AuthService);
  protected readonly responsables = inject(ResponsablesStore);
  protected readonly tono = tono;
  protected readonly eventosInfo = EVENTOS;
  protected readonly detalleLegible = detalleLegible;
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

  ngOnDestroy(): void {}

  protected dias(p: Plazo): number {
    return diasHasta(p.fechaLimite, this.hoy);
  }

  protected abs(n: number): number {
    return Math.abs(n);
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
        this.cache.registrar(e.id, e.codigo, e.asunto);
        // La pestaña del navegador muestra el número del expediente abierto.
        this.tituloPagina.setTitle(`${e.codigo} · LegalDeadline Flow`);
      },
      error: (e) => this.error.set(interpretarError(e).mensaje),
    });
    this.servicio
      .tareas(id)
      .subscribe({ next: (t) => this.tareas.set(ordenarTareas(t)), error: () => undefined });
    this.plazosServicio.listar({ expedienteId: id, size: 100 }).subscribe({
      next: (p) => this.plazos.set(p.content),
      error: () => undefined,
    });
    if (this.eventos() !== null) this.cargarActividad();
  }

  /** Historial del expediente: la API devuelve sus eventos y los de sus tareas y plazos. */
  private cargarActividad(): void {
    if (!this.auth.puedeVerAuditoria()) return;
    this.consultas.eventos({ expedienteId: Number(this.id()), size: 100 }).subscribe({
      next: (p) => this.eventos.set(p.content),
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

/** Primero las activas por fecha de vencimiento; al final las cerradas y canceladas. */
function ordenarTareas(lista: Tarea[]): Tarea[] {
  return [...lista].sort(
    (a, b) =>
      Number(!esActiva(a.estado)) - Number(!esActiva(b.estado)) ||
      a.fechaLimite.localeCompare(b.fechaLimite),
  );
}
