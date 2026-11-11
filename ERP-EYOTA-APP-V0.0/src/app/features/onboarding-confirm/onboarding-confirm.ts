import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { BackendHttpService } from '../../core/services/backend-http.service';
import { OnboardingApiService } from '../../core/services/onboarding-api.service';
import { environment } from '../../../environments/environment';

type ViewState = 'loading' | 'ready' | 'done' | 'error';

@Component({
  selector: 'app-onboarding-confirm',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './onboarding-confirm.html',
  styleUrl: './onboarding-confirm.css',
})
export class OnboardingConfirmPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(BackendHttpService);
  private readonly auth = inject(AuthService);
  private readonly onboardingApi = inject(OnboardingApiService);

  readonly state = signal<ViewState>('loading');
  readonly error = signal<string | null>(null);
  readonly actionType = signal('');
  readonly employeeCode = signal('');
  readonly message = signal('');
  readonly submitting = signal(false);
  readonly previewUrl = signal<string | null>(null);
  readonly selectedFileName = signal<string | null>(null);
  readonly useBackend = environment.useBackendApi;

  private token = '';
  private actionFromPath = '';
  private previewObjectUrl: string | null = null;

  ngOnInit(): void {
    this.actionFromPath = (this.route.snapshot.paramMap.get('action') ?? '').toLowerCase();
    this.token = this.route.snapshot.queryParamMap.get('t') ?? '';
    if (!this.token) {
      this.state.set('error');
      this.error.set('This confirmation link is missing a token. Ask HR to resend it.');
      return;
    }
    if (!this.useBackend) {
      this.state.set('error');
      this.error.set('Backend API must be enabled to open confirmation links.');
      return;
    }

    // PPE confirmation requires sign-in, then return to this page
    if (this.actionFromPath === 'ppe' && !this.auth.isAuthenticated()) {
      const returnUrl = `/confirm/ppe?t=${encodeURIComponent(this.token)}`;
      void this.router.navigate(['/login'], { queryParams: { returnUrl } });
      return;
    }

    void this.validate();
  }

  ngOnDestroy(): void {
    this.clearPreview();
  }

  isPpe(): boolean {
    return this.actionType().toUpperCase() === 'PPE' || this.actionFromPath === 'ppe';
  }

  actionTitle(): string {
    switch (this.actionType().toUpperCase() || this.actionFromPath.toUpperCase()) {
      case 'ARRIVAL':
        return 'Confirm arrival';
      case 'CONTRACT':
        return 'Acknowledge employment contract';
      case 'PPE':
        return 'PPE Confirmation';
      default:
        return 'Onboarding confirmation';
    }
  }

  actionHint(): string {
    switch (this.actionType().toUpperCase() || this.actionFromPath.toUpperCase()) {
      case 'ARRIVAL':
        return 'Confirm that you have arrived and your accommodation details are correct.';
      case 'CONTRACT':
        return 'Confirm that you have read and acknowledge your employment contract.';
      case 'PPE':
        return 'Please take a photo to confirm that you have received the required Personal Protective Equipment (PPE).';
      default:
        return 'Complete this onboarding step.';
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.clearPreview();
    this.selectedFileName.set(file.name);
    this.previewObjectUrl = URL.createObjectURL(file);
    this.previewUrl.set(this.previewObjectUrl);
    this.pendingFile = file;
  }

  private pendingFile: File | null = null;

  async confirm(): Promise<void> {
    if (!this.token || this.submitting()) return;

    if (this.isPpe()) {
      if (!this.pendingFile) {
        this.error.set('Please take or upload a photo before confirming.');
        return;
      }
      this.submitting.set(true);
      this.error.set(null);
      try {
        await firstValueFrom(this.onboardingApi.confirmPpePhoto(this.pendingFile, this.token));
        this.message.set('PPE confirmation saved. Thank you — HR will verify your photo.');
        this.state.set('done');
      } catch (err) {
        this.error.set(err instanceof Error ? err.message : 'Could not save PPE photo confirmation');
        this.state.set('error');
      } finally {
        this.submitting.set(false);
      }
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    try {
      const res = await firstValueFrom(
        this.http.post<{ ok: boolean; message: string; actionType: string }>(
          `/onboarding/confirm/submit?t=${encodeURIComponent(this.token)}`,
          {},
        ),
      );
      this.message.set(res.message || 'Confirmation saved.');
      this.state.set('done');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Confirmation failed');
      this.state.set('error');
    } finally {
      this.submitting.set(false);
    }
  }

  private clearPreview(): void {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
    this.previewUrl.set(null);
  }

  private async validate(): Promise<void> {
    this.state.set('loading');
    try {
      const params = new URLSearchParams({ t: this.token });
      if (this.actionFromPath) {
        params.set('action', this.actionFromPath);
      }
      const res = await firstValueFrom(
        this.http.get<{
          valid: boolean;
          actionType: string;
          employeeCode?: string;
          message?: string;
        }>(`/onboarding/confirm/validate?${params.toString()}`),
      );
      this.actionType.set(res.actionType || this.actionFromPath.toUpperCase());
      this.employeeCode.set(res.employeeCode || '');
      this.message.set(res.message || '');
      this.state.set('ready');
    } catch (err) {
      this.state.set('error');
      this.error.set(err instanceof Error ? err.message : 'This link is invalid or expired.');
    }
  }
}
