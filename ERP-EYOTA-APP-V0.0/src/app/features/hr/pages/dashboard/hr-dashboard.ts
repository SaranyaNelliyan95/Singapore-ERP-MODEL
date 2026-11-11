import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { HrDashboardStats } from '../../../../core/models/hr.model';
import {
  OnboardingApiService,
  OnboardingLatestRequestDto,
} from '../../../../core/services/onboarding-api.service';
import { BackendHttpService } from '../../../../core/services/backend-http.service';
import { HrMockService } from '../../../../core/services/hr-mock.service';
import { ToastService } from '../../../../core/services/toast.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';
import { DemoNoticeComponent } from '../../../employee/shared/demo-notice';

@Component({
  selector: 'app-hr-dashboard',
  standalone: true,
  imports: [RouterLink, LoadingSpinnerComponent, DemoNoticeComponent],
  templateUrl: './hr-dashboard.html',
  styleUrl: './hr-dashboard.css',
})
export class HrDashboardPage implements OnInit, OnDestroy {
  private readonly hr = inject(HrMockService);
  private readonly router = inject(Router);
  private readonly onboardingApi = inject(OnboardingApiService);
  private readonly http = inject(BackendHttpService);
  private readonly toast = inject(ToastService);

  readonly useBackend = environment.useBackendApi;
  readonly loading = signal(true);
  readonly stats = signal<HrDashboardStats>({
    totalEmployees: 0,
    localCount: 0,
    prCount: 0,
    foreignCount: 0,
    onLeaveToday: 0,
    passesExpiring90: 0,
    attendanceRateToday: 0,
    pendingLeaves: 0,
    pendingClaims: 0,
    pendingDocuments: 0,
    pendingBankRequests: 0,
    payrollStatus: '—',
  });
  readonly latestRequests = signal<OnboardingLatestRequestDto[]>([]);
  readonly showAllRequests = signal(false);
  readonly expandedId = signal<string | null>(null);
  readonly previewUrl = signal<string | null>(null);
  readonly verifying = signal(false);
  private previewObjectUrl: string | null = null;

  ngOnInit(): void {
    void this.bootstrap();
  }

  ngOnDestroy(): void {
    this.clearPreview();
  }

  visibleRequests(): OnboardingLatestRequestDto[] {
    const all = this.latestRequests();
    return this.showAllRequests() ? all : all.slice(0, 4);
  }

  hiddenCount(): number {
    return Math.max(0, this.latestRequests().length - 4);
  }

  openHire(): void {
    void this.router.navigateByUrl('/hr/master/employees/new');
  }

  async toggleRequest(req: OnboardingLatestRequestDto): Promise<void> {
    if (this.expandedId() === req.employeeId) {
      this.expandedId.set(null);
      this.clearPreview();
      return;
    }
    this.expandedId.set(req.employeeId);
    this.clearPreview();
    if (!req.documentId) return;
    try {
      const blob = await firstValueFrom(
        this.onboardingApi.downloadHrDocument(req.employeeId, req.documentId),
      );
      this.previewObjectUrl = URL.createObjectURL(blob);
      this.previewUrl.set(this.previewObjectUrl);
    } catch (err) {
      this.toast.danger('Photo', err instanceof Error ? err.message : 'Could not open photo');
    }
  }

  async verifyPpe(req: OnboardingLatestRequestDto): Promise<void> {
    if (req.requestType !== 'PPE_PHOTO_VERIFY') return;
    this.verifying.set(true);
    try {
      if (this.expandedId() !== req.employeeId) {
        this.expandedId.set(req.employeeId);
        this.clearPreview();
      }
      if (!this.previewUrl() && req.documentId) {
        const blob = await firstValueFrom(
          this.onboardingApi.downloadHrDocument(req.employeeId, req.documentId),
        );
        this.previewObjectUrl = URL.createObjectURL(blob);
        this.previewUrl.set(this.previewObjectUrl);
      }
      await firstValueFrom(this.onboardingApi.verifyPpePhoto(req.employeeId));
      this.toast.success('PPE photo', `${req.candidateName} — verified by HR.`);
      this.expandedId.set(null);
      this.clearPreview();
      await this.reloadRequests();
      await this.reloadStats();
    } catch (err) {
      this.toast.danger('PPE photo', err instanceof Error ? err.message : 'Verification failed');
    } finally {
      this.verifying.set(false);
    }
  }

  openOnboarding(req: OnboardingLatestRequestDto): void {
    void this.router.navigateByUrl('/hr/master/onboarding', {
      state: { selectEmployeeId: req.employeeId },
    });
  }

  private async bootstrap(): Promise<void> {
    this.loading.set(true);
    try {
      if (this.useBackend) {
        await Promise.all([this.reloadStats(), this.reloadRequests()]);
      } else {
        await firstValueFrom(this.hr.getMasterSnapshot());
        this.stats.set(this.hr.stats());
      }
    } finally {
      this.loading.set(false);
    }
  }

  private async reloadStats(): Promise<void> {
    try {
      const live = await firstValueFrom(this.http.get<HrDashboardStats>('/hr/dashboard/stats'));
      this.stats.set(live);
    } catch (err) {
      this.toast.danger(
        'Dashboard',
        err instanceof Error ? err.message : 'Could not load live workforce stats',
      );
      this.stats.set(this.hr.stats());
    }
  }

  private async reloadRequests(): Promise<void> {
    try {
      this.latestRequests.set(await firstValueFrom(this.onboardingApi.latestRequests()));
    } catch {
      this.latestRequests.set([]);
    }
  }

  private clearPreview(): void {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
    this.previewUrl.set(null);
  }
}
