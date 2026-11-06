import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { RoleType } from '../models/auth.models';

function guard(role?: RoleType): ReturnType<CanActivateFn> {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.restoreSession().pipe(map(valid => {
    if (!valid) return router.createUrlTree(['/auth/login']);
    if (!role || auth.currentRole() === role) return true;
    return router.createUrlTree([auth.isConductor() ? '/conductor/dashboard' : '/pasajero/dashboard']);
  }));
}
export const authGuard: CanActivateFn = () => guard();
export const conductorGuard: CanActivateFn = () => guard('CONDUCTOR');
export const pasajeroGuard: CanActivateFn = () => guard('PASAJERO');
