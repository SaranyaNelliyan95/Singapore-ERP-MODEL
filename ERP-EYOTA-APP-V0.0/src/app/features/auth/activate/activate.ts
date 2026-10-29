import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { EnrollmentApiService } from '../../../core/services/enrollment-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { BackendHttpService } from '../../../core/services/backend-http.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-activate',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './activate.html',
  styleUrl: './activate.css',
})
export class ActivateComponent {
  private readonly fb = inject(FormBuilder);
  private readonly enrollmentApi = inject(EnrollmentApiService);
  private readonly auth = inject(AuthService);
  private readonly http = inject(BackendHttpService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly step = signal<'otp' | 'password'>('otp');
  readonly submitting = signal(false);
  readonly formError = signal<string | null>(null);
  readonly info = signal<string | null>(null);
  readonly showPassword = signal(false);
  readonly useBackend = environment.useBackendApi;

  readonly otpForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  readonly passwordForm = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required, Validators.minLength(8)]],
  });

  constructor() {
    const email = this.route.snapshot.queryParamMap.get('email');
    const otp = this.route.snapshot.queryParamMap.get('otp');
    if (email) {
      this.otpForm.patchValue({ email });
    }
    if (otp) {
      this.otpForm.patchValue({ otp });
    }
  }

  async verifyOtp(): Promise<void> {
    this.otpForm.markAllAsTouched();
    if (this.otpForm.invalid) {
      this.formError.set('Enter your work email and the 6-digit OTP from HR email.');
      return;
    }
    if (!this.useBackend) {
      this.formError.set('Turn on environment.useBackendApi and start Spring Boot to activate.');
      return;
    }
    this.submitting.set(true);
    this.formError.set(null);
    try {
      const values = this.otpForm.getRawValue();
      await firstValueFrom(this.enrollmentApi.verifyOtp(values.email, values.otp));
      this.info.set('OTP verified. Choose a new password to finish signup.');
      this.step.set('password');
    } catch (err) {
      this.formError.set(err instanceof Error ? err.message : 'OTP verification failed');
    } finally {
      this.submitting.set(false);
    }
  }

  async complete(): Promise<void> {
    this.passwordForm.markAllAsTouched();
    if (this.passwordForm.invalid) {
      this.formError.set('Password must be at least 8 characters.');
      return;
    }
    const pwd = this.passwordForm.getRawValue();
    if (pwd.newPassword !== pwd.confirmPassword) {
      this.formError.set('Passwords do not match.');
      return;
    }
    this.submitting.set(true);
    this.formError.set(null);
    try {
      const otp = this.otpForm.getRawValue();
      const res = await firstValueFrom(
        this.enrollmentApi.complete({
          email: otp.email,
          otp: otp.otp,
          newPassword: pwd.newPassword,
          confirmPassword: pwd.confirmPassword,
        }),
      );
      this.http.setAccessToken(res.accessToken);
      await this.auth.applyBackendSession(res);
      void this.router.navigateByUrl('/employee/master/dashboard');
    } catch (err) {
      this.formError.set(err instanceof Error ? err.message : 'Activation failed');
    } finally {
      this.submitting.set(false);
    }
  }
}
