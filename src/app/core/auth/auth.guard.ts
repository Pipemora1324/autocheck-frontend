import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';

/** Exige sesión. Espera a que termine la restauración inicial para no expulsar a quien recarga la página. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.restoreSession().pipe(
    map(() => auth.isAuthenticated() || router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } }))
  );
};

/** Para login/registro: si ya hay sesión, lleva al inicio. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.restoreSession().pipe(map(() => !auth.isAuthenticated() || router.createUrlTree(['/'])));
};
