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

type PayrollAction = 'submitReview' | 'approve' | 'finalize';

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
  readonly confirmOpen = signal(false);
  readonly pendingAction = signal<PayrollAction | null>(null);

  readonly selectedRun = computed(
    () => this.hr.workforce().payrollRuns.find((run) => run.id === this.selectedRunId()) ?? null,
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
    return (
      this.periodPayslips().find((slip) => slip.employeeId === id) ??
      this.periodPayslips()[0] ??
      null
    );
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
          row.status === 'Finalized' || row.status === 'Authorized' || row.status === 'Paid'
            ? 'success'
            : row.status === 'Approved'
              ? 'info'
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

  requestAction(action: PayrollAction): void {
    const run = this.selectedRun();
    if (!run) {
      return;
    }
    if (action === 'submitReview' && run.status !== 'Draft') {
      this.toast.warning('Payroll', 'Only Draft runs can be submitted for review.');
      return;
    }
    if (action === 'approve' && run.status !== 'Under Review' && run.status !== 'Draft') {
      this.toast.warning('Payroll', 'Select a Draft or Under Review run to approve.');
      return;
    }
    if (
      action === 'finalize' &&
      run.status !== 'Approved' &&
      run.status !== 'Under Review' &&
      run.status !== 'Draft'
    ) {
      this.toast.warning('Payroll', 'This run is already finalized.');
      return;
    }
    this.pendingAction.set(action);
    this.confirmOpen.set(true);
  }

  confirmAction(): void {
    const run = this.selectedRun();
    const action = this.pendingAction();
    this.confirmOpen.set(false);
    this.pendingAction.set(null);
    if (!run || !action) {
      return;
    }
    if (
      action !== 'submitReview' &&
      !this.workforce.workforce().policies.statutory.payrollPeriodOpen
    ) {
      this.toast.danger(
        'Period closed',
        'Admin closed the payroll period. Re-open it under Admin → Payroll Controls (demo).',
      );
      return;
    }
    const ok = this.workforce.advancePayroll(run.id, action);
    if (!ok) {
      this.toast.danger('Payroll', 'Unable to advance this run — check status and period lock.');
      return;
    }
    const labels: Record<PayrollAction, string> = {
      submitReview: 'submitted for review',
      approve: 'approved',
      finalize: 'finalized — simulated payslips generated for active staff',
    };
    this.toast.success('Payroll updated', `${run.period} ${labels[action]} (demo).`);
  }

  cancelAction(): void {
    this.confirmOpen.set(false);
    this.pendingAction.set(null);
  }

  confirmTitle(): string {
    const action = this.pendingAction();
    if (action === 'submitReview') {
      return 'Submit payroll for review?';
    }
    if (action === 'approve') {
      return 'Approve payroll run?';
    }
    return 'Finalize payroll and generate payslips?';
  }

  confirmMessage(): string {
    if (this.pendingAction() === 'finalize') {
      return 'Finalizing generates DEMO payslip records for active employees and notifies their inbox. No CPF Board or bank GIRO files are created.';
    }
    return 'This advances the selected payroll run in the shared demo store only.';
  }

  employeeLabel(employeeId: string): string {
    return this.hr.employeeName(employeeId);
  }
}
