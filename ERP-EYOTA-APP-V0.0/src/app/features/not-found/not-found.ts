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
        background: #f4f6f9;
      }

      .code {
        margin: 0;
        color: #1f6feb;
        font-weight: 700;
        letter-spacing: 0.12em;
      }

      h1 {
        margin: 0;
        color: #0b1f3a;
        font-size: 1.8rem;
      }

      p {
        margin: 0 0 1rem;
        color: #5b6b82;
      }

      a {
        justify-self: center;
        text-decoration: none;
        background: #0b1f3a;
        color: #fff;
        border-radius: 10px;
        padding: 0.7rem 1rem;
        font-weight: 600;
      }
    `,
  ],
})
export class NotFoundComponent {
  private readonly auth = inject(AuthService);

  get homeLink(): string {
    const role = this.auth.role();
    return role ? this.auth.landingRouteFor(role) : '/login';
  }

  get homeLabel(): string {
    return this.auth.isAuthenticated() ? 'Back to my master' : 'Go to login';
  }
}
