import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ExpedientesService } from '../../core/api/expedientes.service';
import { PlazosService } from '../../core/api/plazos.service';
import { AuthService } from '../../core/auth/auth.service';
import { interpretarError } from '../../core/errores';
import { ExpedientesCache } from '../../core/expedientes.cache';
import { Expediente, Plazo, Tarea } from '../../core/models';
import { NotificacionesService } from '../../core/notificaciones.service';
import { ResponsablesStore } from '../../core/responsables.store';
import { DialogoComponent } from '../../shared/dialogo.component';
import { EtiquetaPipe } from '../../shared/etiqueta.pipe';
import { tono } from '../../shared/etiquetas';
import { FechaPipe } from '../../shared/fecha.pipe';
import { PlazoFormComponent } from '../plazos/plazo-form.component';
import { PlazosTablaComponent } from '../plazos/plazos-tabla.component';
import { TareaFormComponent } from '../tareas/tarea-form.component';
import { TareasTablaComponent } from '../tareas/tareas-tabla.component';
import { esActiva } from '../tareas/transiciones';
import { ExpedienteFormComponent } from './expediente-form.component';

type Accion = 'editar' | 'cerrar' | 'archivar' | 'tarea' | 'plazo';

/** Detalle de un expediente con sus tareas y plazos (RF05, RF06, RF11, RF12). */
@Component({
  selector: 'app-expediente-detalle',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    EtiquetaPipe,
    FechaPipe,
    DialogoComponent,
    ExpedienteFormComponent,
    TareasTablaComponent,
    TareaFormComponent,
    PlazosTablaComponent,
    PlazoFormComponent,
  ],
  templateUrl: './expediente-detalle.component.html',
})
export class ExpedienteDetalleComponent implements OnInit {
  private readonly servicio = inject(ExpedientesService);
  private readonly plazosServicio = inject(PlazosService);
  private readonly avisos = inject(NotificacionesService);
  private readonly cache = inject(ExpedientesCache);
  protected readonly auth = inject(AuthService);
  protected readonly responsables = inject(ResponsablesStore);
  protected readonly tono = tono;

  /** Parámetro :id de la ruta (withComponentInputBinding). */
  readonly id = input.required<string>();

  protected readonly expediente = signal<Expediente | null>(null);
  protected readonly tareas = signal<Tarea[]>([]);
  protected readonly plazos = signal<Plazo[]>([]);
  protected readonly pestana = signal<'tareas' | 'plazos'>('tareas');
  protected readonly accion = signal<Accion | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly errorAccion = signal<string | null>(null);
  protected readonly enviando = signal(false);

  protected readonly abierto = computed(() => this.expediente()?.estado === 'ABIERTO');
  protected readonly tareasActivas = computed(
    () => this.tareas().filter((t) => esActiva(t.estado)).length,
  );
  protected readonly plazosActivos = computed(
    () => this.plazos().filter((p) => p.estado === 'ACTIVO').length,
  );
  /** RN10: no se puede cerrar ni archivar con tareas o plazos activos. */
  protected readonly tienePendientes = computed(
    () => this.tareasActivas() + this.plazosActivos() > 0,
  );

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    const id = Number(this.id());
    this.error.set(null);
    this.servicio.obtener(id).subscribe({
      next: (e) => {
        this.expediente.set(e);
        this.cache.registrar(e.id, e.codigo);
      },
      error: (e) => this.error.set(interpretarError(e).mensaje),
    });
    this.servicio.tareas(id).subscribe({ next: (t) => this.tareas.set(t), error: () => undefined });
    this.plazosServicio.listar({ expedienteId: id, size: 100 }).subscribe({
      next: (p) => this.plazos.set(p.content),
      error: () => undefined,
    });
  }

  protected abrir(accion: Accion): void {
    this.errorAccion.set(null);
    this.accion.set(accion);
  }

  protected terminado(): void {
    this.accion.set(null);
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
