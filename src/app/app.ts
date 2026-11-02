import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { EmailVerificationBannerComponent } from './components/email-verification-banner/email-verification-banner.component';
import { AuthService } from './core/auth/auth.service';
import { HealthService } from './core/http/health.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, EmailVerificationBannerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly health = inject(HealthService);

  protected readonly healthLabel = computed(() => {
    switch (this.health.status()) {
      case 'online': return 'API conectada';
      case 'offline': return 'API sin conexión';
      default: return 'Comprobando API…';
    }
  });

  protected readonly initials = computed(() => {
    const email = this.auth.user()?.email ?? '';
    const name = email.split('@')[0] ?? '';
    const parts = name.split(/[._-]+/).filter(Boolean);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? parts[0]?.[1] ?? '')).toUpperCase() || '?';
  });

  constructor() {
    this.health.start();
  }

  logout(): void {
    this.auth.logout().subscribe(() => void this.router.navigate(['/login']));
  }
}
