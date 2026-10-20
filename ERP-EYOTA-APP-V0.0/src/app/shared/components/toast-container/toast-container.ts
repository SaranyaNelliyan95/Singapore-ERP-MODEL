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
        border-radius: 12px;
        background: #fff;
        border: 1px solid #e5e9ef;
        box-shadow: 0 10px 30px rgba(11, 31, 58, 0.12);
        animation: slide-in 0.25s ease;
      }

      .toast strong {
        display: block;
        color: #0b1f3a;
        font-size: 0.9rem;
      }

      .toast p {
        margin: 0.2rem 0 0;
        color: #5b6b82;
        font-size: 0.82rem;
        line-height: 1.35;
      }

      .toast button {
        border: 0;
        background: transparent;
        color: #8a97ab;
        font-size: 1.1rem;
        cursor: pointer;
        line-height: 1;
      }

      .toast[data-tone='success'] {
        border-left: 4px solid #1f9d55;
      }

      .toast[data-tone='warning'] {
        border-left: 4px solid #d97706;
      }

      .toast[data-tone='danger'] {
        border-left: 4px solid #dc2626;
      }

      .toast[data-tone='info'] {
        border-left: 4px solid #2563eb;
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
