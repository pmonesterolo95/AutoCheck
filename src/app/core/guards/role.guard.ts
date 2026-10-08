import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Bloquea el acceso a rutas de administración si el rol no es ADMIN. */
export const roleGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.whenReady();
  return auth.isAuthenticated() && auth.isAdmin() ? true : router.createUrlTree(['/dashboard']);
};
