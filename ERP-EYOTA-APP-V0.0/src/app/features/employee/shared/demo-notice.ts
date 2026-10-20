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
        padding: 0.7rem 0.9rem;
        border-radius: var(--radius-md, 12px);
        border: 1px solid var(--warning-border, #f5d99a);
        background: var(--warning-bg, #fff6e5);
        color: var(--warning, #9a6700);
        font-size: 0.82rem;
        line-height: 1.4;
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
