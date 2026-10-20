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
        border-radius: 12px;
        border: 1px solid #f5d99a;
        background: #fffaf0;
        color: #7a5b12;
        font-size: 0.82rem;
        line-height: 1.4;
      }

      strong {
        color: #9a6700;
      }
    `,
  ],
})
export class DemoNoticeComponent {
  @Input() message =
    'Balances, CPF, SDL and statutory figures shown here are fictional sample values for UI demonstration only — not compliance advice.';
}
