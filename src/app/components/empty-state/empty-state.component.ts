import { Component, input } from '@angular/core';

/** Estado vacío con una ilustración propia. El texto y la acción van dentro. */
@Component({
  selector: 'app-empty-state',
  template: `
    <div class="empty-state">
      <svg
        viewBox="0 0 160 110"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        @switch (illustration()) {
          @case ('garage') {
            <path stroke="var(--line-strong)" d="M12 104V38l68-30 68 30v66" />
            <path stroke="var(--line-strong)" d="M32 104V50h96v54M32 64h96M32 78h96" />
            <path
              stroke="var(--accent)"
              d="M48 100v-8l8-14c1-2 3-3 5-3h38c2 0 4 1 5 3l8 14v8zM48 100v4h10v-4M102 100v4h10v-4"
            />
            <path stroke="var(--amber)" d="M60 91h6M94 91h6" />
          }
          @case ('history') {
            <path stroke="var(--line-strong)" d="M30 12v90" />
            <circle stroke="var(--accent)" cx="30" cy="26" r="6" />
            <circle stroke="var(--line-strong)" cx="30" cy="56" r="6" />
            <circle stroke="var(--line-strong)" cx="30" cy="86" r="6" />
            <path stroke="var(--line-strong)" d="M48 26h84M48 56h60M48 86h72" />
          }
          @default {
            <path stroke="var(--line-strong)" d="M24 92a60 60 0 1 1 112 0" />
            <path stroke="var(--accent)" d="M80 82 50 50" />
            <circle stroke="var(--line-strong)" cx="80" cy="82" r="7" />
          }
        }
      </svg>
      <strong>{{ heading() }}</strong>
      <ng-content />
    </div>
  `,
})
export class EmptyStateComponent {
  readonly illustration = input<'garage' | 'history' | 'gauge'>('gauge');
  readonly heading = input.required<string>();
}
