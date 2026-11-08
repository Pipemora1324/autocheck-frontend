import { TestBed } from '@angular/core/testing';
import { ThemeToggleComponent } from '../../components/theme-toggle/theme-toggle.component';
import { THEME_STORAGE_KEY, ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset['theme'];
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  const prefers = (light: boolean) => {
    vi.stubGlobal('matchMedia', () => ({ matches: light }));
  };

  it('es oscuro por defecto', () => {
    prefers(false);
    expect(TestBed.inject(ThemeService).theme()).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });

  it('respeta prefers-color-scheme si la persona no ha elegido', () => {
    prefers(true);
    expect(TestBed.inject(ThemeService).theme()).toBe('light');
  });

  it('lo elegido gana sobre la preferencia del sistema y persiste', () => {
    prefers(true);
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const service = TestBed.inject(ThemeService);
    expect(service.theme()).toBe('dark');

    service.toggle();
    expect(service.theme()).toBe('light');
    expect(document.documentElement.dataset['theme']).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('un valor guardado inválido se ignora', () => {
    prefers(false);
    localStorage.setItem(THEME_STORAGE_KEY, 'rosado');
    expect(TestBed.inject(ThemeService).theme()).toBe('dark');
  });

  it('sin almacenamiento disponible funciona igual', () => {
    prefers(false);
    const blocked = () => {
      throw new Error('bloqueado');
    };
    vi.stubGlobal('localStorage', { getItem: blocked, setItem: blocked });
    const service = TestBed.inject(ThemeService);
    expect(service.theme()).toBe('dark');
    service.toggle();
    expect(service.theme()).toBe('light');
  });

  it('el interruptor se anuncia y cambia el tema', async () => {
    prefers(false);
    const fixture = TestBed.createComponent(ThemeToggleComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    expect(button.getAttribute('aria-label')).toBe('Cambiar a tema claro');
    expect(button.getAttribute('aria-pressed')).toBe('false');

    button.click();
    await fixture.whenStable();
    expect(button.getAttribute('aria-label')).toBe('Cambiar a tema oscuro');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(document.documentElement.dataset['theme']).toBe('light');
  });
});
