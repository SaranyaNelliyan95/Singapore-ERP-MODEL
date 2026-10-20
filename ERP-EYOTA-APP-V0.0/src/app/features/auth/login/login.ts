import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { DemoAccount } from '../../../core/models/user.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  readonly demoAccounts = this.auth.demoAccounts;
  readonly submitting = signal(false);
  readonly formError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  fillDemo(account: DemoAccount): void {
    this.form.setValue({ email: account.email, password: account.password });
    this.formError.set(null);
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.formError.set('Please enter a valid email and password.');
      return;
    }

    this.submitting.set(true);
    this.formError.set(null);

    const result = this.auth.login(this.form.getRawValue());
    if (!result.ok) {
      this.formError.set(result.error ?? 'Login failed.');
      this.submitting.set(false);
      return;
    }

    this.submitting.set(false);
  }

  controlInvalid(name: 'email' | 'password'): boolean {
    const control = this.form.controls[name];
    return control.invalid && control.touched;
  }
}
