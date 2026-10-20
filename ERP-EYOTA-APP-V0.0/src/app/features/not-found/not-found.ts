import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="wrap">
      <p class="code">404</p>
      <h1>Page not found</h1>
      <p>The route you requested is not part of the EYOTA Workright portals.</p>
      <a [routerLink]="homeLink">{{ homeLabel }}</a>
    </div>
  `,
  styles: [
    `
      .wrap {
        min-height: 100dvh;
        display: grid;
        place-content: center;
        text-align: center;
        gap: 0.45rem;
        padding: 2rem;
        background:
          radial-gradient(ellipse at 20% 10%, rgba(93, 147, 181, 0.28), transparent 45%),
          radial-gradient(ellipse at 90% 80%, rgba(178, 163, 163, 0.22), transparent 40%),
          var(--page-bg, #f6f8fa);
      }

      .code {
        margin: 0;
        color: var(--accent-mauve, #927d7d);
        font-weight: 700;
        letter-spacing: 0.12em;
      }

      h1 {
        margin: 0;
        color: var(--text-primary, #263b49);
        font-size: 1.8rem;
      }

      p {
        margin: 0 0 1rem;
        color: var(--text-secondary, #647783);
      }

      a {
        justify-self: center;
        text-decoration: none;
        background: var(--primary, #477d9d);
        color: #fff;
        border-radius: var(--radius-sm, 8px);
        padding: 0.7rem 1rem;
        font-weight: 600;
      }

      a:hover {
        background: var(--primary-hover, #396b89);
      }
    `,
  ],
})
export class NotFoundComponent {
  private readonly auth = inject(AuthService);

  get homeLink(): string {
    const role = this.auth.role();
    return role ? this.auth.landingRouteFor(role) : '/';
  }

  get homeLabel(): string {
    return this.auth.isAuthenticated() ? 'Back to my workspace' : 'Back to home';
  }
}
