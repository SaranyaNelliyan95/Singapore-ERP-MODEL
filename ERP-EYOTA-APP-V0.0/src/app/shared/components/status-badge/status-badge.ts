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
        gap: 0.28rem;
        padding: 0.28rem 0.72rem;
        border-radius: 999px;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.01em;
        border: 1px solid transparent;
        white-space: nowrap;
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
      }

      .badge::before {
        content: '';
        width: 0.42rem;
        height: 0.42rem;
        border-radius: 50%;
        background: currentColor;
        opacity: 0.85;
      }

      .badge[data-tone='neutral'] {
        background: #eef3f8;
        color: #5d728a;
        border-color: #d7e0ea;
      }

      .badge[data-tone='success'] {
        background: #e7f6ee;
        color: #1f7a4d;
        border-color: #b6e3c8;
      }

      .badge[data-tone='warning'] {
        background: #fff5e4;
        color: #a66b1f;
        border-color: #f3d39a;
      }

      .badge[data-tone='danger'] {
        background: #fdecec;
        color: #b42318;
        border-color: #f3c1c1;
      }

      .badge[data-tone='info'] {
        background: #f5eef6;
        color: #8b7196;
        border-color: #dcc9e2;
      }
    `,
  ],
})
export class StatusBadgeComponent {
  @Input({ required: true }) label = '';
  @Input() tone: StatusBadgeConfig['tone'] = 'neutral';
}
