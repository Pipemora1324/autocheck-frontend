import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { AuthService } from './core/auth/auth.service';
import { serverStatusInterceptor } from './core/http/server-status.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // serverStatusInterceptor va primero para que sus reintentos vuelvan a pasar por authInterceptor (token vigente).
    provideHttpClient(withInterceptors([serverStatusInterceptor, authInterceptor])),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withViewTransitions({ skipInitialTransition: true }),
    ),
    // Arranca la restauración de sesión sin bloquear el render: los guards esperan su resultado.
    provideAppInitializer(() => {
      inject(AuthService).restoreSession().subscribe();
    }),
  ],
};
