import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DataTableColumn } from '../../../../core/models/common.model';
import { PayslipRecord } from '../../../../core/models/employee.model';
import { PayrollRun } from '../../../../core/models/hr.model';
import { EmployeeMockService } from '../../../../core/services/employee-mock.service';
import { HrMockService } from '../../../../core/services/hr-mock.service';
import { ToastService } from '../../../../core/services/toast.service';
import { formatSgd } from '../../../../core/utils/singapore.utils';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal/confirm-modal';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge';
import { DemoNoticeComponent } from '../../../employee/shared/demo-notice';
import { SgdCurrencyPipe } from '../../../../shared/pipes/sgd-currency.pipe';

@Component({
  selector: 'app-hr-payroll',
  standalone: true,
  imports: [
    DataTableComponent,
    LoadingSpinnerComponent,
    StatusBadgeComponent,
    ConfirmModalComponent,
    DemoNoticeComponent,
    SgdCurrencyPipe,
  ],
  templateUrl: './hr-payroll.html',
  styleUrl: './hr-payroll.css',
})
export class HrPayrollPage implements OnInit {
  readonly hr = inject(HrMockService);
  private readonly workforce = inject(EmployeeMockService);
  readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly selectedRunId = signal<string>('');
  readonly selectedEmployeeId = signal<string>('');
  readonly authorizeOpen = signal(false);

  readonly selectedRun = computed(() =>
    this.hr.workforce().payrollRuns.find((run) => run.id === this.selectedRunId()) ?? null,
  );

  readonly periodPayslips = computed(() => {
    const run = this.selectedRun();
    if (!run) {
      return [] as PayslipRecord[];
    }
    return this.hr.workforce().payslips.filter((slip) => slip.payPeriod === run.period);
  });

  readonly selectedSlip = computed(() => {
    const id = this.selectedEmployeeId();
    return this.periodPayslips().find((slip) => slip.employeeId === id) ?? this.periodPayslips()[0] ?? null;
  });

  readonly runColumns: DataTableColumn<PayrollRun>[] = [
    { key: 'period', label: 'Period', sortable: true },
    { key: 'employeeCount', label: 'Employees', align: 'center' },
    {
      key: 'totalNetPay',
      label: 'Total net',
      align: 'right',
      format: (row) => formatSgd(row.totalNetPay),
    },
    {
      key: 'totalCpfEmployee',
      label: 'CPF EE',
      align: 'right',
      format: (row) => formatSgd(row.totalCpfEmployee),
    },
    {
      key: 'totalCpfEmployer',
      label: 'CPF ER',
      align: 'right',
      format: (row) => formatSgd(row.totalCpfEmployer),
    },
    {
      key: 'totalSdl',
      label: 'SDL',
      align: 'right',
      format: (row) => formatSgd(row.totalSdl),
    },
    {
      key: 'status',
      label: 'Status',
      badge: (row) => ({
        label: row.status,
        tone:
          row.status === 'Authorized' || row.status === 'Paid'
            ? 'success'
            : 'warning',
      }),
    },
  ];

  ngOnInit(): void {
    this.hr.getMasterSnapshot().subscribe(() => {
      const runs = this.hr.workforce().payrollRuns;
      this.selectedRunId.set(runs[0]?.id ?? '');
      const slips = this.periodPayslips();
      this.selectedEmployeeId.set(slips[0]?.employeeId ?? '');
      this.loading.set(false);
    });
  }

  selectRun(id: string): void {
    this.selectedRunId.set(id);
    const slips = this.periodPayslips();
    this.selectedEmployeeId.set(slips[0]?.employeeId ?? '');
  }

  selectEmployee(employeeId: string): void {
    this.selectedEmployeeId.set(employeeId);
  }

  requestAuthorize(): void {
    const run = this.selectedRun();
    if (!run || run.status !== 'Draft') {
      this.toast.warning('Payroll', 'Select a Draft payroll run to authorize.');
      return;
    }
    this.authorizeOpen.set(true);
  }

  confirmAuthorize(): void {
    const run = this.selectedRun();
    this.authorizeOpen.set(false);
    if (!run) {
      return;
    }
    if (!this.workforce.workforce().policies.statutory.payrollPeriodOpen) {
      this.toast.danger(
        'Period closed',
        'Admin closed the payroll period. Re-open it under Admin → Payroll Controls (demo).',
      );
      return;
    }
    const ok = this.workforce.authorizePayroll(run.id);
    if (ok) {
      this.toast.success(
        'Month-end payroll authorized',
        `${run.period} authorized in demo environment — no statutory filing.`,
      );
    }
  }

  cancelAuthorize(): void {
    this.authorizeOpen.set(false);
  }

  employeeLabel(employeeId: string): string {
    return this.hr.employeeName(employeeId);
  }
}
