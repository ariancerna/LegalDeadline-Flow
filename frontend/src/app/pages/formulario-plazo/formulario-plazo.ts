import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PlazosService } from '../../services/api/plazos.service';
import { interpretarError } from '../../services/errores';
import { Plazo } from '../../models/plazo';
import { NotificacionesService } from '../../services/notificaciones.service';
import { ErrorCampoComponent } from '../../components/error-campo/error-campo';
import { IconoComponent } from '../../components/icono/icono';
import { hoyLima } from '../../utils/fechas';
import { SelectorExpedienteComponent } from '../../components/selector-expediente/selector-expediente';
import { noSoloEspacios } from '../../validators/no-solo-espacios';

/** RF12 / RF13: registrar o editar un plazo activo. */
@Component({
  selector: 'app-plazo-form',
  imports: [ReactiveFormsModule, ErrorCampoComponent, IconoComponent, SelectorExpedienteComponent],
  templateUrl: './formulario-plazo.html',
  styleUrl: './formulario-plazo.scss',
})
export class PlazoFormComponent implements OnInit {
  private readonly servicio = inject(PlazosService);
  private readonly avisos = inject(NotificacionesService);

  readonly plazo = input<Plazo | null>(null);
  readonly expedienteId = input<number | null>(null);
  readonly guardado = output<Plazo>();
  readonly cancelar = output<void>();

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
