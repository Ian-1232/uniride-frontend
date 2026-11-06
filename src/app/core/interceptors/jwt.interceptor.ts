import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const origin = globalThis.location?.origin ?? 'http://localhost';
  const api = new URL(environment.apiUrl, origin);
  const target = new URL(req.url, origin);
  const isApi = target.origin === api.origin && target.pathname.startsWith(`${api.pathname}/`);
  const isAuth = target.pathname.startsWith(`${api.pathname}/auth/`);
  const token = isApi && !isAuth ? auth.getToken() : null;
  return next(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req).pipe(
    catchError((err: HttpErrorResponse) => {
      // A forbidden operation is not an expired session; its caller handles 403.
      if (token && err.status === 401 && auth.getToken() === token) auth.logout();
      return throwError(() => err);
    }),
  );
};
