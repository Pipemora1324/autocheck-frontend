import { Routes } from '@angular/router';
import { authGuard, guestGuard, homeGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [homeGuard],
    title: 'Mi garaje · AutoCheck-CO',
    loadComponent: () => import('./pages/garage/garage.page').then((m) => m.GaragePage),
  },
  {
    path: 'inicio',
    canActivate: [guestGuard],
    title: 'Diagnóstico de testigos del tablero · AutoCheck-CO',
    loadComponent: () => import('./pages/landing/landing.page').then((m) => m.LandingPage),
  },
  {
    path: 'garaje/nuevo',
    canActivate: [authGuard],
    title: 'Agregar vehículo · AutoCheck-CO',
    loadComponent: () => import('./pages/garage/add-vehicle.page').then((m) => m.AddVehiclePage),
  },
  {
    path: 'garaje/:placa',
    canActivate: [authGuard],
    title: 'Vehículo · AutoCheck-CO',
    loadComponent: () =>
      import('./pages/garage/vehicle-detail.page').then((m) => m.VehicleDetailPage),
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Iniciar sesión · AutoCheck-CO',
    loadComponent: () => import('./pages/auth/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'registro',
    canActivate: [guestGuard],
    title: 'Crear cuenta · AutoCheck-CO',
    loadComponent: () => import('./pages/auth/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'olvide-contrasena',
    title: 'Recuperar contraseña · AutoCheck-CO',
    loadComponent: () =>
      import('./pages/auth/forgot-password.page').then((m) => m.ForgotPasswordPage),
  },
  {
    // La ruta debe coincidir con el enlace del correo: APP_URL/reset-password?token=...
    path: 'reset-password',
    title: 'Nueva contraseña · AutoCheck-CO',
    loadComponent: () =>
      import('./pages/auth/reset-password.page').then((m) => m.ResetPasswordPage),
  },
  {
    // La ruta debe coincidir con el enlace del correo: APP_URL/verify-email?token=...
    path: 'verify-email',
    title: 'Confirmar correo · AutoCheck-CO',
    loadComponent: () => import('./pages/auth/verify-email.page').then((m) => m.VerifyEmailPage),
  },
  {
    path: 'cuenta',
    canActivate: [authGuard],
    title: 'Mi cuenta · AutoCheck-CO',
    loadComponent: () => import('./pages/account/account.page').then((m) => m.AccountPage),
  },
  {
    path: 'privacidad',
    title: 'Privacidad · AutoCheck-CO',
    loadComponent: () => import('./pages/privacy/privacy.page').then((m) => m.PrivacyPage),
  },
  { path: '**', redirectTo: '' },
];
