import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ExpedientesService } from '../../core/api/expedientes.service';
import { TareasService } from '../../core/api/tareas.service';
import { AuthService } from '../../core/auth/auth.service';
import { interpretarError } from '../../core/errores';
import { Expediente, PRIORIDADES, Prioridad, Tarea } from '../../core/models';
import { NotificacionesService } from '../../core/notificaciones.service';
import { ResponsablesStore } from '../../core/responsables.store';
import { ErrorCampoComponent } from '../../shared/error-campo.component';
import { EtiquetaPipe } from '../../shared/etiqueta.pipe';
import { hoyLima } from '../../shared/fechas';
import { noSoloEspacios } from '../../shared/validadores';

/**
 * RF07 / RF09: registrar o editar una tarea.
 * RF08: el backend rechaza con 409 una tarea activa equivalente.
 * RF16: advierte si la asignación deja al responsable sobre el umbral.
 */
@Component({
  selector: 'app-tarea-form',
  imports: [ReactiveFormsModule, ErrorCampoComponent, EtiquetaPipe],
  templateUrl: './tarea-form.component.html',
})
export class TareaFormComponent implements OnInit {
  private readonly servicio = inject(TareasService);
  private readonly expedientesServicio = inject(ExpedientesService);
  private readonly avisos = inject(NotificacionesService);
  protected readonly auth = inject(AuthService);
  protected readonly responsables = inject(ResponsablesStore);
  protected readonly prioridades = PRIORIDADES;

  /** Tarea a editar; si es null se registra una nueva. */
  readonly tarea = input<Tarea | null>(null);
  /** Expediente fijo (desde el detalle). Si es null, se elige en el formulario. */
  readonly expedienteId = input<number | null>(null);
  readonly guardado = output<Tarea>();
  readonly cancelar = output<void>();

  protected readonly expedientesAbiertos = signal<Expediente[]>([]);
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly duplicada = signal(false);
  protected readonly camposServidor = signal<Record<string, string>>({});

  protected readonly form = inject(FormBuilder).group({
    expedienteId: [null as number | null, Validators.required],
    titulo: [
      '',
      [Validators.required, Validators.minLength(3), Validators.maxLength(120), noSoloEspacios],
    ],
    tipo: ['', [Validators.required, Validators.maxLength(50), noSoloEspacios]],
    responsableId: [null as number | null, Validators.required],
    prioridad: ['MEDIA' as Prioridad, Validators.required],
    fechaLimite: [hoyLima(), Validators.required],
  });

  private readonly responsableElegido = toSignal(this.form.controls.responsableId.valueChanges, {
    initialValue: null,
  });

  /** Sobrecarga prevista al asignar (RF16). No bloquea: la decisión es del supervisor. */
  protected readonly avisoCarga = computed(() => {
    const id = this.responsableElegido();
    if (id === null) return null;
    const actual = this.tarea();
    if (actual && actual.responsableId === id) return null; // no cambia la asignación
    const r = this.responsables.porId().get(id);
    if (!r) return null;
    const nueva = r.tareasActivas + 1;
    return nueva > r.umbral ? { nombre: r.nombre, nueva, umbral: r.umbral } : null;
  });

  ngOnInit(): void {
    this.responsables.asegurar();
    const t = this.tarea();
    const fijo = this.expedienteId();
    if (t) {
      this.form.patchValue({
        expedienteId: t.expedienteId,
        titulo: t.titulo,
        tipo: t.tipo,
        responsableId: t.responsableId,
        prioridad: t.prioridad,
        fechaLimite: t.fechaLimite,
      });
      this.form.controls.expedienteId.disable();
      if (!this.auth.esGestor()) {
        // Reasignar y cambiar prioridad están reservados al gestor (RF09).
        this.form.controls.responsableId.disable();
        this.form.controls.prioridad.disable();
      }
    } else {
      if (fijo !== null) {
        this.form.controls.expedienteId.setValue(fijo);
        this.form.controls.expedienteId.disable();
      } else {
        this.expedientesServicio
          .listar({ estado: 'ABIERTO', size: 100 })
          .subscribe({ next: (p) => this.expedientesAbiertos.set(p.content) });
      }
      if (!this.auth.esGestor()) {
        // Un responsable solo puede asignarse tareas a sí mismo.
        this.form.controls.responsableId.setValue(this.auth.usuario()?.id ?? null);
        this.form.controls.responsableId.disable();
      }
    }
  }

  protected guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const datos = {
      titulo: v.titulo!,
      tipo: v.tipo!,
      responsableId: v.responsableId!,
      prioridad: v.prioridad!,
      fechaLimite: v.fechaLimite!,
    };
    const actual = this.tarea();
    const peticion = actual
      ? this.servicio.actualizar(actual.id, datos, actual.version)
      : this.servicio.crear(v.expedienteId!, datos);
    this.enviando.set(true);
    this.error.set(null);
    this.duplicada.set(false);
    peticion.subscribe({
      next: (t) => {
        this.avisos.exito(actual ? 'Tarea actualizada.' : 'Tarea registrada.');
        const carga = this.avisoCarga();
        if (carga) {
          this.avisos.alerta(
            `${carga.nombre} queda con ${carga.nueva} tareas activas (umbral ${carga.umbral}).`,
          );
        }
        this.responsables.recargar().subscribe({ error: () => undefined });
        this.guardado.emit(t);
      },
      error: (e) => {
        const err = interpretarError(e);
        this.duplicada.set(err.codigo === 'TAREA_DUPLICADA');
        this.error.set(err.mensaje);
        this.camposServidor.set(err.campos);
        this.enviando.set(false);
      },
    });
  }
}
