import { ContadorDirective } from '../../directives/contador.directive';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { UsuariosService } from '../../services/api/usuarios.service';
import { AuthService } from '../../services/auth/auth.service';
import { interpretarError } from '../../utils/errores';
import { ROLES, Rol, Usuario } from '../../models';
import { NotificacionesService } from '../../services/notificaciones.service';
import { ResponsablesStore } from '../../services/state/responsables.store';
import { AvatarComponent } from '../../components/ui/avatar/avatar.component';
import { DialogoComponent } from '../../components/ui/dialogo/dialogo.component';
import { EsqueletoComponent } from '../../components/ui/esqueleto/esqueleto.component';
import { EtiquetaPipe } from '../../pipes/etiqueta.pipe';
import { IconoComponent } from '../../components/ui/icono/icono.component';
import { UsuarioFormComponent } from '../../components/usuarios/usuario-form/usuario-form.component';

/** RF02: administración de cuentas y roles. */
@Component({
  selector: 'app-usuarios',
  imports: [
    ContadorDirective,
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
  protected readonly plurales: Record<Rol, string> = {
    ADMINISTRADOR: 'Administradores',
    SUPERVISOR: 'Supervisores',
    RESPONSABLE: 'Responsables',
    AUDITOR: 'Auditores',
  };

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
