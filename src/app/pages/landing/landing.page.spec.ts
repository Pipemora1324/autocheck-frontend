import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LandingPage } from './landing.page';

describe('LandingPage', () => {
  const render = async () => {
    TestBed.configureTestingModule({ imports: [LandingPage], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(LandingPage);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  it('explica el diagnóstico de testigos y lleva a crear cuenta o iniciar sesión', async () => {
    const element = await render();
    expect(element.querySelector('h1')?.textContent).toContain('tablero');
    expect(element.querySelector('a[href="/registro"]')).toBeTruthy();
    expect(element.querySelector('a[href="/login"]')).toBeTruthy();
    expect(element.textContent).toContain('Un mecánico debe confirmar el diagnóstico.');
  });

  it('no menciona las funciones retiradas', async () => {
    expect((await render()).textContent).not.toMatch(/RUNT|SOAT|RTM|vencimiento|peritaje/i);
  });
});
