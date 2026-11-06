import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { publicConfig } from '../../../testing/garage-fixtures';
import { PrivacyPage } from './privacy.page';

describe('PrivacyPage', () => {
  const render = async () => {
    TestBed.configureTestingModule({
      imports: [PrivacyPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(PrivacyPage);
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/config/public`).flush(publicConfig());
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  it('explica el envío de la foto del tablero, su no conservación y el historial', async () => {
    const element = await render();
    expect(element.textContent).toContain('2026-11-04.1');
    expect(element.textContent).toContain('Foto del tablero');
    expect(element.textContent).toContain('proveedor externo');
    expect(element.textContent).toContain('mejorar sus productos');
    expect(element.textContent).toContain('no la guarda');
    expect(element.textContent).toContain('Historial de diagnósticos');
    expect(element.textContent).toContain('no envía nada a terceros');
  });

  it('no habla de las funciones retiradas', async () => {
    expect((await render()).textContent).not.toMatch(/RUNT|SOAT|RTM|concepto|vigencia/i);
  });
});
