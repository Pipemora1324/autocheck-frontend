import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { sessionFor } from '../../../testing/auth-fixtures';
import { AuthService } from '../../core/auth/auth.service';
import { AccountPage } from './account.page';

const API = environment.apiUrl;

describe('AccountPage', () => {
  let http: HttpTestingController;
  let auth: AuthService;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AccountPage], providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    auth.login('ana@example.com', 'x').subscribe();
    http.expectOne(`${API}/auth/login`).flush(sessionFor('access-1'));
  });

  afterEach(() => { http.verify(); });

  const openAndSubmit = async (password: string) => {
    const fixture = TestBed.createComponent(AccountPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('.panel .danger-button')!.click();
    await fixture.whenStable();
    const input = element.querySelector<HTMLInputElement>('#delete-password')!;
    input.value = password;
    input.dispatchEvent(new Event('input'));
    element.querySelector<HTMLFormElement>('[role="dialog"] form')!.dispatchEvent(new Event('submit'));
    return { fixture, element };
  };

  it('pide la contraseña y elimina la cuenta', async () => {
    const clave = 'mi-clave-segura';
    await openAndSubmit(clave);
    const request = http.expectOne(`${API}/auth/me`);
    expect(request.request.method).toBe('DELETE');
    expect(request.request.body).toEqual({ password: clave });
    request.flush(null, { status: 204, statusText: 'No Content' });

    expect(auth.isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { cuenta: 'eliminada' } });
  });

  it('con la contraseña errada lo dice y mantiene la sesión', async () => {
    const { fixture, element } = await openAndSubmit('mala');
    http.expectOne(`${API}/auth/me`).flush({ message: 'Contraseña incorrecta.', code: 'INVALID_PASSWORD' }, { status: 403, statusText: 'Forbidden' });
    await fixture.whenStable();
    expect(element.querySelector('.form-error')?.textContent).toContain('La contraseña no es correcta.');
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('no llama a la API sin contraseña', async () => {
    const { fixture, element } = await openAndSubmit('');
    await fixture.whenStable();
    http.expectNone(`${API}/auth/me`);
    expect(element.querySelector('.form-error')?.textContent).toContain('Escribe tu contraseña');
  });
});
