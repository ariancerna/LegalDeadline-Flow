import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UsuariosService } from '../../services/api/usuarios.service';
import { interpretarError } from '../../services/errores';
import { ROLES } from '../../data/catalogos.data';
import { Rol, Usuario } from '../../models/usuario';
import { NotificacionesService } from '../../services/notificaciones.service';
import { ErrorCampoComponent } from '../../components/error-campo/error-campo';
import { IconoComponent } from '../../components/icono/icono';
import { EtiquetaPipe } from '../../utils/etiqueta.pipe';
import { noSoloEspacios } from '../../validators/no-solo-espacios';

/** RF02: registrar o editar una cuenta (solo administrador). */
@Component({
  selector: 'app-usuario-form',
  imports: [ReactiveFormsModule, ErrorCampoComponent, EtiquetaPipe, IconoComponent],
  templateUrl: './formulario-usuario.html',
  styleUrl: './formulario-usuario.scss',
})
export class UsuarioFormComponent implements OnInit {
  private readonly servicio = inject(UsuariosService);
  private readonly avisos = inject(NotificacionesService);
  protected readonly roles = ROLES;

  readonly usuario = input<Usuario | null>(null);
  readonly guardado = output<void>();
  readonly cancelar = output<void>();

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly camposServidor = signal<Record<string, string>>({});

  protected readonly form = inject(FormBuilder).nonNullable.group({
    nombre: [
      '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(120), noSoloEspacios],
    ],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    rol: ['RESPONSABLE' as Rol, Validators.required],
    activo: [true],
    password: ['', [Validators.minLength(8), Validators.maxLength(72)]],
  });

  ngOnInit(): void {
    const u = this.usuario();
    if (u) {
      this.form.patchValue({ nombre: u.nombre, email: u.email, rol: u.rol, activo: u.activo });
    } else {
      this.form.controls.password.addValidators(Validators.required);
    }
  }

  protected guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const actual = this.usuario();
    const peticion = actual
      ? this.servicio.actualizar(actual.id, {
          nombre: v.nombre,
          email: v.email,
          rol: v.rol,
          activo: v.activo,
          password: v.password || null,
        })
      : this.servicio.crear({ nombre: v.nombre, email: v.email, rol: v.rol, password: v.password });
    this.enviando.set(true);
    this.error.set(null);
    peticion.subscribe({
      next: () => {
        this.avisos.exito(actual ? 'Usuario actualizado.' : 'Usuario creado.');
        this.guardado.emit();
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
