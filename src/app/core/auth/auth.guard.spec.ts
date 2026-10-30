import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree, type ActivatedRouteSnapshot, type RouterStateSnapshot } from '@angular/router';
import { firstValueFrom, isObservable, Observable, Subject } from 'rxjs';
import { authGuard, guestGuard } from './auth.guard';
import { AuthService } from './auth.service';

class AuthStub {
  readonly restore = new Subject<void>();
  readonly isAuthenticated = signal(false);
  restoreSession(): Observable<void> {
    return this.restore.asObservable();
  }
  finishRestore(authenticated: boolean) {
    this.isAuthenticated.set(authenticated);
    this.restore.next();
    this.restore.complete();
  }
}

describe('guards de autenticación', () => {
  let auth: AuthStub;
  let router: Router;
  const route = {} as ActivatedRouteSnapshot;
  const state = (url: string) => ({ url }) as RouterStateSnapshot;

  const run = (guard: typeof authGuard, url = '/') => {
    const result = TestBed.runInInjectionContext(() => guard(route, state(url)));
    if (!isObservable(result)) throw new Error('Se esperaba un Observable');
    return result as Observable<boolean | UrlTree>;
  };

  beforeEach(() => {
    auth = new AuthStub();
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthService, useValue: auth }] });
    router = TestBed.inject(Router);
  });

  it('espera a que termine la restauración de la sesión antes de decidir', () => {
    let decided: boolean | UrlTree | undefined;
    run(authGuard).subscribe((value) => (decided = value));
    expect(decided).toBeUndefined();

    auth.finishRestore(true);
    expect(decided).toBe(true);
  });

  it('deja pasar con sesión activa', async () => {
    const result = firstValueFrom(run(authGuard));
    auth.finishRestore(true);
    expect(await result).toBe(true);
  });

  it('sin sesión redirige a /login conservando la URL de retorno', async () => {
    const result = firstValueFrom(run(authGuard, '/?placa=ABC-1234'));
    auth.finishRestore(false);
    const tree = await result;
    expect(tree).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(tree as UrlTree)).toBe('/login?returnUrl=%2F%3Fplaca%3DABC-1234');
  });

  it('guestGuard manda al inicio si ya hay sesión', async () => {
    const result = firstValueFrom(run(guestGuard, '/login'));
    auth.finishRestore(true);
    expect(router.serializeUrl((await result) as UrlTree)).toBe('/');
  });

  it('guestGuard deja ver el login sin sesión', async () => {
    const result = firstValueFrom(run(guestGuard, '/login'));
    auth.finishRestore(false);
    expect(await result).toBe(true);
  });
});
