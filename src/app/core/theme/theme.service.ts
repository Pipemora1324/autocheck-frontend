import { DOCUMENT, inject, Injectable, signal } from '@angular/core';

export type Theme = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'autocheck-theme';

/**
 * Oscuro por defecto y respeta prefers-color-scheme, hasta que la persona elija.
 * Un script en index.html aplica el mismo criterio antes de pintar, para que no parpadee.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly themeSignal = signal<Theme>(this.initial());

  readonly theme = this.themeSignal.asReadonly();

  constructor() {
    this.apply(this.themeSignal());
  }

  toggle(): void {
    const next: Theme = this.themeSignal() === 'dark' ? 'light' : 'dark';
    this.themeSignal.set(next);
    this.apply(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Sin almacenamiento (modo privado): el tema dura lo que dure la página.
    }
  }

  private initial(): Theme {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      // Sin almacenamiento: se decide por la preferencia del sistema.
    }
    if (stored === 'dark' || stored === 'light') return stored;
    const prefersLight =
      typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: light)').matches;
    return prefersLight ? 'light' : 'dark';
  }

  private apply(theme: Theme): void {
    this.document.documentElement.dataset['theme'] = theme;
  }
}
