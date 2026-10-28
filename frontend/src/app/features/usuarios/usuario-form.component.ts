import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UsuariosService } from '../../core/api/usuarios.service';
import { interpretarError } from '../../core/errores';
import { ROLES, Rol, Usuario } from '../../core/models';
import { NotificacionesService } from '../../core/notificaciones.service';
import { ErrorCampoComponent } from '../../shared/error-campo.component';
import { IconoComponent } from '../../shared/icono.component';
import { EtiquetaPipe } from '../../shared/etiqueta.pipe';
import { noSoloEspacios } from '../../shared/validadores';

/** RF02: registrar o editar una cuenta (solo administrador). */
@Component({
  selector: 'app-usuario-form',
  imports: [ReactiveFormsModule, ErrorCampoComponent, EtiquetaPipe, IconoComponent],
  template: `
    <form class="formulario" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
      @if (error(); as mensaje) {
        <div class="aviso aviso-error" role="alert">
          <app-icono nombre="circle-alert" [tamano]="16" />{{ mensaje }}
        </div>
      }
      <div class="campo">
        <label for="u-nombre">Nombre</label>
        <input id="u-nombre" formControlName="nombre" maxlength="120" />
        <app-error-campo [control]="form.controls.nombre" [servidor]="camposServidor()['nombre']" />
      </div>
      <div class="campo">
        <label for="u-email">Correo</label>
        <input
          id="u-email"
          type="email"
          formControlName="email"
          maxlength="150"
          autocomplete="off"
        />
        <app-error-campo [control]="form.controls.email" [servidor]="camposServidor()['email']" />
      </div>
      <div class="fila-campos">
        <div class="campo">
          <label for="u-rol">Rol</label>
          <select id="u-rol" formControlName="rol">
            @for (r of roles; track r) {
              <option [ngValue]="r">{{ r | etiqueta }}</option>
            }
          </select>
        </div>
        @if (usuario()) {
          <label class="casilla" style="align-self: end">
            <input type="checkbox" formControlName="activo" /> Cuenta activa
          </label>
        }
      </div>
      <div class="campo">
        <label for="u-pass">{{ usuario() ? 'Nueva contraseña (opcional)' : 'Contraseña' }}</label>
        <input
          id="u-pass"
          type="password"
          formControlName="password"
          maxlength="72"
          autocomplete="new-password"
        />
        <span class="ayuda"
          >Entre 8 y 72 caracteres.{{
            usuario() ? ' Cambiarla invalida las sesiones abiertas.' : ''
          }}</span
        >
        <app-error-campo
          [control]="form.controls.password"
          [servidor]="camposServidor()['password']"
        />
      </div>
      <div class="acciones pie-formulario">
        <button type="button" class="btn btn-secundario" (click)="cancelar.emit()">Cancelar</button>
        <button type="submit" class="btn btn-primario" [disabled]="enviando()">
          {{ usuario() ? 'Guardar cambios' : 'Crear usuario' }}
        </button>
      </div>
    </form>
  `,
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
