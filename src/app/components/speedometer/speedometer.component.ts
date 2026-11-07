import { Component } from '@angular/core';

const CENTER = 160;
const SWEEP_START = -220;
const SWEEP_TOTAL = 260;
const STEPS = 8;

const polar = (angle: number, radius: number) => {
  const radians = (angle * Math.PI) / 180;
  return {
    x: Number((CENTER + radius * Math.cos(radians)).toFixed(2)),
    y: Number((CENTER + radius * Math.sin(radians)).toFixed(2)),
  };
};
const arc = (from: number, to: number, radius: number) => {
  const start = polar(from, radius);
  const end = polar(to, radius);
  const large = to - from > 180 ? 1 : 0;
  return `M${start.x} ${start.y}A${radius} ${radius} 0 ${large} 1 ${end.x} ${end.y}`;
};

const ticks = Array.from({ length: STEPS * 5 + 1 }, (_, index) => {
  const major = index % 5 === 0;
  const angle = SWEEP_START + (SWEEP_TOTAL * index) / (STEPS * 5);
  const outer = polar(angle, 132);
  const inner = polar(angle, major ? 116 : 124);
  return { major, x1: outer.x, y1: outer.y, x2: inner.x, y2: inner.y };
});
const numbers = Array.from({ length: STEPS + 1 }, (_, index) => ({
  value: index,
  ...polar(SWEEP_START + (SWEEP_TOTAL * index) / STEPS, 98),
}));

/** Tacómetro original en SVG: al cargar, la aguja barre la escala como al poner el contacto. */
@Component({
  selector: 'app-speedometer',
  template: `
    <svg class="speedometer" viewBox="0 0 320 300" aria-hidden="true">
      <path class="speedometer-track" [attr.d]="track" />
      <path class="speedometer-arc" [attr.d]="track" pathLength="100" />
      <path class="speedometer-redline" [attr.d]="redline" />
      @for (tick of ticks; track $index) {
        <line
          class="speedometer-tick"
          [class.major]="tick.major"
          [attr.x1]="tick.x1"
          [attr.y1]="tick.y1"
          [attr.x2]="tick.x2"
          [attr.y2]="tick.y2"
        />
      }
      @for (number of numbers; track number.value) {
        <text class="speedometer-number" [attr.x]="number.x" [attr.y]="number.y">
          {{ number.value }}
        </text>
      }
      <text class="speedometer-unit" x="160" y="214">X1000 RPM</text>
      <text class="speedometer-odometer" x="160" y="246">000 000</text>
      <g class="speedometer-needle">
        <path class="speedometer-hand" d="M155 168 160 44l5 124z" />
      </g>
      <circle class="speedometer-hub" cx="160" cy="160" r="15" />
    </svg>
  `,
})
export class SpeedometerComponent {
  protected readonly ticks = ticks;
  protected readonly numbers = numbers;
  protected readonly track = arc(SWEEP_START, SWEEP_START + SWEEP_TOTAL, 144);
  protected readonly redline = arc(
    SWEEP_START + SWEEP_TOTAL * 0.82,
    SWEEP_START + SWEEP_TOTAL,
    144,
  );
}
