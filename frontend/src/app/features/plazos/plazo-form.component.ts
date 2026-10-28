import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ExpedientesService } from '../../core/api/expedientes.service';
import { PlazosService } from '../../core/api/plazos.service';
import { interpretarError } from '../../core/errores';
import { Expediente, Plazo } from '../../core/models';
import { NotificacionesService } from '../../core/notificaciones.service';
import { ErrorCampoComponent } from '../../shared/error-campo.component';
import { IconoComponent } from '../../shared/icono.component';
import { hoyLima } from '../../shared/fechas';
import { noSoloEspacios } from '../../shared/validadores';

/** RF12 / RF13: registrar o editar un plazo activo. */
@Component({
  selector: 'app-plazo-form',
  imports: [ReactiveFormsModule, ErrorCampoComponent, IconoComponent],
  template: `
    <form class="formulario" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
      @if (error(); as mensaje) {
        <div class="aviso aviso-error" role="alert">
          <app-icono nombre="circle-alert" [tamano]="16" />{{ mensaje }}
        </div>
      }
      @if (!plazo() && expedienteId() === null) {
        <div
          class="campo"
          [class.invalido]="
            form.controls.expedienteId.invalid && form.controls.expedienteId.touched
          "
        >
          <label for="p-exp">Expediente</label>
          <select id="p-exp" formControlName="expedienteId">
            <option [ngValue]="null" disabled>Selecciona un expediente abierto…</option>
            @for (e of expedientesAbiertos(); track e.id) {
              <option [ngValue]="e.id">{{ e.codigo }} — {{ e.asunto }}</option>
            }
          </select>
          <app-error-campo [control]="form.controls.expedienteId" />
        </div>
      }
      <div class="fila-campos">
        <div
          class="campo"
          [class.invalido]="form.controls.tipo.invalid && form.controls.tipo.touched"
        >
          <label for="p-tipo">Tipo de plazo</label>
          <input
            id="p-tipo"
            class="mono"
            formControlName="tipo"
            maxlength="50"
            placeholder="CONTESTACION"
            list="tipos-plazo"
          />
          <datalist id="tipos-plazo">
            <option value="CONTESTACION"></option>
            <option value="APELACION"></option>
            <option value="AUDIENCIA"></option>
            <option value="SUBSANACION"></option>
          </datalist>
          <app-error-campo [control]="form.controls.tipo" [servidor]="camposServidor()['tipo']" />
        </div>
        <div class="campo">
          <label for="p-fecha">Fecha límite</label>
          <input id="p-fecha" type="date" formControlName="fechaLimite" />
          <app-error-campo
            [control]="form.controls.fechaLimite"
            [servidor]="camposServidor()['fechaLimite']"
          />
        </div>
      </div>
      <div class="aviso aviso-info">
        <app-icono nombre="gauge" [tamano]="16" />
        <span>
          El riesgo se calcula solo (RN04): <strong>crítico</strong> si venció o faltan hasta 2 días
          con tareas activas; <strong>alto</strong> hasta 5; <strong>medio</strong> hasta 10;
          <strong>bajo</strong> en los demás casos.
        </span>
      </div>
      <div class="acciones pie-formulario">
        <button type="button" class="btn btn-secundario" (click)="cancelar.emit()">Cancelar</button>
        <button type="submit" class="btn btn-primario" [disabled]="enviando()">
          @if (enviando()) {
            <app-icono nombre="loader-circle" [tamano]="16" class="girando" />
          }
          {{ plazo() ? 'Guardar cambios' : 'Registrar plazo' }}
        </button>
      </div>
    </form>
  `,
})
export class PlazoFormComponent implements OnInit {
  private readonly servicio = inject(PlazosService);
  private readonly expedientesServicio = inject(ExpedientesService);
  private readonly avisos = inject(NotificacionesService);

  readonly plazo = input<Plazo | null>(null);
  readonly expedienteId = input<number | null>(null);
  readonly guardado = output<Plazo>();
  readonly cancelar = output<void>();

  protected readonly expedientesAbiertos = signal<Expediente[]>([]);
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly camposServidor = signal<Record<string, string>>({});

  protected readonly form = inject(FormBuilder).group({
    expedienteId: [null as number | null, Validators.required],
    tipo: ['', [Validators.required, Validators.maxLength(50), noSoloEspacios]],
    fechaLimite: [hoyLima(), Validators.required],
  });

  ngOnInit(): void {
    const p = this.plazo();
    if (p) {
      this.form.setValue({
        expedienteId: p.expedienteId,
        tipo: p.tipo,
        fechaLimite: p.fechaLimite,
      });
      this.form.controls.expedienteId.disable();
    } else if (this.expedienteId() !== null) {
      this.form.controls.expedienteId.setValue(this.expedienteId());
      this.form.controls.expedienteId.disable();
    } else {
      this.expedientesServicio
        .listar({ estado: 'ABIERTO', size: 100 })
        .subscribe({ next: (r) => this.expedientesAbiertos.set(r.content) });
    }
  }

  protected guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const datos = { tipo: v.tipo!, fechaLimite: v.fechaLimite! };
    const actual = this.plazo();
    const peticion = actual
      ? this.servicio.actualizar(actual.id, datos, actual.version)
      : this.servicio.crear(v.expedienteId!, datos);
    this.enviando.set(true);
    this.error.set(null);
    peticion.subscribe({
      next: (r) => {
        this.avisos.exito(actual ? 'Plazo actualizado.' : 'Plazo registrado.');
        this.guardado.emit(r);
      },
      error: (e) => {
        const err = interpretarError(e);
        this.error.set(err.mensaje);
        this.camposServidor.set(err.campos);
        this.enviando.set(false);
      },
    });
  }
}
