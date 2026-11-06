import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { publicConfig } from '../../../testing/garage-fixtures';
import { PublicConfigService } from './public-config.service';

const URL = `${environment.apiUrl}/config/public`;

describe('PublicConfigService', () => {
  let service: PublicConfigService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PublicConfigService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('pide la configuración una sola vez y la deja en la señal', async () => {
    const first = firstValueFrom(service.load());
    const second = firstValueFrom(service.load());
    http.expectOne(URL).flush(publicConfig());
    await Promise.all([first, second]);
    expect(service.config()?.cardScan.enabled).toBe(true);

    await firstValueFrom(service.load());
    http.expectNone(URL);
  });

  it('si falla devuelve null y permite reintentar', async () => {
    const failed = firstValueFrom(service.load());
    http.expectOne(URL).flush(null, { status: 502, statusText: 'Bad Gateway' });
    expect(await failed).toBeNull();
    expect(service.config()).toBeNull();

    const retry = firstValueFrom(service.load());
    http.expectOne(URL).flush(publicConfig());
    expect((await retry)?.cardScan.enabled).toBe(true);
  });
});
