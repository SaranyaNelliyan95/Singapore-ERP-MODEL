import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  template: `
    <div class="spinner-wrap" [class.overlay]="overlay" role="status" aria-live="polite">
      <div class="spinner"></div>
      @if (label) {
        <p>{{ label }}</p>
      }
    </div>
  `,
  styles: [
    `
      .spinner-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        padding: 2.5rem 1rem;
        color: #5b6b82;
        font-size: 0.9rem;
      }

      .spinner-wrap.overlay {
        min-height: 220px;
      }

      .spinner {
        width: 2.25rem;
        height: 2.25rem;
        border-radius: 50%;
        border: 3px solid #d7e0ec;
        border-top-color: #0b1f3a;
        animation: spin 0.8s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class LoadingSpinnerComponent {
  @Input() label = 'Loading…';
  @Input() overlay = true;
}
