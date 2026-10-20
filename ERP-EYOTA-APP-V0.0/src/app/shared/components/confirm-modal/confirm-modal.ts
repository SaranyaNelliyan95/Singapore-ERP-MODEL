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
        background: rgba(11, 31, 58, 0.45);
        display: grid;
        place-items: center;
        padding: 1rem;
      }

      .modal {
        width: min(420px, 100%);
        background: #fff;
        border-radius: 16px;
        border: 1px solid #e5e9ef;
        padding: 1.35rem 1.4rem 1.2rem;
        box-shadow: 0 20px 50px rgba(11, 31, 58, 0.2);
      }

      h2 {
        margin: 0;
        font-size: 1.1rem;
        color: #0b1f3a;
      }

      p {
        margin: 0.65rem 0 1.25rem;
        color: #5b6b82;
        font-size: 0.92rem;
        line-height: 1.5;
      }

      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.6rem;
      }

      button {
        border-radius: 10px;
        padding: 0.55rem 0.95rem;
        font-size: 0.88rem;
        font-weight: 600;
        cursor: pointer;
      }

      .ghost {
        background: #fff;
        border: 1px solid #d8dee8;
        color: #445066;
      }

      .primary {
        background: #0b1f3a;
        border: 1px solid #0b1f3a;
        color: #fff;
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
