import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, map, Observable, of, shareReplay, throwError } from 'rxjs';
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
  readonly isAdmin = computed(() => this.userState()?.role === 'admin');

  getAccessToken(): string | null {
    return this.accessToken;
  }

  login(email: string, password: string): Observable<AuthUser> {
    return this.http
      .post<SessionResponse>(`${this.apiUrl}/auth/login`, { email, password }, { context: skipAuthRefresh(), withCredentials: true })
      .pipe(map((session) => this.setSession(session)));
  }

  register(email: string, password: string): Observable<AuthUser> {
    return this.http
      .post<SessionResponse>(`${this.apiUrl}/auth/register`, { email, password }, { context: skipAuthRefresh(), withCredentials: true })
      .pipe(map((session) => this.setSession(session)));
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
      .post<void>(`${this.apiUrl}/auth/logout`, null, { context: skipAuthRefresh(), withCredentials: true })
      .pipe(
        catchError(() => of(undefined)),
        map(() => undefined),
        finalize(() => this.clearSession())
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
