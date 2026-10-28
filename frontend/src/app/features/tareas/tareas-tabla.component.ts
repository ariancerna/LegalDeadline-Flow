import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { LowerCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TareasService } from '../../core/api/tareas.service';
import { AuthService } from '../../core/auth/auth.service';
import { interpretarError } from '../../core/errores';
import { ExpedientesCache } from '../../core/expedientes.cache';
import { Tarea, TareaEstado } from '../../core/models';
import { NotificacionesService } from '../../core/notificaciones.service';
import { ResponsablesStore } from '../../core/responsables.store';
import { DialogoComponent } from '../../shared/dialogo.component';
import { EtiquetaPipe } from '../../shared/etiqueta.pipe';
import { tono } from '../../shared/etiquetas';
import { FechaPipe } from '../../shared/fecha.pipe';
import { hoyLima } from '../../shared/fechas';
import { TareaFormComponent } from './tarea-form.component';
import { TRANSICIONES, esActiva, requiereConfirmacion } from './transiciones';

/** Tabla de tareas con sus acciones: editar, cambiar estado (RF10) y cancelar (RF11). */
@Component({
  selector: 'app-tareas-tabla',
  imports: [
    FormsModule,
    LowerCasePipe,
    RouterLink,
    EtiquetaPipe,
    FechaPipe,
    DialogoComponent,
    TareaFormComponent,
  ],
  templateUrl: './tareas-tabla.component.html',
})
export class TareasTablaComponent {
  private readonly servicio = inject(TareasService);
  private readonly avisos = inject(NotificacionesService);
  protected readonly auth = inject(AuthService);
  protected readonly responsables = inject(ResponsablesStore);
  protected readonly expedientes = inject(ExpedientesCache);
  protected readonly tono = tono;
  protected readonly esActiva = esActiva;
  protected readonly hoy = hoyLima();

  readonly tareas = input.required<Tarea[]>();
  readonly mostrarExpediente = input(true);
  readonly cargando = input(false);
  /** Permite modificar (false cuando el expediente ya no está abierto). */
  readonly editable = input(true);
  readonly cambio = output<void>();

  protected readonly editando = signal<Tarea | null>(null);
  protected readonly cambiandoEstado = signal<Tarea | null>(null);
  protected readonly cancelando = signal<Tarea | null>(null);
  protected readonly nuevoEstado = signal<TareaEstado | null>(null);
  protected readonly confirmacion = signal(false);
  protected readonly enviando = signal(false);
  protected readonly errorDialogo = signal<string | null>(null);

  protected readonly opcionesEstado = computed(() => {
    const t = this.cambiandoEstado();
    return t ? TRANSICIONES[t.estado] : [];
  });
  protected readonly necesitaConfirmacion = computed(() => {
    const t = this.cambiandoEstado();
    const n = this.nuevoEstado();
    return !!t && !!n && requiereConfirmacion(t.prioridad, n);
  });

  constructor() {
    effect(() => {
      const ids = this.tareas().map((t) => t.expedienteId);
      if (this.mostrarExpediente()) untracked(() => this.expedientes.cargar(ids));
    });
  }

  protected puedeModificar(t: Tarea): boolean {
    // Un responsable solo recibe las tareas que puede modificar (AccesoService.estaAsignada).
    return this.editable() && esActiva(t.estado) && this.auth.puedeEscribir();
  }

  protected vencida(t: Tarea): boolean {
    return esActiva(t.estado) && t.fechaLimite < this.hoy;
  }

  protected abrirEstado(t: Tarea): void {
    this.cambiandoEstado.set(t);
    this.nuevoEstado.set(TRANSICIONES[t.estado][0] ?? null);
    this.confirmacion.set(false);
    this.errorDialogo.set(null);
  }

  protected abrirCancelar(t: Tarea): void {
    this.cancelando.set(t);
    this.errorDialogo.set(null);
  }

  protected guardarEstado(): void {
    const t = this.cambiandoEstado();
    const estado = this.nuevoEstado();
    if (!t || !estado) return;
    this.enviando.set(true);
    this.errorDialogo.set(null);
    this.servicio.cambiarEstado(t.id, estado, t.version, this.confirmacion()).subscribe({
      next: () => {
        this.avisos.exito(`Tarea movida a ${estado.replace('_', ' ').toLowerCase()}.`);
        this.terminar();
      },
      error: (e) => this.fallo(e),
    });
  }

  protected confirmarCancelar(): void {
    const t = this.cancelando();
    if (!t) return;
    this.enviando.set(true);
    this.servicio.cancelar(t.id, t.version).subscribe({
      next: () => {
        this.avisos.exito('Tarea cancelada. Se conserva en el historial.');
        this.terminar();
      },
      error: (e) => this.fallo(e),
    });
  }

  protected editada(): void {
    this.editando.set(null);
    this.cambio.emit();
  }

  private terminar(): void {
    this.enviando.set(false);
    this.cambiandoEstado.set(null);
    this.cancelando.set(null);
    this.responsables.recargar().subscribe({ error: () => undefined });
    this.cambio.emit();
  }

  private fallo(e: unknown): void {
    const err = interpretarError(e);
    this.errorDialogo.set(err.mensaje);
    this.enviando.set(false);
    if (err.codigo === 'VERSION_DESACTUALIZADA') this.cambio.emit();
  }
}
