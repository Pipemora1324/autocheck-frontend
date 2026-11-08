import { Component, computed, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { motionAllowed } from '../../core/motion';

const DURATION_MS = 900;

/** Número que cuenta al aparecer, como un odómetro. Con menos movimiento, muestra el valor de una vez. */
@Component({
  selector: 'app-count-up',
  template: `
    <span class="visually-hidden">{{ finalText() }}</span>
    <span aria-hidden="true">{{ text() }}</span>
  `,
})
export class CountUpComponent {
  readonly value = input.required<number>();
  readonly suffix = input('');

  private readonly shown = signal(0);
  private frame = 0;

  protected readonly finalText = computed(() => this.format(this.value()));
  protected readonly text = computed(() => this.format(this.shown()));

  constructor() {
    effect(() => {
      this.run(this.value());
    });
    inject(DestroyRef).onDestroy(() => {
      cancelAnimationFrame(this.frame);
    });
  }

  private format(value: number): string {
    return `${value.toLocaleString('es-CO')}${this.suffix()}`;
  }

  private run(target: number): void {
    cancelAnimationFrame(this.frame);
    if (!motionAllowed()) {
      this.shown.set(target);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / DURATION_MS);
      this.shown.set(Math.round(target * (1 - (1 - progress) ** 3)));
      if (progress < 1) this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }
}
