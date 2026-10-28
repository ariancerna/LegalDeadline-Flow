import { Component, OnInit, inject, signal } from '@angular/core';
import { UsuariosService } from '../../core/api/usuarios.service';
import { AuthService } from '../../core/auth/auth.service';
import { interpretarError } from '../../core/errores';
import { Usuario } from '../../core/models';
import { NotificacionesService } from '../../core/notificaciones.service';
import { ResponsablesStore } from '../../core/responsables.store';
import { DialogoComponent } from '../../shared/dialogo.component';
import { EtiquetaPipe } from '../../shared/etiqueta.pipe';
import { UsuarioFormComponent } from './usuario-form.component';

/** RF02: administración de cuentas y roles. */
@Component({
  selector: 'app-usuarios',
  imports: [EtiquetaPipe, DialogoComponent, UsuarioFormComponent],
  template: `
    <div class="pagina-encabezado">
      <div>
        <h1>Usuarios</h1>
        <p>Cuentas, roles y estado de acceso. Las cuentas se desactivan, no se eliminan.</p>
      </div>
      <button type="button" class="btn btn-primario" (click)="editando.set('nuevo')">
        + Nuevo usuario
      </button>
    </div>

    @if (error(); as mensaje) {
      <div class="aviso aviso-error" role="alert">{{ mensaje }}</div>
    }

    <div class="tabla-contenedor">
      <table class="tabla">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Correo</th>
            <th>Rol</th>
            <th>Estado</th>
            <th><span class="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          @for (u of usuarios(); track u.id) {
            <tr>
              <td>{{ u.nombre }}</td>
              <td>{{ u.email }}</td>
              <td>
                <span class="badge">{{ u.rol | etiqueta }}</span>
              </td>
              <td>
                <span [class]="'badge ' + (u.activo ? 'badge-exito' : 'badge-neutro')">{{
                  u.activo ? 'Activo' : 'Inactivo'
                }}</span>
              </td>
              <td>
                <div class="acciones">
                  <button type="button" class="btn-enlace btn-chico" (click)="editando.set(u)">
                    Editar
                  </button>
                  @if (u.activo && u.id !== auth.usuario()?.id) {
                    <button
                      type="button"
                      class="btn-enlace btn-chico peligro"
                      (click)="desactivando.set(u)"
                    >
                      Desactivar
                    </button>
                  }
                </div>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="5" class="vacia">Cargando…</td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    @if (editando(); as u) {
      <app-dialogo
        [titulo]="u === 'nuevo' ? 'Nuevo usuario' : 'Editar usuario'"
        (cerrar)="editando.set(null)"
      >
        <app-usuario-form
          [usuario]="u === 'nuevo' ? null : u"
          (guardado)="guardado()"
          (cancelar)="editando.set(null)"
        />
      </app-dialogo>
    }

    @if (desactivando(); as u) {
      <app-dialogo titulo="Desactivar usuario" (cerrar)="desactivando.set(null)">
        <div class="formulario">
          <p>
            ¿Desactivar a <strong>{{ u.nombre }}</strong
            >? No podrá iniciar sesión y sus tokens dejan de ser válidos.
          </p>
          <div class="acciones">
            <button type="button" class="btn btn-peligro" (click)="desactivar(u)">
              Desactivar
            </button>
            <button type="button" class="btn btn-secundario" (click)="desactivando.set(null)">
              Volver
            </button>
          </div>
        </div>
      </app-dialogo>
    }
  `,
})
export class UsuariosComponent implements OnInit {
  private readonly servicio = inject(UsuariosService);
  private readonly avisos = inject(NotificacionesService);
  private readonly responsables = inject(ResponsablesStore);
  protected readonly auth = inject(AuthService);

  protected readonly usuarios = signal<Usuario[]>([]);
  protected readonly editando = signal<Usuario | 'nuevo' | null>(null);
  protected readonly desactivando = signal<Usuario | null>(null);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.cargar();
  }

  protected guardado(): void {
    this.editando.set(null);
    this.cargar();
  }

  protected desactivar(u: Usuario): void {
    this.servicio.desactivar(u.id).subscribe({
      next: () => {
        this.avisos.exito(`${u.nombre} fue desactivado.`);
        this.desactivando.set(null);
        this.cargar();
      },
      error: (e) => {
        this.avisos.error(interpretarError(e).mensaje);
        this.desactivando.set(null);
      },
    });
  }

  private cargar(): void {
    this.servicio.listar().subscribe({
      next: (u) => this.usuarios.set([...u].sort((a, b) => a.nombre.localeCompare(b.nombre))),
      error: (e) => this.error.set(interpretarError(e).mensaje),
    });
    this.responsables.recargar().subscribe({ error: () => undefined });
  }
}
