import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { PerfilService } from '../services/perfil.service';
import { perfilCompleto } from '../models/perfil.models';

/** Applied after the authentication/role guard. Profile editors deliberately exclude this guard. */
export const perfilGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const service = inject(PerfilService);
  return auth.restoreSession().pipe(
    switchMap((valid) =>
      valid
        ? service
            .obtener()
            .pipe(
              map((perfil) =>
                perfilCompleto(perfil, auth.currentRole())
                  ? true
                  : router.createUrlTree(['/configuracion/perfil']),
              ),
            )
        : of(router.createUrlTree(['/auth/login'])),
    ),
    catchError(() =>
      of(router.createUrlTree([auth.isAuthenticated() ? '/configuracion/perfil' : '/auth/login'])),
    ),
  );
};
