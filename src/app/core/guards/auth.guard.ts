import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Bloquea el acceso a rutas privadas si no hay sesión. */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.whenReady();
  return auth.isAuthenticated() ? true : router.createUrlTree(['/auth/login']);
};

/** Redirige al dashboard si el usuario ya tiene sesión (login/registro). */
export const noAuthGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.whenReady();
  return auth.isAuthenticated() ? router.createUrlTree(['/dashboard']) : true;
};
