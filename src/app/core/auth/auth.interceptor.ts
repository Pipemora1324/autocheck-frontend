import { HttpErrorResponse, type HttpInterceptorFn, type HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { apiErrorCode, EMAIL_NOT_VERIFIED } from '../http/api-error';
import { SKIP_AUTH_REFRESH } from './auth.context';
import { AuthService } from './auth.service';

const isApiRequest = (url: string) =>
  url === environment.apiUrl || url.startsWith(`${environment.apiUrl}/`);

const isUnauthorized = (error: unknown) =>
  error instanceof HttpErrorResponse && error.status === 401;

const isEmailNotVerified = (error: unknown) =>
  error instanceof HttpErrorResponse &&
  error.status === 403 &&
  apiErrorCode(error) === EMAIL_NOT_VERIFIED;

const withToken = (request: HttpRequest<unknown>, token: string | null) =>
  token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  // Credenciales y token solo hacia nuestra API, nunca hacia terceros.
  if (!isApiRequest(request.url)) return next(request);

  const auth = inject(AuthService);
  const router = inject(Router);
  const apiRequest = request.clone({ withCredentials: true });

  const endSession = (error: unknown) => {
    auth.clearSession();
    if (!router.url.startsWith('/login')) {
      void router.navigate(['/login'], {
        queryParams: { returnUrl: router.url, sesion: 'expirada' },
      });
    }
    return throwError(() => error);
  };

  return next(withToken(apiRequest, auth.getAccessToken())).pipe(
    catchError((error: unknown) => {
      // /garage/* exige correo confirmado: se marca al usuario para mostrar el aviso con "reenviar correo".
      if (isEmailNotVerified(error)) auth.setEmailVerified(false);
      if (!isUnauthorized(error) || request.context.get(SKIP_AUTH_REFRESH))
        return throwError(() => error);

      // Un solo intento de refresh (compartido entre peticiones simultáneas) y un solo reintento.
      // El reintento va directo a `next`, así que no vuelve a pasar por este interceptor: no hay bucles.
      return auth.refresh().pipe(
        catchError(endSession),
        switchMap((token) =>
          next(withToken(apiRequest, token)).pipe(
            catchError((retryError: unknown) =>
              isUnauthorized(retryError) ? endSession(retryError) : throwError(() => retryError),
            ),
          ),
        ),
      );
    }),
  );
};
