import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-demo-notice',
  standalone: true,
  template: `
    <aside class="notice" role="note">
      <strong>Demo / simulated data</strong>
      <span>{{ message }}</span>
    </aside>
  `,
  styles: [
    `
      .notice {
        display: flex;
        flex-wrap: wrap;
        gap: 0.45rem 0.75rem;
        align-items: baseline;
        padding: 0.75rem 1rem;
        border-radius: 999px;
        border: 1px solid var(--warning-border, #f3d39a);
        background: linear-gradient(90deg, #fff8ec, #fff5e4);
        color: var(--warning, #a66b1f);
        font-size: 0.82rem;
        line-height: 1.4;
        box-shadow: 0 4px 14px rgba(166, 107, 31, 0.06);
      }

      strong {
        color: var(--warning, #9a6700);
      }
    `,
  ],
})
export class DemoNoticeComponent {
  @Input() message =
    'Balances, CPF, SDL and statutory figures shown here are fictional sample values for UI demonstration only — not compliance advice.';
}
