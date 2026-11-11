import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DataTableColumn } from '../../../../core/models/common.model';
import { PayslipRecord } from '../../../../core/models/employee.model';
import { PayrollException, PayrollRun } from '../../../../core/models/hr.model';
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

/** Labels aligned to Figma Screen B (Singapore Payroll Operations). */
const WORKFLOW = [
  'Draft & Timesheets',
  'Statutory Validation',
  'Executive Review',
  'Director Approval',
  'Bank GIRO Release',
] as const;

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
  readonly workflow = WORKFLOW;

  readonly selectedRun = computed(
    () => this.hr.workforce().payrollRuns.find((run) => run.id === this.selectedRunId()) ?? null,
  );

  readonly payrollKpis = computed(() => {
    const state = this.hr.workforce();
    const runs = state.payrollRuns;
    const active =
      runs.find((r) => ['Draft', 'Under Review', 'Approved'].includes(r.status)) ?? runs[0];
    const exceptions = (state.payrollExceptions ?? []).filter(
      (e) => !e.resolved && (!active || e.runId === active.id),
    );
    const published = state.payslips.length;
    return {
      currentPeriod: state.policies.statutory.activePayPeriod,
      periodOpen: state.policies.statutory.payrollPeriodOpen,
      draftRuns: runs.filter((r) => r.status === 'Draft').length,
      underReview: runs.filter((r) => r.status === 'Under Review').length,
      pendingApproval: runs.filter((r) => r.status === 'Under Review' || r.status === 'Draft')
        .length,
      processed: runs.filter((r) => r.status === 'Finalized' || r.status === 'Paid').length,
      employeesInRun: active?.employeeCount ?? 0,
      exceptions: exceptions.length,
      blockers: exceptions.filter((e) => e.severity === 'Blocker').length,
      publishedPayslips: published,
    };
  });

  readonly exceptions = computed(() => {
    const runId = this.selectedRunId();
    return (this.hr.workforce().payrollExceptions ?? []).filter(
      (e) => e.runId === runId && !e.resolved,
    );
  });

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

  readonly workflowStep = computed(() => {
    const run = this.selectedRun();
    if (!run) {
      return 0;
    }
    // Maps legacy run statuses onto Figma 5-step payroll operations stepper.
    if (run.status === 'Finalized' || run.status === 'Paid') {
      return 4;
    }
    if (run.status === 'Approved') {
      return 3;
    }
    if (run.status === 'Under Review') {
      return 2;
    }
    if (this.exceptions().some((e) => e.severity === 'Blocker')) {
      return 1;
    }
    return 0;
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

  readonly exceptionColumns: DataTableColumn<PayrollException>[] = [
    { key: 'employeeId', label: 'Employee', sortable: true },
    { key: 'type', label: 'Type', sortable: true },
    {
      key: 'severity',
      label: 'Severity',
      badge: (row) => ({
        label: row.severity,
        tone: row.severity === 'Blocker' ? 'danger' : row.severity === 'Warning' ? 'warning' : 'info',
      }),
    },
    { key: 'message', label: 'Message' },
  ];

  ngOnInit(): void {
    this.hr.getMasterSnapshot().subscribe(() => {
      const runs = this.hr.workforce().payrollRuns;
      this.selectedRunId.set(runs[0]?.id ?? '');
      if (runs[0]) {
        this.workforce.refreshPayrollExceptions(runs[0].id);
      }
      const slips = this.periodPayslips();
      this.selectedEmployeeId.set(slips[0]?.employeeId ?? '');
      this.loading.set(false);
    });
  }

  selectRun(id: string): void {
    this.selectedRunId.set(id);
    this.workforce.refreshPayrollExceptions(id);
    const slips = this.periodPayslips();
    this.selectedEmployeeId.set(slips[0]?.employeeId ?? '');
  }

  selectEmployee(employeeId: string): void {
    this.selectedEmployeeId.set(employeeId);
  }

  validateRun(): void {
    const run = this.selectedRun();
    if (!run) {
      return;
    }
    const generated = this.workforce.refreshPayrollExceptions(run.id);
    const blockers = generated.filter((e) => e.severity === 'Blocker').length;
    if (blockers) {
      this.toast.warning(
        'Validation complete',
        `${generated.length} exception(s), ${blockers} blocker(s) — resolve before finalize.`,
      );
    } else {
      this.toast.success(
        'Validation complete',
        generated.length
          ? `${generated.length} warning(s) — review before approval.`
          : 'No payroll exceptions detected for this run.',
      );
    }
  }

  resolveException(id: string): void {
    if (this.workforce.resolvePayrollException(id)) {
      this.toast.success('Exception resolved', id);
    } else {
      this.toast.danger('Resolve failed', 'Exception already resolved or missing.');
    }
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
    if (action === 'finalize' && this.exceptions().some((e) => e.severity === 'Blocker')) {
      this.toast.danger(
        'Blockers open',
        'Resolve blocker exceptions (e.g. missing bank) before finalize.',
      );
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
      submitReview: 'submitted for HR review',
      approve: 'authorized / approved',
      finalize: 'finalized — simulated payslips published to employee accounts',
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
      return 'Submit payroll for HR review?';
    }
    if (action === 'approve') {
      return 'Authorize / approve payroll run?';
    }
    return 'Finalize payroll and publish payslips?';
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
