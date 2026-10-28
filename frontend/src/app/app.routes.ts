import { Routes } from '@angular/router';
import { autenticadoGuard, invitadoGuard, rolGuard } from './core/auth/guards';
import { LoginComponent } from './features/auth/login.component';
import { ShellComponent } from './layout/shell.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [invitadoGuard],
    title: 'Ingresar · LegalDeadline Flow',
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [autenticadoGuard],
    canActivateChild: [rolGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'tablero' },
      {
        path: 'tablero',
        title: 'Tablero · LegalDeadline Flow',
        loadComponent: () =>
          import('./features/tablero/tablero.component').then((m) => m.TableroComponent),
      },
      {
        path: 'expedientes',
        title: 'Expedientes · LegalDeadline Flow',
        loadComponent: () =>
          import('./features/expedientes/expedientes-lista.component').then(
            (m) => m.ExpedientesListaComponent,
          ),
      },
      {
        path: 'expedientes/:id',
        title: 'Expediente · LegalDeadline Flow',
        loadComponent: () =>
          import('./features/expedientes/expediente-detalle.component').then(
            (m) => m.ExpedienteDetalleComponent,
          ),
      },
      {
        path: 'tareas',
        title: 'Tareas · LegalDeadline Flow',
        loadComponent: () =>
          import('./features/tareas/tareas-lista.component').then((m) => m.TareasListaComponent),
      },
      {
        path: 'plazos',
        title: 'Plazos · LegalDeadline Flow',
        loadComponent: () =>
          import('./features/plazos/plazos-lista.component').then((m) => m.PlazosListaComponent),
      },
      {
        path: 'carga',
        title: 'Carga de trabajo · LegalDeadline Flow',
        loadComponent: () =>
          import('./features/carga/carga.component').then((m) => m.CargaComponent),
      },
      {
        path: 'auditoria',
        title: 'Auditoría · LegalDeadline Flow',
        data: { roles: ['ADMINISTRADOR', 'SUPERVISOR', 'AUDITOR'] },
        loadComponent: () =>
          import('./features/auditoria/auditoria.component').then((m) => m.AuditoriaComponent),
      },
      {
        path: 'usuarios',
        title: 'Usuarios · LegalDeadline Flow',
        data: { roles: ['ADMINISTRADOR'] },
        loadComponent: () =>
          import('./features/usuarios/usuarios.component').then((m) => m.UsuariosComponent),
      },
      {
        path: 'sin-permiso',
        title: 'Sin permiso · LegalDeadline Flow',
        loadComponent: () =>
          import('./features/sin-permiso.component').then((m) => m.SinPermisoComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
