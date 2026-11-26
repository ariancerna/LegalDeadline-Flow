import { Routes } from '@angular/router';
import { autenticadoGuard, invitadoGuard, rolGuard } from './guards/auth.guards';
import { LoginComponent } from './pages/login/login.component';
import { ShellComponent } from './components/layout/shell/shell.component';

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
          import('./pages/tablero/tablero.component').then((m) => m.TableroComponent),
      },
      {
        path: 'expedientes',
        title: 'Expedientes · LegalDeadline Flow',
        loadComponent: () =>
          import('./pages/expedientes-lista/expedientes-lista.component').then(
            (m) => m.ExpedientesListaComponent,
          ),
      },
      {
        path: 'expedientes/:id',
        title: 'Expediente · LegalDeadline Flow',
        loadComponent: () =>
          import('./pages/expediente-detalle/expediente-detalle.component').then(
            (m) => m.ExpedienteDetalleComponent,
          ),
      },
      {
        path: 'tareas',
        title: 'Tareas · LegalDeadline Flow',
        loadComponent: () =>
          import('./pages/tareas-lista/tareas-lista.component').then((m) => m.TareasListaComponent),
      },
      {
        path: 'plazos',
        title: 'Plazos · LegalDeadline Flow',
        loadComponent: () =>
          import('./pages/plazos-lista/plazos-lista.component').then((m) => m.PlazosListaComponent),
      },
      {
        path: 'carga',
        title: 'Carga de trabajo · LegalDeadline Flow',
        loadComponent: () => import('./pages/carga/carga.component').then((m) => m.CargaComponent),
      },
      {
        path: 'auditoria',
        title: 'Auditoría · LegalDeadline Flow',
        data: { roles: ['ADMINISTRADOR', 'SUPERVISOR', 'AUDITOR'] },
        loadComponent: () =>
          import('./pages/auditoria/auditoria.component').then((m) => m.AuditoriaComponent),
      },
      {
        path: 'usuarios',
        title: 'Usuarios · LegalDeadline Flow',
        data: { roles: ['ADMINISTRADOR'] },
        loadComponent: () =>
          import('./pages/usuarios/usuarios.component').then((m) => m.UsuariosComponent),
      },
      {
        path: 'sin-permiso',
        title: 'Sin permiso · LegalDeadline Flow',
        loadComponent: () =>
          import('./pages/sin-permiso/sin-permiso.component').then((m) => m.SinPermisoComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
