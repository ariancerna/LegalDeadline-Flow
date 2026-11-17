import { Routes } from '@angular/router';
import { autenticadoGuard, invitadoGuard, rolGuard } from './services/auth/guards';
import { LoginComponent } from './pages/login/login';
import { ShellComponent } from './components/shell/shell';

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
          import('./pages/inicio/inicio').then((m) => m.TableroComponent),
      },
      {
        path: 'expedientes',
        title: 'Expedientes · LegalDeadline Flow',
        loadComponent: () =>
          import('./pages/lista-expedientes/lista-expedientes').then(
            (m) => m.ExpedientesListaComponent,
          ),
      },
      {
        path: 'expedientes/:id',
        title: 'Expediente · LegalDeadline Flow',
        loadComponent: () =>
          import('./pages/detalle-expediente/detalle-expediente').then(
            (m) => m.ExpedienteDetalleComponent,
          ),
      },
      {
        path: 'tareas',
        title: 'Tareas · LegalDeadline Flow',
        loadComponent: () =>
          import('./pages/lista-tareas/lista-tareas').then((m) => m.TareasListaComponent),
      },
      {
        path: 'plazos',
        title: 'Plazos · LegalDeadline Flow',
        loadComponent: () =>
          import('./pages/lista-plazos/lista-plazos').then((m) => m.PlazosListaComponent),
      },
      {
        path: 'carga',
        title: 'Carga de trabajo · LegalDeadline Flow',
        loadComponent: () =>
          import('./pages/carga/carga').then((m) => m.CargaComponent),
      },
      {
        path: 'auditoria',
        title: 'Auditoría · LegalDeadline Flow',
        data: { roles: ['ADMINISTRADOR', 'SUPERVISOR', 'AUDITOR'] },
        loadComponent: () =>
          import('./pages/auditoria/auditoria').then((m) => m.AuditoriaComponent),
      },
      {
        path: 'usuarios',
        title: 'Usuarios · LegalDeadline Flow',
        data: { roles: ['ADMINISTRADOR'] },
        loadComponent: () =>
          import('./pages/lista-usuarios/lista-usuarios').then((m) => m.UsuariosComponent),
      },
      {
        path: 'sin-permiso',
        title: 'Sin permiso · LegalDeadline Flow',
        loadComponent: () =>
          import('./pages/sin-permiso/sin-permiso').then((m) => m.SinPermisoComponent),
      },
      {
        path: '**',
        title: 'Página no encontrada · LegalDeadline Flow',
        loadComponent: () =>
          import('./pages/no-encontrado/no-encontrado').then((m) => m.NoEncontradoComponent),
      },
    ],
  },
];
