import { ContadorDirective } from '../../components/contador/contador.directive';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { UsuariosService } from '../../services/api/usuarios.service';
import { AuthService } from '../../services/auth/auth.service';
import { interpretarError } from '../../services/errores';
import { ROLES } from '../../data/catalogos.data';
import { Rol, Usuario } from '../../models/usuario';
import { NotificacionesService } from '../../services/notificaciones.service';
import { ResponsablesStore } from '../../services/responsables.store';
import { AvatarComponent } from '../../components/avatar/avatar';
import { DialogoComponent } from '../../components/dialogo/dialogo';
import { EsqueletoComponent } from '../../components/esqueleto/esqueleto';
import { EtiquetaPipe } from '../../utils/etiqueta.pipe';
import { IconoComponent } from '../../components/icono/icono';
import { UsuarioFormComponent } from '../formulario-usuario/formulario-usuario';

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
  templateUrl: './lista-usuarios.html',
  styleUrl: './lista-usuarios.scss',
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
