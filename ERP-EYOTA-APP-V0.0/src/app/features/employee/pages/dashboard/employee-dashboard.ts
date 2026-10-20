import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmployeeMockService } from '../../../../core/services/employee-mock.service';
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
  readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly ws = this.employeeService.workspace;

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

  ngOnInit(): void {
    this.employeeService.getWorkspace().subscribe(() => this.loading.set(false));
  }

  quickClock(): void {
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
}
