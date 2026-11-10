import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import type { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { publicConfig } from '../../../testing/garage-fixtures';
import { LoginPage } from './login.page';
import { RegisterPage } from './register.page';
import { ResetPasswordPage } from './reset-password.page';

const API = environment.apiUrl;
// Código de recuperación falso: la pantalla solo comprueba que exista.
const CODIGO_FALSO = 'enlace-de-prueba';

describe('Ojito de la contraseña en las pantallas de acceso', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ token: CODIGO_FALSO }) } },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    http.verify();
  });

  const render = async (page: Type<unknown>) => {
    const fixture = TestBed.createComponent(page);
    fixture.detectChanges();
    if (page === RegisterPage) http.expectOne(`${API}/config/public`).flush(publicConfig());
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  };

  it.each([
    ['inicio de sesión', LoginPage, ['login-password'], 'current-password'],
    ['registro', RegisterPage, ['register-password', 'register-confirm'], 'new-password'],
    ['restablecer', ResetPasswordPage, ['reset-password', 'reset-confirm'], 'new-password'],
  ] as const)(
    '%s: cada campo de contraseña tiene su botón y conserva el autocomplete',
    async (_name, page, ids, autocomplete) => {
      const { fixture, element } = await render(page);
      const buttons = element.querySelectorAll<HTMLButtonElement>('.password-toggle');
      expect(buttons).toHaveLength(ids.length);

      for (const [index, id] of ids.entries()) {
        const input = element.querySelector<HTMLInputElement>(`#${id}`)!;
        const button = buttons[index];
        expect(input.closest('app-password-field')).toBe(button.closest('app-password-field'));
        expect(button.getAttribute('type')).toBe('button');
        expect(button.getAttribute('aria-controls')).toBe(id);
        expect(input.getAttribute('autocomplete')).toBe(autocomplete);
        expect(element.querySelector(`label[for="${id}"]`)).toBeTruthy();

        button.click();
        fixture.detectChanges();
        expect(input.type).toBe('text');
        expect(button.getAttribute('aria-label')).toBe('Ocultar contraseña');
      }
      // Ningún clic del ojito envió el formulario.
      http.expectNone(() => true);
    },
  );
});
