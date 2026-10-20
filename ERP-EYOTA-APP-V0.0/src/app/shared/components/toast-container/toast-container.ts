import { Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  template: `
    <div class="toast-stack" aria-live="polite" aria-atomic="true">
      @for (toast of toastService.messages(); track toast.id) {
        <div class="toast" [attr.data-tone]="toast.tone">
          <div>
            <strong>{{ toast.title }}</strong>
            <p>{{ toast.message }}</p>
          </div>
          <button type="button" (click)="toastService.dismiss(toast.id)" aria-label="Dismiss">
            ×
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .toast-stack {
        position: fixed;
        right: 1.25rem;
        top: 1.25rem;
        z-index: 80;
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
        width: min(360px, calc(100vw - 2rem));
      }

      .toast {
        display: flex;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.85rem 1rem;
        border-radius: var(--radius-md, 12px);
        background: var(--surface, #fff);
        border: 1px solid var(--border-color, #e1e7eb);
        box-shadow: var(--shadow-hover, 0 12px 32px rgba(38, 59, 73, 0.09));
        animation: slide-in 0.25s ease;
      }

      .toast strong {
        display: block;
        color: var(--text-primary, #263b49);
        font-size: 0.9rem;
      }

      .toast p {
        margin: 0.2rem 0 0;
        color: var(--text-secondary, #647783);
        font-size: 0.82rem;
        line-height: 1.35;
      }

      .toast button {
        border: 0;
        background: transparent;
        color: var(--text-muted, #788791);
        font-size: 1.1rem;
        cursor: pointer;
        line-height: 1;
      }

      .toast[data-tone='success'] {
        border-left: 4px solid var(--success, #147a45);
        background: var(--success-bg, #e8f7ef);
      }

      .toast[data-tone='warning'] {
        border-left: 4px solid var(--warning, #9a6700);
        background: var(--warning-bg, #fff6e5);
      }

      .toast[data-tone='danger'] {
        border-left: 4px solid var(--danger, #b42318);
        background: var(--danger-bg, #fdecec);
      }

      .toast[data-tone='info'] {
        border-left: 4px solid var(--brand-blue, #5d93b5);
        background: var(--surface-blue, #eaf2f7);
      }

      @keyframes slide-in {
        from {
          opacity: 0;
          transform: translateY(-8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
})
export class ToastContainerComponent {
  readonly toastService = inject(ToastService);
}
