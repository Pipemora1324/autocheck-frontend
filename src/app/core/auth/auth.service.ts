import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, map, Observable, of, shareReplay, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { skipAuthRefresh } from './auth.context';
import type { AuthStatus, AuthUser, MessageResponse, SessionResponse } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  // El access token vive solo en memoria: nunca en localStorage/sessionStorage.
  private accessToken: string | null = null;
  private refreshInFlight$: Observable<string> | null = null;
  private restore$: Observable<void> | null = null;

  private readonly userState = signal<AuthUser | null>(null);
  private readonly statusState = signal<AuthStatus>('unknown');

  readonly user = this.userState.asReadonly();
  readonly status = this.statusState.asReadonly();
  readonly isAuthenticated = computed(() => this.statusState() === 'authenticated');

  getAccessToken(): string | null {
    return this.accessToken;
  }

  login(email: string, password: string): Observable<AuthUser> {
    return this.http
      .post<SessionResponse>(`${this.apiUrl}/auth/login`, { email, password }, { context: skipAuthRefresh(), withCredentials: true })
      .pipe(map((session) => this.setSession(session)));
  }

  /** El backend exige acceptedTerms === true y guarda él mismo la fecha y la versión de la política. */
  register(email: string, password: string, acceptedTerms: boolean): Observable<AuthUser> {
    return this.http
      .post<SessionResponse>(
        `${this.apiUrl}/auth/register`,
        { email, password, acceptedTerms },
        { context: skipAuthRefresh(), withCredentials: true }
      )
      .pipe(map((session) => this.setSession(session)));
  }

  verifyEmail(token: string): Observable<MessageResponse> {
    return this.http
      .post<MessageResponse>(`${this.apiUrl}/auth/verify-email`, { token }, { context: skipAuthRefresh() })
      .pipe(tap(() => { this.setEmailVerified(true); }));
  }

  /** Responde siempre 202 con el mismo mensaje, exista o no el correo. */
  resendVerification(email: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.apiUrl}/auth/resend-verification`, { email }, { context: skipAuthRefresh() });
  }

  /** DELETE /auth/me. Una contraseña errada responde 403 INVALID_PASSWORD (no 401), así que la sesión sigue viva. */
  deleteAccount(password: string): Observable<void> {
    return this.http
      .delete<undefined>(`${this.apiUrl}/auth/me`, { body: { password } })
      .pipe(tap(() => { this.clearSession(); }));
  }

  /** Lo usa el interceptor cuando el backend responde 403 EMAIL_NOT_VERIFIED, y la pantalla /verify-email al confirmar. */
  setEmailVerified(verified: boolean): void {
    this.userState.update((user) => (user && user.emailVerified !== verified ? { ...user, emailVerified: verified } : user));
  }

  /**
   * Pide un access token nuevo con la cookie httpOnly. Las llamadas simultáneas comparten
   * una sola petición, porque cada refresh rota la cookie y un segundo uso invalidaría la sesión.
   */
  refresh(): Observable<string> {
    this.refreshInFlight$ ??= this.http
      .post<SessionResponse>(`${this.apiUrl}/auth/refresh`, null, { context: skipAuthRefresh(), withCredentials: true })
      .pipe(
        map((session) => {
          this.setSession(session);
          return session.accessToken;
        }),
        catchError((error: unknown) => {
          this.clearSession();
          return throwError(() => error);
        }),
        finalize(() => (this.refreshInFlight$ = null)),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    return this.refreshInFlight$;
  }

  /** Intenta recuperar la sesión al cargar la app. Se ejecuta una sola vez y nunca falla. */
  restoreSession(): Observable<void> {
    this.restore$ ??= this.refresh().pipe(
      map(() => undefined),
      catchError(() => of(undefined)),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    return this.restore$;
  }

  logout(): Observable<void> {
    return this.http
      .post<undefined>(`${this.apiUrl}/auth/logout`, null, { context: skipAuthRefresh(), withCredentials: true })
      .pipe(
        catchError(() => of(undefined)),
        map(() => undefined),
        finalize(() => { this.clearSession(); })
      );
  }

  forgotPassword(email: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.apiUrl}/auth/forgot-password`, { email }, { context: skipAuthRefresh() });
  }

  resetPassword(token: string, password: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.apiUrl}/auth/reset-password`, { token, password }, { context: skipAuthRefresh() });
  }

  clearSession(): void {
    this.accessToken = null;
    this.userState.set(null);
    this.statusState.set('anonymous');
  }

  private setSession(session: SessionResponse): AuthUser {
    this.accessToken = session.accessToken;
    this.userState.set(session.user);
    this.statusState.set('authenticated');
    return session.user;
  }
}
