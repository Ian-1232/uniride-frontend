import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.currentUser()) {
    return true;
  }

  router.navigate(['/auth/login']);
  return false;
};

export const conductorGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isConductor()) {
    return true;
  }

  router.navigate(['/pasajero/dashboard']);
  return false;
};

export const pasajeroGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isPasajero()) {
    return true;
  }

  router.navigate(['/conductor/dashboard']);
  return false;
};
