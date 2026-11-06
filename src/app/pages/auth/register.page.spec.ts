import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { sessionFor } from '../../../testing/auth-fixtures';
import { publicConfig } from '../../../testing/garage-fixtures';
import { RegisterPage } from './register.page';

const API = environment.apiUrl;

describe('RegisterPage', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RegisterPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });

  afterEach(() => {
    http.verify();
  });

  const render = async () => {
    const fixture = TestBed.createComponent(RegisterPage);
    fixture.detectChanges();
    http.expectOne(`${API}/config/public`).flush(publicConfig());
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const type = (selector: string, value: string) => {
      const input = element.querySelector<HTMLInputElement>(selector)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    const clave = 'clave-larga-1';
    type('#register-email', 'ana@example.com');
    type('#register-password', clave);
    type('#register-confirm', clave);
    return { fixture, element, clave };
  };

  it('muestra el enlace a la política y el texto de autorización del backend', async () => {
    const { element } = await render();
    expect(element.querySelector('a[href="/privacidad"]')).toBeTruthy();
    expect(element.textContent).toContain('Autorizo a AutoCheck-CO a tratar mis datos personales.');
  });

  it('no envía el registro sin aceptar el tratamiento de datos', async () => {
    const { fixture, element } = await render();
    element.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    http.expectNone(`${API}/auth/register`);
    expect(element.textContent).toContain('Debes autorizar el tratamiento de tus datos');
  });

  it('envía acceptedTerms: true al marcar la casilla', async () => {
    const { element, clave } = await render();
    element.querySelector<HTMLInputElement>('#register-terms')!.click();
    element.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    const request = http.expectOne(`${API}/auth/register`);
    expect(request.request.body).toEqual({
      email: 'ana@example.com',
      password: clave,
      acceptedTerms: true,
    });
    request.flush(sessionFor('access-1', 'user', false), { status: 201, statusText: 'Created' });
  });
});
