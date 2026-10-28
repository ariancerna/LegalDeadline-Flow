import { Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ExpedientesCache } from '../../core/expedientes.cache';
import { Tarea } from '../../core/models';
import { ResponsablesStore } from '../../core/responsables.store';
import { AvatarComponent } from '../../shared/avatar.component';
import { DialogoComponent } from '../../shared/dialogo.component';
import { EtiquetaPipe } from '../../shared/etiqueta.pipe';
import { tono } from '../../shared/etiquetas';
import { FechaPipe } from '../../shared/fecha.pipe';
import { diasHasta, hoyLima, textoDias } from '../../shared/fechas';
import { IconoComponent } from '../../shared/icono.component';
import { CambioEstadoComponent } from './cambio-estado.component';
import { TareaFormComponent } from './tarea-form.component';
import { esActiva } from './transiciones';

/** Tabla de tareas con sus acciones: editar, cambiar estado (RF10) y cancelar (RF11). */
@Component({
  selector: 'app-tareas-tabla',
  imports: [
    RouterLink,
    EtiquetaPipe,
    FechaPipe,
    DialogoComponent,
    TareaFormComponent,
    IconoComponent,
    AvatarComponent,
    CambioEstadoComponent,
  ],
  templateUrl: './tareas-tabla.component.html',
  styleUrl: './tareas-tabla.component.scss',
})
export class TareasTablaComponent {
  protected readonly auth = inject(AuthService);
  protected readonly responsables = inject(ResponsablesStore);
  protected readonly expedientes = inject(ExpedientesCache);
  protected readonly tono = tono;
  protected readonly hoy = hoyLima();

  readonly tareas = input.required<Tarea[]>();
  readonly mostrarExpediente = input(true);
  /** Permite modificar (false cuando el expediente ya no está abierto). */
  readonly editable = input(true);
  readonly cambio = output<void>();

  protected readonly editando = signal<Tarea | null>(null);
  protected readonly cambiandoEstado = signal<Tarea | null>(null);
  protected readonly cancelando = signal<Tarea | null>(null);

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

  protected vencimiento(t: Tarea): { texto: string; clase: string } {
    if (!esActiva(t.estado)) return { texto: '', clase: '' };
    const dias = diasHasta(t.fechaLimite, this.hoy);
    return { texto: textoDias(dias), clase: dias < 0 ? 'vencida' : dias <= 2 ? 'pronto' : '' };
  }

  protected esActivaFila(t: Tarea): boolean {
    return esActiva(t.estado);
  }

  protected terminado(): void {
    this.editando.set(null);
    this.cambiandoEstado.set(null);
    this.cancelando.set(null);
    this.cambio.emit();
  }
}
