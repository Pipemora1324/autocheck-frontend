import { TestBed } from '@angular/core/testing';
import { CountUpComponent } from './count-up/count-up.component';
import { EmptyStateComponent } from './empty-state/empty-state.component';
import { ModalComponent } from './modal/modal.component';
import { SkeletonComponent } from './skeleton/skeleton.component';
import { SpeedometerComponent } from './speedometer/speedometer.component';
import { TelltaleIconComponent } from './telltale-icon/telltale-icon.component';
import { UrgencyGaugeComponent } from './urgency-gauge/urgency-gauge.component';

const render = async <T>(component: new () => T, inputs: Record<string, unknown> = {}) => {
  const fixture = TestBed.createComponent(component);
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, element: fixture.nativeElement as HTMLElement };
};

describe('TelltaleIconComponent', () => {
  const CATEGORIES = [
    'aceite',
    'temperatura',
    'frenos',
    'freno_mano',
    'direccion',
    'airbag',
    'bateria_carga',
    'motor_emisiones',
    'transmision',
    'llantas',
    'estabilidad_abs',
    'combustible',
    'luces',
    'informativo',
    'otro',
  ];

  it('cada categoría del backend tiene su propio dibujo', async () => {
    const drawings = new Set<string>();
    for (const category of CATEGORIES) {
      const { element } = await render(TelltaleIconComponent, { category });
      const path = element.querySelector('path')!.getAttribute('d')!;
      expect(path.length, category).toBeGreaterThan(10);
      drawings.add(path);
    }
    expect(drawings.size).toBe(CATEGORIES.length);
  });

  it('una categoría desconocida muestra la advertencia, y es decorativo', async () => {
    const { element } = await render(TelltaleIconComponent, { category: 'nueva' });
    const fallback = await render(TelltaleIconComponent, { category: 'otro' });
    expect(element.querySelector('path')!.getAttribute('d')).toBe(
      fallback.element.querySelector('path')!.getAttribute('d'),
    );
    expect(element.querySelector('.telltale-icon')!.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('UrgencyGaugeComponent', () => {
  const angle = (element: HTMLElement) =>
    element.querySelector<SVGElement>('.gauge-needle')!.style.getPropertyValue('--needle-angle');
  const label = (element: HTMLElement) => element.querySelector('svg')!.getAttribute('aria-label');

  it('la aguja señala la urgencia, y el texto no depende del color', async () => {
    const info = (await render(UrgencyGaugeComponent, { severity: 'informativo' })).element;
    expect(angle(info)).toBe('-58deg');
    expect(label(info)).toBe('Medidor de urgencia: No es una falla');

    const yellow = (await render(UrgencyGaugeComponent, { severity: 'amarillo' })).element;
    expect(angle(yellow)).toBe('0deg');
    expect(label(yellow)).toBe('Medidor de urgencia: Revísalo pronto');
  });

  it('solo ordenar detenerse lleva la aguja al tope y dice "Detente"', async () => {
    const stop = (await render(UrgencyGaugeComponent, { severity: 'rojo', stop: true })).element;
    expect(angle(stop)).toBe('80deg');
    expect(label(stop)).toBe('Medidor de urgencia: Detente');

    const airbag = (await render(UrgencyGaugeComponent, { severity: 'rojo', stop: false })).element;
    expect(angle(airbag)).toBe('58deg');
    expect(label(airbag)).toBe('Medidor de urgencia: Revísalo hoy');
  });

  it('resalta solo la zona activa', async () => {
    const { element } = await render(UrgencyGaugeComponent, { severity: 'amarillo' });
    const active = [...element.querySelectorAll('.gauge-zone.active')];
    expect(active).toHaveLength(1);
    expect(active[0].classList).toContain('amarillo');
  });
});

describe('SpeedometerComponent', () => {
  it('dibuja la escala completa, y es decorativo', async () => {
    const { element } = await render(SpeedometerComponent);
    expect(element.querySelectorAll('.speedometer-number')).toHaveLength(9);
    expect(element.querySelectorAll('.speedometer-tick.major')).toHaveLength(9);
    expect(element.querySelectorAll('.speedometer-tick')).toHaveLength(41);
    expect(element.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
    expect(element.querySelector('.speedometer-track')!.getAttribute('d')).toMatch(/^M[\d.-]+ /);
  });
});

describe('EmptyStateComponent', () => {
  it.each(['garage', 'history', 'gauge'])(
    'la ilustración %s es decorativa y hay texto',
    async (illustration) => {
      const { element } = await render(EmptyStateComponent, { illustration, heading: 'Vacío.' });
      expect(element.querySelector('strong')!.textContent).toBe('Vacío.');
      expect(element.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
      expect(element.querySelectorAll('svg path').length).toBeGreaterThan(0);
    },
  );
});

describe('SkeletonComponent', () => {
  it('anuncia la carga en texto, y lo visual se oculta a los lectores de pantalla', async () => {
    const { element } = await render(SkeletonComponent, { label: 'Cargando…', lines: 4 });
    expect(element.querySelector('[role="status"]')!.textContent).toContain('Cargando…');
    const lines = element.querySelectorAll('.skeleton-line');
    expect(lines).toHaveLength(4);
    expect(lines[0].getAttribute('aria-hidden')).toBe('true');
    expect(lines[0].classList).not.toContain('block');

    const blocks = await render(SkeletonComponent, { label: 'x', lines: 1, blocks: true });
    expect(blocks.element.querySelector('.skeleton-line')!.classList).toContain('block');
  });
});

describe('CountUpComponent', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sin poder animar, muestra el valor de una vez con formato colombiano', async () => {
    const { element } = await render(CountUpComponent, { value: 85320, suffix: ' km' });
    expect(element.querySelector('[aria-hidden="true"]')!.textContent).toBe('85.320 km');
  });

  it('respeta prefers-reduced-motion: muestra el final de una vez', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const { element } = await render(CountUpComponent, { value: 100 });
    expect(element.querySelector('[aria-hidden="true"]')!.textContent).toBe('100');
  });

  it('con movimiento cuenta hasta el valor, y el lector de pantalla oye solo el final', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    // Angular también programa cuadros: se ejecutan todos los que haya en cola.
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
      frames.push(callback),
    );
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
    const fixture = TestBed.createComponent(CountUpComponent);
    fixture.componentRef.setInput('value', 1000);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const shown = () => element.querySelector('[aria-hidden="true"]')!.textContent;
    const start = performance.now();
    const advanceTo = (time: number) => {
      for (const frame of frames.splice(0)) frame(time);
      fixture.detectChanges();
    };

    expect(element.querySelector('.visually-hidden')!.textContent).toBe('1.000');
    advanceTo(start + 300);
    expect(shown()).not.toBe('0');
    expect(shown()).not.toBe('1.000');
    advanceTo(start + 5000);
    expect(shown()).toBe('1.000');
  });
});

describe('ModalComponent', () => {
  const open = async () => {
    const result = await render(ModalComponent, { heading: 'Título' });
    const closed = vi.fn();
    result.fixture.componentInstance.closed.subscribe(closed);
    return { ...result, closed };
  };

  it('cierra con un clic en el fondo, y no con uno dentro del diálogo', async () => {
    const { element, closed } = await open();
    element.querySelector<HTMLElement>('.dialog')!.click();
    expect(closed).not.toHaveBeenCalled();
    element.querySelector<HTMLElement>('.modal-backdrop')!.click();
    expect(closed).toHaveBeenCalledTimes(1);
  });

  it('cierra con Escape y se anuncia como diálogo modal', async () => {
    const { element, closed } = await open();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(closed).toHaveBeenCalledTimes(1);
    const dialog = element.querySelector('[role="dialog"]')!;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(element.querySelector(`#${dialog.getAttribute('aria-labelledby')!}`)!.textContent).toBe(
      'Título',
    );
  });
});
