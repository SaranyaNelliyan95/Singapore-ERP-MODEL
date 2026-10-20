import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  template: `
    @if (open) {
      <div class="backdrop" (click)="onCancel()" role="presentation">
        <div
          class="modal"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="titleId"
          (click)="$event.stopPropagation()"
        >
          <h2 [id]="titleId">{{ title }}</h2>
          <p>{{ message }}</p>
          <div class="actions">
            <button type="button" class="ghost" (click)="onCancel()">{{ cancelLabel }}</button>
            <button type="button" class="primary" (click)="onConfirm()">{{ confirmLabel }}</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .backdrop {
        position: fixed;
        inset: 0;
        z-index: 70;
        background: rgba(38, 59, 73, 0.4);
        display: grid;
        place-items: center;
        padding: 1rem;
      }

      .modal {
        width: min(420px, 100%);
        background: var(--surface, #fff);
        border-radius: var(--radius-lg, 18px);
        border: 1px solid var(--border-color, #e1e7eb);
        padding: 1.35rem 1.4rem 1.2rem;
        box-shadow: var(--shadow-hover, 0 12px 32px rgba(38, 59, 73, 0.09));
      }

      h2 {
        margin: 0;
        font-size: 1.1rem;
        color: var(--text-primary, #263b49);
      }

      p {
        margin: 0.65rem 0 1.25rem;
        color: var(--text-secondary, #647783);
        font-size: 0.92rem;
        line-height: 1.5;
      }

      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.6rem;
      }

      button {
        border-radius: var(--radius-sm, 8px);
        padding: 0.55rem 0.95rem;
        font-size: 0.88rem;
        font-weight: 600;
        cursor: pointer;
      }

      .ghost {
        background: var(--surface, #fff);
        border: 1px solid var(--border-color, #e1e7eb);
        color: var(--text-secondary, #647783);
      }

      .primary {
        background: var(--primary, #477d9d);
        border: 1px solid var(--primary, #477d9d);
        color: #fff;
      }

      .primary:hover {
        background: var(--primary-hover, #396b89);
        border-color: var(--primary-hover, #396b89);
      }
    `,
  ],
})
export class ConfirmModalComponent {
  @Input() open = false;
  @Input() title = 'Confirm action';
  @Input() message = 'Are you sure you want to continue?';
  @Input() confirmLabel = 'Confirm';
  @Input() cancelLabel = 'Cancel';
  @Output() readonly confirmed = new EventEmitter<void>();
  @Output() readonly cancelled = new EventEmitter<void>();

  readonly titleId = `confirm-title-${Math.random().toString(36).slice(2, 8)}`;

  onConfirm(): void {
    this.confirmed.emit();
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
