import {
  CdkDrag,
  CdkDragDrop,
  CdkDragPlaceholder,
  CdkDropList,
  CdkDropListGroup,
} from '@angular/cdk/drag-drop';
import { Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ExpedientesCache } from '../../core/expedientes.cache';
import { TAREA_ESTADOS, Tarea, TareaEstado } from '../../core/models';
import { NotificacionesService } from '../../core/notificaciones.service';
import { ResponsablesStore } from '../../core/responsables.store';
import { AvatarComponent } from '../../shared/avatar.component';
import { DialogoComponent } from '../../shared/dialogo.component';
import { EtiquetaPipe } from '../../shared/etiqueta.pipe';
import { etiqueta } from '../../shared/etiquetas';
import { FechaPipe } from '../../shared/fecha.pipe';
import { diasHasta, hoyLima } from '../../shared/fechas';
import { IconoComponent } from '../../shared/icono.component';
import { NombreIcono } from '../../shared/iconos.generados';
import { CambioEstadoComponent } from './cambio-estado.component';
import { TRANSICIONES, esActiva } from './transiciones';

const COLUMNAS: { estado: TareaEstado; icono: NombreIcono }[] = [
  { estado: 'PENDIENTE', icono: 'circle' },
  { estado: 'EN_PROGRESO', icono: 'loader-circle' },
  { estado: 'CERRADA', icono: 'circle-check' },
  { estado: 'CANCELADA', icono: 'circle-slash' },
];

/** Vista Kanban: arrastrar una tarjeta a otra columna cambia su estado (RF10). */
@Component({
  selector: 'app-tareas-kanban',
  imports: [
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
    CdkDragPlaceholder,
    RouterLink,
    EtiquetaPipe,
    FechaPipe,
    IconoComponent,
    AvatarComponent,
    DialogoComponent,
    CambioEstadoComponent,
  ],
  templateUrl: './tareas-kanban.component.html',
  styleUrl: './tareas-kanban.component.scss',
})
export class TareasKanbanComponent {
  private readonly avisos = inject(NotificacionesService);
  protected readonly auth = inject(AuthService);
  protected readonly responsables = inject(ResponsablesStore);
  protected readonly expedientes = inject(ExpedientesCache);
  protected readonly columnas = COLUMNAS;
  protected readonly hoy = hoyLima();

  readonly tareas = input.required<Record<TareaEstado, Tarea[]>>();
  readonly totales = input<Record<TareaEstado, number> | null>(null);
  readonly cambio = output<void>();

  /** Copia local para mover tarjetas de inmediato mientras responde el servidor. */
  protected readonly local = signal<Record<TareaEstado, Tarea[]>>(vacio());
  protected readonly pendiente = signal<{ tarea: Tarea; destino: TareaEstado } | null>(null);

  constructor() {
    effect(() => {
      const datos = this.tareas();
      untracked(() => {
        this.local.set({ ...datos });
        this.expedientes.cargar(TAREA_ESTADOS.flatMap((e) => datos[e].map((t) => t.expedienteId)));
      });
    });
  }

  protected arrastrable(t: Tarea): boolean {
    return this.auth.puedeEscribir() && esActiva(t.estado);
  }

  /** Solo se aceptan columnas a las que la tarea puede pasar. */
  protected aceptaEn = (destino: TareaEstado) => (drag: CdkDrag<Tarea>) =>
    TRANSICIONES[drag.data.estado].includes(destino);

  protected soltar(ev: CdkDragDrop<TareaEstado, TareaEstado, Tarea>): void {
    const destino = ev.container.data;
    const tarea = ev.item.data;
    if (ev.previousContainer === ev.container) return;
    if (!TRANSICIONES[tarea.estado].includes(destino)) {
      this.avisos.alerta(
        `No se puede pasar de «${etiqueta(tarea.estado)}» a «${etiqueta(destino)}».`,
      );
      return;
    }
    // Movimiento visual inmediato; el diálogo confirma y guarda.
    this.local.update((l) => ({
      ...l,
      [tarea.estado]: l[tarea.estado].filter((t) => t.id !== tarea.id),
      [destino]: [{ ...tarea, estado: destino }, ...l[destino]],
    }));
    this.pendiente.set({ tarea, destino });
  }

  protected deshacer(): void {
    this.pendiente.set(null);
    this.local.set({ ...this.tareas() });
  }

  protected guardado(): void {
    this.pendiente.set(null);
    this.cambio.emit();
  }

  protected vence(t: Tarea): { texto: string; clase: string } {
    if (!esActiva(t.estado)) return { texto: '', clase: '' };
    const d = diasHasta(t.fechaLimite, this.hoy);
    if (d < 0) return { texto: `Vencida hace ${-d} d`, clase: 'vencida' };
    if (d === 0) return { texto: 'Vence hoy', clase: 'pronto' };
    if (d <= 2) return { texto: `Vence en ${d} d`, clase: 'pronto' };
    return { texto: '', clase: '' };
  }
}

function vacio(): Record<TareaEstado, Tarea[]> {
  return { PENDIENTE: [], EN_PROGRESO: [], CERRADA: [], CANCELADA: [] };
}
