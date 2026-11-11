import { Component, OnInit, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  OnboardingApiService,
  OnboardingDetailDto,
} from '../../../../core/services/onboarding-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { environment } from '../../../../../environments/environment';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge';

@Component({
  selector: 'app-employee-onboarding',
  standalone: true,
  imports: [LoadingSpinnerComponent, StatusBadgeComponent],
  templateUrl: './employee-onboarding.html',
  styleUrl: './employee-onboarding.css',
})
export class EmployeeOnboardingPage implements OnInit {
  private readonly api = inject(OnboardingApiService);
  private readonly toast = inject(ToastService);

  readonly useBackend = environment.useBackendApi;
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly detail = signal<OnboardingDetailDto | null>(null);
  readonly missing = signal(false);

  ngOnInit(): void {
    if (!this.useBackend) {
      this.loading.set(false);
      return;
    }
    void this.reload().finally(() => this.loading.set(false));
  }

  async confirmArrival(): Promise<void> {
    this.saving.set(true);
    try {
      this.detail.set(await firstValueFrom(this.api.confirmArrival()));
      this.toast.success('Arrival', 'Arrival confirmed. Thank you.');
    } catch (err) {
      this.toast.danger('Arrival', err instanceof Error ? err.message : 'Failed');
    } finally {
      this.saving.set(false);
    }
  }

  async ackContract(): Promise<void> {
    this.saving.set(true);
    try {
      this.detail.set(await firstValueFrom(this.api.ackContract()));
      this.toast.success('Contract', 'Employment contract acknowledged.');
    } catch (err) {
      this.toast.danger('Contract', err instanceof Error ? err.message : 'Failed');
    } finally {
      this.saving.set(false);
    }
  }

  async confirmPpe(): Promise<void> {
    this.saving.set(true);
    try {
      this.detail.set(await firstValueFrom(this.api.confirmPpe()));
      this.toast.success('PPE', 'PPE receipt confirmed.');
    } catch (err) {
      this.toast.danger('PPE', err instanceof Error ? err.message : 'Failed');
    } finally {
      this.saving.set(false);
    }
  }

  async download(docId: string, fileName: string): Promise<void> {
    try {
      const blob = await firstValueFrom(this.api.downloadMyDocument(docId));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      this.toast.danger('Download', err instanceof Error ? err.message : 'Failed');
    }
  }

  private async reload(): Promise<void> {
    try {
      this.detail.set(await firstValueFrom(this.api.myOnboarding()));
      this.missing.set(false);
    } catch {
      this.missing.set(true);
      this.detail.set(null);
    }
  }
}
