import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { EnrollmentApiService } from '../../../core/services/enrollment-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { BackendHttpService } from '../../../core/services/backend-http.service';
import { environment } from '../../../../environments/environment';

type Step = 'landing' | 'otp' | 'password' | 'success' | 'error';

@Component({
  selector: 'app-activate',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './activate.html',
  styleUrl: './activate.css',
})
export class ActivateComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly enrollmentApi = inject(EnrollmentApiService);
  private readonly auth = inject(AuthService);
  private readonly http = inject(BackendHttpService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly step = signal<Step>('landing');
  readonly submitting = signal(false);
  readonly formError = signal<string | null>(null);
  readonly info = signal<string | null>(null);
  readonly showPassword = signal(false);
  readonly useBackend = environment.useBackendApi;
  readonly maskedEmail = signal('');
  readonly employeeName = signal('');
  readonly otpExpiresAt = signal<Date | null>(null);
  readonly secondsLeft = signal(0);
  readonly cooldownLeft = signal(0);

  private invitationToken: string | null = null;
  private activationToken: string | null = null;
  private timerId: ReturnType<typeof setInterval> | null = null;

  readonly otpForm = this.fb.nonNullable.group({
    otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  readonly passwordForm = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required, Validators.minLength(8)]],
  });

  ngOnInit(): void {
    const token =
      this.route.snapshot.queryParamMap.get('token') ??
      this.route.snapshot.queryParamMap.get('invitation');
    if (!token) {
      this.step.set('error');
      this.formError.set('This activation link is missing a token. Ask HR to resend your invitation.');
      return;
    }
    this.invitationToken = token;
    void this.validateToken();
  }

  private async validateToken(): Promise<void> {
    if (!this.useBackend || !this.invitationToken) {
      this.formError.set('Enable useBackendApi and open the link from your invitation email.');
      this.step.set('error');
      return;
    }
    this.submitting.set(true);
    try {
      const res = await firstValueFrom(this.enrollmentApi.validateInvitation(this.invitationToken));
      this.maskedEmail.set(res.maskedEmail);
      this.employeeName.set(res.employeeName);
      this.info.set(res.message);
      this.step.set('landing');
    } catch (err) {
      this.step.set('error');
      this.formError.set(err instanceof Error ? err.message : 'Invalid invitation link');
    } finally {
      this.submitting.set(false);
    }
  }

  cancel(): void {
    this.clearTimer();
    this.invitationToken = null;
    this.activationToken = null;
    void this.router.navigateByUrl('/login', {
      state: { message: 'Account activation was cancelled. Contact HR if you need a new invitation.' },
    });
  }

  async sendOtp(): Promise<void> {
    if (!this.invitationToken) {
      return;
    }
    this.submitting.set(true);
    this.formError.set(null);
    try {
      const res = await firstValueFrom(this.enrollmentApi.sendActivationOtp(this.invitationToken));
      this.maskedEmail.set(res.maskedEmail);
      this.info.set(
        res.debugOtpPreview
          ? `${res.message} Dev OTP: ${res.debugOtpPreview}`
          : res.message,
      );
      this.otpExpiresAt.set(new Date(res.otpExpiresAt));
      this.cooldownLeft.set(res.resendCooldownSeconds);
      this.startTimers();
      this.step.set('otp');
    } catch (err) {
      this.formError.set(err instanceof Error ? err.message : 'Could not send OTP');
    } finally {
      this.submitting.set(false);
    }
  }

  async verifyOtp(): Promise<void> {
    this.otpForm.markAllAsTouched();
    if (this.otpForm.invalid || !this.invitationToken) {
      this.formError.set('Enter the 6-digit code from your email.');
      return;
    }
    this.submitting.set(true);
    this.formError.set(null);
    try {
      const res = await firstValueFrom(
        this.enrollmentApi.verifyActivationOtp(this.invitationToken, this.otpForm.getRawValue().otp),
      );
      this.activationToken = res.activationToken;
      this.info.set(res.message);
      this.clearTimer();
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
      this.formError.set('Password must be at least 8 characters with a letter and a number.');
      return;
    }
    const pwd = this.passwordForm.getRawValue();
    if (pwd.newPassword !== pwd.confirmPassword) {
      this.formError.set('Passwords do not match.');
      return;
    }
    if (!this.activationToken) {
      this.formError.set('Verify OTP again — activation authorization missing.');
      this.step.set('otp');
      return;
    }
    this.submitting.set(true);
    this.formError.set(null);
    try {
      await firstValueFrom(
        this.enrollmentApi.complete({
          activationToken: this.activationToken,
          newPassword: pwd.newPassword,
          confirmPassword: pwd.confirmPassword,
        }),
      );
      this.http.setAccessToken(null);
      this.activationToken = null;
      this.invitationToken = null;
      this.step.set('success');
    } catch (err) {
      this.formError.set(err instanceof Error ? err.message : 'Activation failed');
    } finally {
      this.submitting.set(false);
    }
  }

  goToLogin(): void {
    void this.router.navigateByUrl('/login');
  }

  private startTimers(): void {
    this.clearTimer();
    this.timerId = setInterval(() => {
      const exp = this.otpExpiresAt();
      if (exp) {
        this.secondsLeft.set(Math.max(0, Math.floor((exp.getTime() - Date.now()) / 1000)));
      }
      this.cooldownLeft.update((v) => Math.max(0, v - 1));
    }, 1000);
  }

  private clearTimer(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }
}
