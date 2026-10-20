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
        padding: 0.2rem 0.55rem;
        border-radius: 999px;
        font-size: 0.72rem;
        font-weight: 600;
        letter-spacing: 0.01em;
        border: 1px solid transparent;
        white-space: nowrap;
      }

      .badge[data-tone='neutral'] {
        background: #eef1f5;
        color: #445066;
        border-color: #d8dee8;
      }

      .badge[data-tone='success'] {
        background: #e8f7ef;
        color: #147a45;
        border-color: #b7e4c7;
      }

      .badge[data-tone='warning'] {
        background: #fff6e5;
        color: #9a6700;
        border-color: #f5d99a;
      }

      .badge[data-tone='danger'] {
        background: #fdecec;
        color: #b42318;
        border-color: #f3c1c1;
      }

      .badge[data-tone='info'] {
        background: #eaf2ff;
        color: #1d4f91;
        border-color: #c5d8f5;
      }
    `,
  ],
})
export class StatusBadgeComponent {
  @Input({ required: true }) label = '';
  @Input() tone: StatusBadgeConfig['tone'] = 'neutral';
}
