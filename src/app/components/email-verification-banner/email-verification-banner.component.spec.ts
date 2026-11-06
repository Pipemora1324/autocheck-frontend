import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { sessionFor } from '../../../testing/auth-fixtures';
import { AuthService } from '../../core/auth/auth.service';
import { EmailVerificationBannerComponent } from './email-verification-banner.component';

const API = environment.apiUrl;

describe('EmailVerificationBannerComponent', () => {
  let http: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [EmailVerificationBannerComponent], providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => { http.verify(); });

  const signIn = (emailVerified: boolean) => {
    auth.login('ana@example.com', 'x').subscribe();
    http.expectOne(`${API}/auth/login`).flush(sessionFor('access-1', 'user', emailVerified));
  };

  const render = async () => {
    const fixture = TestBed.createComponent(EmailVerificationBannerComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  };

  it('no se muestra con el correo confirmado', async () => {
    signIn(true);
    const fixture = await render();
    expect((fixture.nativeElement as HTMLElement).querySelector('.notice-banner')).toBeNull();
  });

  it('se muestra sin confirmar y reenvía el correo', async () => {
    signIn(false);
    const fixture = await render();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.notice-banner')?.textContent).toContain('Confirma tu correo');

    element.querySelector<HTMLButtonElement>('.notice-action')!.click();
    const request = http.expectOne(`${API}/auth/resend-verification`);
    expect(request.request.body).toEqual({ email: 'ana@example.com' });
    request.flush({ message: 'Si el correo está registrado y aún no se ha confirmado, recibirás un nuevo enlace.' }, { status: 202, statusText: 'Accepted' });
    await fixture.whenStable();
    expect(element.querySelector('.notice-feedback')?.textContent).toContain('recibirás un nuevo enlace');
  });
});
