import { Component, Input } from '@angular/core';
import { StatusBadgeConfig } from '../../../core/models/common.model';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `
    <span class="badge" [attr.data-tone]="tone">{{ label }}</span>
  `,
  styles: [
    `
      .badge {
        display: inline-flex;
        align-items: center;
        padding: 0.22rem 0.6rem;
        border-radius: 999px;
        font-size: 0.72rem;
        font-weight: 650;
        letter-spacing: 0.01em;
        border: 1px solid transparent;
        white-space: nowrap;
      }

      .badge[data-tone='neutral'] {
        background: var(--secondary-bg, #f0f5f8);
        color: var(--text-secondary, #647783);
        border-color: var(--border-color, #e1e7eb);
      }

      .badge[data-tone='success'] {
        background: var(--success-bg, #e8f7ef);
        color: var(--success, #147a45);
        border-color: var(--success-border, #b7e4c7);
      }

      .badge[data-tone='warning'] {
        background: var(--warning-bg, #fff6e5);
        color: var(--warning, #9a6700);
        border-color: var(--warning-border, #f5d99a);
      }

      .badge[data-tone='danger'] {
        background: var(--danger-bg, #fdecec);
        color: var(--danger, #b42318);
        border-color: var(--danger-border, #f3c1c1);
      }

      .badge[data-tone='info'] {
        background: var(--surface-mauve, #f4efef);
        color: var(--accent-mauve, #927d7d);
        border-color: var(--brand-mauve, #b2a3a3);
      }
    `,
  ],
})
export class StatusBadgeComponent {
  @Input({ required: true }) label = '';
  @Input() tone: StatusBadgeConfig['tone'] = 'neutral';
}
