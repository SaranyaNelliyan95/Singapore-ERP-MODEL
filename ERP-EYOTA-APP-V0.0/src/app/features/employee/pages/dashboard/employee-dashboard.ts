import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { EmployeeMockService } from '../../../../core/services/employee-mock.service';
import { EmployeeReadinessService } from '../../../../core/services/employee-readiness.service';
import {
  OnboardingApiService,
  OnboardingLatestRequestDto,
} from '../../../../core/services/onboarding-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { WorkLocation } from '../../../../core/models/common.model';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge';
import { DemoNoticeComponent } from '../../shared/demo-notice';
import { SgDatePipe } from '../../../../shared/pipes/sg-date.pipe';
import { SgdCurrencyPipe } from '../../../../shared/pipes/sgd-currency.pipe';

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    LoadingSpinnerComponent,
    StatusBadgeComponent,
    DemoNoticeComponent,
    SgDatePipe,
    SgdCurrencyPipe,
  ],
  templateUrl: './employee-dashboard.html',
  styleUrl: './employee-dashboard.css',
})
export class EmployeeDashboardPage implements OnInit {
  private readonly employeeService = inject(EmployeeMockService);
  private readonly onboardingApi = inject(OnboardingApiService);
  private readonly router = inject(Router);
  readonly readiness = inject(EmployeeReadinessService);
  readonly toast = inject(ToastService);

  readonly useBackend = environment.useBackendApi;
  readonly loading = signal(true);
  readonly acting = signal(false);
  readonly latestRequests = signal<OnboardingLatestRequestDto[]>([]);
  readonly showAllRequests = signal(false);
  readonly ws = this.employeeService.workspace;
  readonly workforce = this.employeeService.workforce;

  readonly annualLeave = computed(
    () => this.ws().leaveBalances.find((b) => b.type === 'Annual') ?? null,
  );
  readonly pendingLeave = computed(
    () => this.ws().leaveRequests.filter((r) => r.status === 'Pending').length,
  );
  readonly pendingClaims = computed(
    () => this.ws().claims.filter((c) => c.status === 'Pending').length,
  );
  readonly assetCount = computed(
    () => this.ws().assets.filter((a) => a.returnStatus === 'Assigned').length,
  );
  readonly latestPayslip = computed(() => this.ws().payslips[0] ?? null);
  readonly unread = computed(() => this.ws().notifications.filter((n) => !n.read).length);

  readonly myDirectory = computed(() => {
    const id = this.ws().profile.employeeId;
    return this.workforce().directory.find((r) => r.employeeId === id) ?? null;
  });

  readonly myAllocations = computed(() => {
    const id = this.ws().profile.employeeId;
    return this.workforce().allocations.filter(
      (a) => a.employeeId === id && a.status === 'Active',
    );
  });

  readonly myCompliance = computed(() => {
    const id = this.ws().profile.employeeId;
    return this.workforce().compliance.filter(
      (c) =>
        c.employeeId === id &&
        (c.status === 'Expiring' ||
          c.status === 'Expired' ||
          c.status === 'Missing' ||
          c.status === 'Pending Review'),
    );
  });

  readonly leaveStatusSummary = computed(() => {
    const rows = this.ws().leaveRequests.slice(0, 3);
    return rows.map((r) => `${r.type}: ${r.status}`).join(' · ') || 'No recent leave requests';
  });

  readonly pendingTasks = computed(() => {
    const d = this.readiness.detail();
    if (!d?.tasks?.length) return [] as { title: string; status: string }[];
    return d.tasks
      .filter((t) => t.applies !== false && t.status !== 'NOT_APPLICABLE' && t.status !== 'COMPLETED')
      .slice(0, 8)
      .map((t) => ({ title: t.title, status: t.status }));
  });

  ngOnInit(): void {
    void Promise.all([
      this.readiness.refresh(),
      this.reloadLatestRequests(),
      new Promise<void>((resolve) => {
        this.employeeService.getWorkspace().subscribe(() => resolve());
      }),
    ]).finally(() => this.loading.set(false));
  }

  visibleRequests(): OnboardingLatestRequestDto[] {
    const all = this.latestRequests();
    return this.showAllRequests() ? all : all.slice(0, 4);
  }

  hiddenCount(): number {
    return Math.max(0, this.latestRequests().length - 4);
  }

  openRequest(req: OnboardingLatestRequestDto): void {
    if (req.requestType === 'ARRIVAL_CONFIRM') {
      void this.confirmArrivalRequest();
      return;
    }
    void this.router.navigateByUrl('/employee/master/onboarding', {
      state: { focusRequestType: req.requestType },
    });
  }

  /** Same action as Employee → My onboarding → Confirm arrival in Singapore. */
  async confirmArrivalRequest(): Promise<void> {
    if (this.acting()) return;
    this.acting.set(true);
    try {
      await firstValueFrom(this.onboardingApi.confirmArrival());
      this.toast.success('Arrival', 'Arrival confirmed. Thank you.');
      await Promise.all([this.readiness.refresh(), this.reloadLatestRequests()]);
    } catch (err) {
      this.toast.danger('Arrival', err instanceof Error ? err.message : 'Failed');
    } finally {
      this.acting.set(false);
    }
  }

  projectName(projectId: string): string {
    return this.workforce().projects.find((p) => p.id === projectId)?.name ?? projectId;
  }

  quickClock(): void {
    if (!this.readiness.readyToWork()) {
      this.toast.warning(
        'Not ready to work',
        'Attendance unlocks after HR completes your onboarding pipeline.',
      );
      return;
    }
    const clock = this.ws().clock;
    if (clock.status === 'Checked in') {
      this.employeeService.clockOut();
      this.toast.success('Clocked out', 'Attendance updated for today (simulated).');
      return;
    }
    const location: WorkLocation = 'Office';
    this.employeeService.clockIn(location);
    this.toast.success('Clocked in', `Checked in at ${location}${clock.gpsEnabled ? ' · GPS on' : ''}.`);
  }

  private async reloadLatestRequests(): Promise<void> {
    if (!this.useBackend) {
      this.latestRequests.set([]);
      return;
    }
    try {
      this.latestRequests.set(await firstValueFrom(this.onboardingApi.myLatestRequests()));
    } catch {
      this.latestRequests.set([]);
    }
  }
}
