import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { UsuariosService } from '../../core/api/usuarios.service';
import { AuthService } from '../../core/auth/auth.service';
import { interpretarError } from '../../core/errores';
import { ROLES, Rol, Usuario } from '../../core/models';
import { NotificacionesService } from '../../core/notificaciones.service';
import { ResponsablesStore } from '../../core/responsables.store';
import { AvatarComponent } from '../../shared/avatar.component';
import { DialogoComponent } from '../../shared/dialogo.component';
import { EsqueletoComponent } from '../../shared/esqueleto.component';
import { EtiquetaPipe } from '../../shared/etiqueta.pipe';
import { IconoComponent } from '../../shared/icono.component';
import { NombreIcono } from '../../shared/iconos.generados';
import { UsuarioFormComponent } from './usuario-form.component';

const ICONO_ROL: Record<Rol, NombreIcono> = {
  ADMINISTRADOR: 'key-round',
  SUPERVISOR: 'shield-check',
  RESPONSABLE: 'briefcase',
  AUDITOR: 'scroll-text',
};

/** RF02: administración de cuentas y roles. */
@Component({
  selector: 'app-usuarios',
  imports: [
    EtiquetaPipe,
    DialogoComponent,
    UsuarioFormComponent,
    IconoComponent,
    AvatarComponent,
    EsqueletoComponent,
  ],
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.scss',
})
export class UsuariosComponent implements OnInit {
  private readonly servicio = inject(UsuariosService);
  private readonly avisos = inject(NotificacionesService);
  private readonly responsables = inject(ResponsablesStore);
  protected readonly auth = inject(AuthService);
  protected readonly iconoRol = ICONO_ROL;

  protected readonly usuarios = signal<Usuario[] | null>(null);
  protected readonly editando = signal<Usuario | 'nuevo' | null>(null);
  protected readonly desactivando = signal<Usuario | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly porRol = computed(() =>
    ROLES.map((rol) => ({
      rol,
      cuenta: (this.usuarios() ?? []).filter((u) => u.rol === rol && u.activo).length,
    })),
  );

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
      next: (u) =>
        this.usuarios.set(
          [...u].sort(
            (a, b) => Number(b.activo) - Number(a.activo) || a.nombre.localeCompare(b.nombre),
          ),
        ),
      error: (e) => this.error.set(interpretarError(e).mensaje),
    });
    this.responsables.recargar().subscribe({ error: () => undefined });
  }
}
