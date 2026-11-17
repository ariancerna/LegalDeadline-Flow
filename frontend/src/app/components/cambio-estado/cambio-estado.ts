import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TareasService } from '../../services/api/tareas.service';
import { AuthService } from '../../services/auth/auth.service';
import { interpretarError } from '../../services/errores';
import { Tarea, TareaEstado } from '../../models/tarea';
import { NotificacionesService } from '../../services/notificaciones.service';
import { ResponsablesStore } from '../../services/responsables.store';
import { EtiquetaPipe } from '../../utils/etiqueta.pipe';
import { etiqueta, tono } from '../../utils/etiquetas';
import { IconoComponent } from '../icono/icono';
import { NombreIcono } from '../icono/iconos.generados';
import { TRANSICIONES, requiereConfirmacion } from '../../utils/transiciones';

const ICONO_ESTADO: Record<TareaEstado, NombreIcono> = {
  PENDIENTE: 'circle',
  EN_PROGRESO: 'loader-circle',
  CERRADA: 'circle-check',
  CANCELADA: 'circle-slash',
};

/**
 * Cambio de estado de una tarea (RF10) o cancelación (RF11).
 * Cerrar una tarea ALTA exige confirmación de supervisor o administrador (RN03).
 */
@Component({
  selector: 'app-cambio-estado',
  imports: [FormsModule, EtiquetaPipe, IconoComponent],
  templateUrl: './cambio-estado.html',
  styleUrl: './cambio-estado.scss',
})
export class CambioEstadoComponent implements OnInit {
  private readonly servicio = inject(TareasService);
  private readonly avisos = inject(NotificacionesService);
  private readonly responsables = inject(ResponsablesStore);
  protected readonly auth = inject(AuthService);
  protected readonly tono = tono;
  protected readonly iconos = ICONO_ESTADO;

  readonly tarea = input.required<Tarea>();
  readonly modo = input<'estado' | 'cancelar'>('estado');
  /** Estado sugerido al abrir (por ejemplo, al soltar en el tablero Kanban). */
  readonly sugerido = input<TareaEstado | null>(null);
  readonly listo = output<void>();
  readonly volver = output<void>();

  protected readonly nuevo = signal<TareaEstado | null>(null);
  protected readonly confirmacion = signal(false);
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly opciones = computed(() => TRANSICIONES[this.tarea().estado]);
  protected readonly necesitaConfirmacion = computed(() => {
    const n = this.nuevo();
    return !!n && requiereConfirmacion(this.tarea().prioridad, n);
  });
  protected readonly puedeGuardar = computed(
    () =>
      !this.enviando() &&
      !!this.nuevo() &&
      (!this.necesitaConfirmacion() || (this.auth.esGestor() && this.confirmacion())),
  );

  ngOnInit(): void {
    this.nuevo.set(this.sugerido() ?? this.opciones()[0] ?? null);
  }

  protected elegir(e: TareaEstado): void {
    this.nuevo.set(e);
    this.confirmacion.set(false);
  }

  protected guardar(): void {
    const estado = this.nuevo();
    if (!estado) return;
    this.enviar(
      this.servicio.cambiarEstado(
        this.tarea().id,
        estado,
        this.tarea().version,
        this.confirmacion(),
      ),
      `Tarea movida a «${etiqueta(estado).toLowerCase()}».`,
    );
  }

  protected cancelar(): void {
    this.enviar(
      this.servicio.cancelar(this.tarea().id, this.tarea().version),
      'Tarea cancelada. Se conserva en el historial.',
    );
  }

  private enviar(peticion: ReturnType<TareasService['cancelar']>, exito: string): void {
    this.enviando.set(true);
    this.error.set(null);
    peticion.subscribe({
      next: () => {
        this.avisos.exito(exito);
        this.responsables.recargar().subscribe({ error: () => undefined });
        this.listo.emit();
      },
      error: (e) => {
        const err = interpretarError(e);
        if (err.codigo === 'VERSION_DESACTUALIZADA') {
          // Otro usuario la modificó: se cierra y se recargan los datos.
          this.avisos.error(err.mensaje);
          this.listo.emit();
          return;
        }
        this.error.set(err.mensaje);
        this.enviando.set(false);
      },
    });
  }
}
