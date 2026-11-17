import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ExpedientesService } from '../../services/api/expedientes.service';
import { interpretarError } from '../../services/errores';
import { Expediente } from '../../models/expediente';
import { NotificacionesService } from '../../services/notificaciones.service';
import { ResponsablesStore } from '../../services/responsables.store';
import { ErrorCampoComponent } from '../../components/error-campo/error-campo';
import { EtiquetaPipe } from '../../utils/etiqueta.pipe';
import { IconoComponent } from '../../components/icono/icono';
import { noSoloEspacios } from '../../validators/no-solo-espacios';

/** RF03 / RF05: registrar o editar (y reasignar) un expediente. */
@Component({
  selector: 'app-expediente-form',
  imports: [ReactiveFormsModule, ErrorCampoComponent, EtiquetaPipe, IconoComponent],
  templateUrl: './formulario-expediente.html',
  styleUrl: './formulario-expediente.scss',
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
