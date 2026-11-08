import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RealtimeService, type ConnectionState } from '../../core/realtime/realtime.service';
import { ConnectionStatusComponent } from './connection-status.component';

describe('ConnectionStatusComponent', () => {
  const state = signal<ConnectionState>('off');

  const render = async (value: ConnectionState) => {
    state.set(value);
    TestBed.configureTestingModule({
      imports: [ConnectionStatusComponent],
      providers: [{ provide: RealtimeService, useValue: { state } }],
    });
    const fixture = TestBed.createComponent(ConnectionStatusComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  it('sin sesión no muestra nada', async () => {
    expect((await render('off')).querySelector('.connection-status')).toBeNull();
  });

  it.each([
    ['connecting', 'Conectando…'],
    ['connected', 'En vivo'],
    ['reconnecting', 'Reconectando…'],
    ['offline', 'Sin conexión en vivo'],
  ] as const)('%s dice "%s", con texto y no solo con color', async (value, text) => {
    const box = (await render(value)).querySelector('.connection-status')!;
    expect(box.textContent).toContain(text);
    expect(box.tagName).toBe('OUTPUT');
    expect(box.classList).toContain(value);
  });
});
