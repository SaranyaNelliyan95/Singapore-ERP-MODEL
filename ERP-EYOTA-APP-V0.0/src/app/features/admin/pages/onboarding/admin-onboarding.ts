import { Component, OnInit, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  OnboardingApiService,
  OnboardingCandidateDto,
  OnboardingDetailDto,
  OnboardingSummaryDto,
} from '../../../../core/services/onboarding-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { formatSgDate } from '../../../../core/utils/singapore.utils';
import { environment } from '../../../../../environments/environment';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-onboarding',
  standalone: true,
  imports: [LoadingSpinnerComponent, StatusBadgeComponent, RouterLink],
  templateUrl: './admin-onboarding.html',
  styleUrl: './admin-onboarding.css',
})
export class AdminOnboardingPage implements OnInit {
  private readonly api = inject(OnboardingApiService);
  private readonly toast = inject(ToastService);

  readonly useBackend = environment.useBackendApi;
  readonly loading = signal(true);
  readonly summary = signal<OnboardingSummaryDto | null>(null);
  readonly candidates = signal<OnboardingCandidateDto[]>([]);
  readonly detail = signal<OnboardingDetailDto | null>(null);
  readonly selectedId = signal<string | null>(null);

  ngOnInit(): void {
    if (!this.useBackend) {
      this.loading.set(false);
      return;
    }
    void this.reload().finally(() => this.loading.set(false));
  }

  async select(row: OnboardingCandidateDto): Promise<void> {
    this.selectedId.set(row.id);
    try {
      this.detail.set(await firstValueFrom(this.api.adminDetail(row.id)));
    } catch (err) {
      this.toast.danger('Detail', err instanceof Error ? err.message : 'Unable to load');
    }
  }

  formatDate(value: string | null | undefined): string {
    return value ? formatSgDate(value) : '—';
  }

  tone(stage: string): 'success' | 'warning' | 'info' | 'neutral' {
    if (stage.includes('READY') || stage.includes('Ready')) return 'success';
    if (stage.includes('HOLD') || stage.includes('CANCEL')) return 'neutral';
    return 'warning';
  }

  private async reload(): Promise<void> {
    const data = await firstValueFrom(this.api.adminSummary());
    this.summary.set(data);
    this.candidates.set(data.candidates ?? []);
  }
}
