import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Rol } from '../models';
import { AuthService } from './auth.service';

/** Exige sesión iniciada. */
export const autenticadoGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.token() !== null ? true : inject(Router).createUrlTree(['/login']);
};

/** Evita mostrar el login a quien ya inició sesión. */
export const invitadoGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.token() === null ? true : inject(Router).createUrlTree(['/tablero']);
};

/** Exige uno de los roles indicados en `data.roles` de la ruta. */
export const rolGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const roles = (route.data['roles'] as Rol[] | undefined) ?? [];
  return roles.length === 0 || auth.tieneRol(...roles)
    ? true
    : inject(Router).createUrlTree(['/sin-permiso']);
};
