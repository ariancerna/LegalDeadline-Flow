import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ExpedientesService } from '../../core/api/expedientes.service';
import { interpretarError } from '../../core/errores';
import { Expediente } from '../../core/models';
import { NotificacionesService } from '../../core/notificaciones.service';
import { ResponsablesStore } from '../../core/responsables.store';
import { ErrorCampoComponent } from '../../shared/error-campo.component';
import { EtiquetaPipe } from '../../shared/etiqueta.pipe';
import { noSoloEspacios } from '../../shared/validadores';

/** RF03 / RF05: registrar o editar (y reasignar) un expediente. */
@Component({
  selector: 'app-expediente-form',
  imports: [ReactiveFormsModule, ErrorCampoComponent, EtiquetaPipe],
  template: `
    <form class="formulario" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
      @if (error(); as mensaje) {
        <div class="aviso aviso-error" role="alert">{{ mensaje }}</div>
      }
      <div class="campo">
        <label for="codigo">Código</label>
        <input id="codigo" formControlName="codigo" placeholder="EXP-2026-001" maxlength="20" />
        <span class="ayuda">Único. Se guarda en mayúsculas.</span>
        <app-error-campo [control]="form.controls.codigo" [servidor]="camposServidor()['codigo']" />
      </div>
      <div class="campo">
        <label for="asunto">Asunto</label>
        <textarea id="asunto" formControlName="asunto" maxlength="255"></textarea>
        <app-error-campo [control]="form.controls.asunto" [servidor]="camposServidor()['asunto']" />
      </div>
      <div class="campo">
        <label for="responsable">Responsable</label>
        <select id="responsable" formControlName="responsableId">
          <option [ngValue]="null" disabled>Selecciona…</option>
          @for (r of responsables.lista(); track r.responsableId) {
            <option [ngValue]="r.responsableId">
              {{ r.nombre }} · {{ r.rol | etiqueta }} ({{ r.tareasActivas }} tareas activas)
            </option>
          }
        </select>
        <app-error-campo
          [control]="form.controls.responsableId"
          [servidor]="camposServidor()['responsableId']"
        />
      </div>
      <div class="acciones">
        <button type="submit" class="btn btn-primario" [disabled]="enviando()">
          {{ expediente() ? 'Guardar cambios' : 'Registrar expediente' }}
        </button>
        <button type="button" class="btn btn-secundario" (click)="cancelar.emit()">Cancelar</button>
      </div>
    </form>
  `,
})
export class ExpedienteFormComponent implements OnInit {
  private readonly servicio = inject(ExpedientesService);
  private readonly avisos = inject(NotificacionesService);
  protected readonly responsables = inject(ResponsablesStore);

  readonly expediente = input<Expediente | null>(null);
  readonly guardado = output<Expediente>();
  readonly cancelar = output<void>();

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly camposServidor = signal<Record<string, string>>({});

  protected readonly form = inject(FormBuilder).group({
    codigo: ['', [Validators.required, Validators.maxLength(20), noSoloEspacios]],
    asunto: ['', [Validators.required, Validators.maxLength(255), noSoloEspacios]],
    responsableId: [null as number | null, Validators.required],
  });

  ngOnInit(): void {
    this.responsables.asegurar();
    const e = this.expediente();
    if (e) {
      this.form.setValue({ codigo: e.codigo, asunto: e.asunto, responsableId: e.responsableId });
    }
  }

  protected guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const datos = { codigo: v.codigo!, asunto: v.asunto!, responsableId: v.responsableId! };
    const actual = this.expediente();
    const peticion = actual
      ? this.servicio.actualizar(actual.id, datos, actual.version)
      : this.servicio.crear(datos);
    this.enviando.set(true);
    this.error.set(null);
    peticion.subscribe({
      next: (r) => {
        this.avisos.exito(
          actual ? 'Expediente actualizado.' : `Expediente ${r.codigo} registrado.`,
        );
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
