import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TareasService } from '../../core/api/tareas.service';
import { AuthService } from '../../core/auth/auth.service';
import { interpretarError } from '../../core/errores';
import { Tarea, TareaEstado } from '../../core/models';
import { NotificacionesService } from '../../core/notificaciones.service';
import { ResponsablesStore } from '../../core/responsables.store';
import { EtiquetaPipe } from '../../shared/etiqueta.pipe';
import { etiqueta, tono } from '../../shared/etiquetas';
import { IconoComponent } from '../../shared/icono.component';
import { NombreIcono } from '../../shared/iconos.generados';
import { TRANSICIONES, requiereConfirmacion } from './transiciones';

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
  template: `
    <div class="formulario">
      @if (error(); as mensaje) {
        <div class="aviso aviso-error" role="alert">
          <app-icono nombre="circle-alert" [tamano]="16" />{{ mensaje }}
        </div>
      }

      @if (modo() === 'cancelar') {
        <p class="texto-2">
          La tarea no se borra: queda como <strong>cancelada</strong> en el historial y deja de
          contar en la carga del responsable.
        </p>
      } @else {
        <div class="actual">
          <span class="texto-3 texto-chico">Estado actual</span>
          <span [class]="'estado ' + tono(tarea().estado)">{{ tarea().estado | etiqueta }}</span>
          <span class="texto-3 texto-chico">· Prioridad {{ tarea().prioridad | etiqueta }}</span>
        </div>
        <div class="opciones" role="radiogroup" aria-label="Nuevo estado">
          @for (e of opciones(); track e) {
            <button
              type="button"
              role="radio"
              class="opcion-estado"
              [class.elegida]="nuevo() === e"
              [attr.aria-checked]="nuevo() === e"
              (click)="elegir(e)"
            >
              <app-icono [nombre]="iconos[e]" [tamano]="18" />
              <span>{{ e | etiqueta }}</span>
            </button>
          }
        </div>
        <label class="sr-only" for="nuevo-estado">Nuevo estado</label>
        <select
          id="nuevo-estado"
          class="sr-only"
          [ngModel]="nuevo()"
          (ngModelChange)="elegir($event)"
          tabindex="-1"
        >
          @for (e of opciones(); track e) {
            <option [ngValue]="e">{{ e | etiqueta }}</option>
          }
        </select>

        @if (necesitaConfirmacion()) {
          @if (auth.esGestor()) {
            <label class="casilla aviso aviso-alerta">
              <input
                type="checkbox"
                [ngModel]="confirmacion()"
                (ngModelChange)="confirmacion.set($event)"
              />
              <span
                >Confirmo, como <strong>{{ auth.rol() | etiqueta }}</strong
                >, el cierre de esta tarea de prioridad alta (RN03).</span
              >
            </label>
          } @else {
            <div class="aviso aviso-info">
              <app-icono nombre="shield-check" [tamano]="16" />
              <span
                >Las tareas de prioridad alta solo las cierra un supervisor o administrador. Pídele
                a tu supervisor que confirme el cierre.</span
              >
            </div>
          }
        }
      }

      <div class="acciones pie-formulario">
        <button type="button" class="btn btn-secundario" (click)="volver.emit()">Volver</button>
        @if (modo() === 'cancelar') {
          <button
            type="button"
            class="btn btn-peligro"
            [disabled]="enviando()"
            (click)="cancelar()"
          >
            Cancelar tarea
          </button>
        } @else {
          <button
            type="button"
            class="btn btn-primario"
            [disabled]="!puedeGuardar()"
            (click)="guardar()"
          >
            Guardar estado
          </button>
        }
      </div>
    </div>
  `,
  styles: `
    .actual {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .opciones {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 8px;
    }
    .opcion-estado {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 14px 8px;
      border: 1px solid var(--borde);
      border-radius: var(--radio);
      background: var(--superficie);
      color: var(--texto-2);
      font: inherit;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      transition:
        border-color 0.15s,
        background-color 0.15s;
    }
    .opcion-estado:hover {
      border-color: var(--borde-fuerte);
    }
    .opcion-estado.elegida {
      border-color: var(--marca);
      background: var(--marca-suave);
      color: var(--marca-texto);
      box-shadow: var(--anillo);
    }
  `,
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
