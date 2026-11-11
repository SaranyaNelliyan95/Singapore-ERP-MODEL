import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  OnboardingApiService,
  OnboardingDetailDto,
} from './onboarding-api.service';

const GATED_SEGMENTS = new Set(['attendance', 'leave', 'payslips', 'claims']);

/**
 * Employee ESS readiness: full self-service (attendance / leave / payslips / claims)
 * unlocks only after the onboarding pipeline reaches READY_TO_WORK.
 * Legacy accounts with no onboarding record stay fully unlocked.
 */
@Injectable({ providedIn: 'root' })
export class EmployeeReadinessService {
  private readonly onboardingApi = inject(OnboardingApiService);

  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly detail = signal<OnboardingDetailDto | null>(null);
  /** True when there is an active onboarding pipeline that is not yet Ready to Work. */
  readonly onboardingInProgress = signal(false);
  readonly readyToWork = signal(true);

  readonly progressPercent = computed(() => {
    const d = this.detail();
    if (!d) return 0;
    return d.sgFlow?.gateProgressPercent ?? d.checklistProgress ?? 0;
  });

  readonly pipelineLabel = computed(() => {
    const code = (this.detail()?.pipelineStatus || '').toUpperCase();
    switch (code) {
      case 'DRAFT':
        return 'Draft';
      case 'DOCUMENTS_PENDING':
        return 'Documents Pending';
      case 'APPLICATION_SUBMITTED':
        return 'Application Submitted';
      case 'IPA_APPROVED':
        return 'IPA Approved';
      case 'PRE_ARRIVAL_PENDING':
        return 'Pre-Arrival';
      case 'READY_FOR_TRAVEL':
        return 'Ready for Travel';
      case 'ARRIVED_IN_SINGAPORE':
        return 'Arrived';
      case 'POST_ARRIVAL_PENDING':
        return 'Post-Arrival';
      case 'WORK_PERMIT_ISSUED':
        return 'Work Permit Issued';
      case 'ONBOARDING_IN_PROGRESS':
        return 'Onboarding In Progress';
      case 'READY_TO_WORK':
        return 'Ready to Work';
      case 'ON_HOLD':
        return 'On Hold';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return code || 'Not started';
    }
  });

  readonly readinessBlockers = computed(() => {
    const d = this.detail();
    if (!d) return [] as string[];
    if (d.sgFlow?.readyToWorkBlockers?.length) {
      return d.sgFlow.readyToWorkBlockers;
    }
    return d.readinessGates ?? [];
  });

  isGatedSegment(segment: string): boolean {
    return GATED_SEGMENTS.has(segment);
  }

  async ensureLoaded(): Promise<void> {
    if (this.loaded() || this.loading()) {
      if (this.loading()) {
        // Wait briefly for in-flight refresh
        for (let i = 0; i < 40 && this.loading(); i++) {
          await new Promise((r) => setTimeout(r, 50));
        }
      }
      return;
    }
    await this.refresh();
  }

  async refresh(): Promise<void> {
    if (!environment.useBackendApi) {
      this.readyToWork.set(true);
      this.onboardingInProgress.set(false);
      this.detail.set(null);
      this.loaded.set(true);
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    try {
      const d = await firstValueFrom(this.onboardingApi.myOnboarding());
      this.detail.set(d);
      const ready = (d.pipelineStatus || '').toUpperCase() === 'READY_TO_WORK';
      this.readyToWork.set(ready);
      this.onboardingInProgress.set(!ready);
    } catch {
      // No onboarding pipeline — unlock ESS for legacy / non-pipeline staff
      this.detail.set(null);
      this.readyToWork.set(true);
      this.onboardingInProgress.set(false);
    } finally {
      this.loaded.set(true);
      this.loading.set(false);
    }
  }
}
