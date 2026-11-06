import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { EmailVerificationBannerComponent } from './components/email-verification-banner/email-verification-banner.component';
import { AuthService } from './core/auth/auth.service';
import { HealthService } from './core/http/health.service';
import { ServerStatusService } from './core/http/server-status.service';
import { ServerStatusBannerComponent } from './components/server-status-banner/server-status-banner.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, EmailVerificationBannerComponent, ServerStatusBannerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly health = inject(HealthService);
  private readonly server = inject(ServerStatusService);

  protected readonly healthLabel = computed(() => {
    switch (this.health.status()) {
      case 'online': return 'API conectada';
      case 'offline': return this.server.state() === 'down' ? 'API sin respuesta' : 'Conectando con el servidor…';
      default: return 'Comprobando API…';
    }
  });

  protected readonly initials = computed(() => {
    const email = this.auth.user()?.email ?? '';
    const name = email.split('@')[0] ?? '';
    const parts = name.split(/[._-]+/).filter(Boolean);
    const first = parts.at(0) ?? '';
    const second = parts.at(1) ?? '';
    return (first.charAt(0) + (second.charAt(0) || first.charAt(1))).toUpperCase() || '?';
  });

  constructor() {
    this.health.start();
  }

  logout(): void {
    this.auth.logout().subscribe(() => void this.router.navigate(['/login']));
  }
}
