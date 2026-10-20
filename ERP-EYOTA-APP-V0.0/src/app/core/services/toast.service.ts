import { Injectable, signal } from '@angular/core';

export type ToastTone = 'success' | 'info' | 'warning' | 'danger';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  tone: ToastTone;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly messagesSignal = signal<ToastMessage[]>([]);
  readonly messages = this.messagesSignal.asReadonly();

  show(title: string, message: string, tone: ToastTone = 'info'): void {
    const toast: ToastMessage = {
      id: crypto.randomUUID(),
      title,
      message,
      tone,
    };
    this.messagesSignal.update((list) => [...list, toast]);
    window.setTimeout(() => this.dismiss(toast.id), 4200);
  }

  success(title: string, message: string): void {
    this.show(title, message, 'success');
  }

  warning(title: string, message: string): void {
    this.show(title, message, 'warning');
  }

  danger(title: string, message: string): void {
    this.show(title, message, 'danger');
  }

  dismiss(id: string): void {
    this.messagesSignal.update((list) => list.filter((item) => item.id !== id));
  }
}
