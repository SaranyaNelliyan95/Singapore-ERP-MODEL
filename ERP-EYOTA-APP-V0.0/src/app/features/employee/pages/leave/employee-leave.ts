import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { DataTableColumn, LeaveType } from '../../../../core/models/common.model';
import { LeaveRequest } from '../../../../core/models/employee.model';
import { EmployeeMockService } from '../../../../core/services/employee-mock.service';
import { ToastService } from '../../../../core/services/toast.service';
import { formatSgDate } from '../../../../core/utils/singapore.utils';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal/confirm-modal';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge';
import { DemoNoticeComponent } from '../../shared/demo-notice';

function dateRangeValidator(group: AbstractControl): ValidationErrors | null {
  const from = group.get('fromDate')?.value as string;
  const to = group.get('toDate')?.value as string;
  if (!from || !to) {
    return null;
  }
  if (new Date(to) < new Date(from)) {
    return { rangeInvalid: true };
  }
  return null;
}

@Component({
  selector: 'app-employee-leave',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DataTableComponent,
    LoadingSpinnerComponent,
    ConfirmModalComponent,
    StatusBadgeComponent,
    DemoNoticeComponent,
  ],
  templateUrl: './employee-leave.html',
  styleUrl: './employee-leave.css',
})
export class EmployeeLeavePage implements OnInit {
  private readonly employeeService = inject(EmployeeMockService);
  private readonly fb = inject(FormBuilder);
  readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly cancelTarget = signal<LeaveRequest | null>(null);
  readonly dayPreview = signal(0);
  readonly ws = this.employeeService.workspace;

  /** Synced from Admin Master Data leave policies */
  readonly leaveTypes = computed(() => this.employeeService.enabledLeaveTypes());

  readonly form = this.fb.nonNullable.group(
    {
      type: ['Annual' as LeaveType, Validators.required],
      fromDate: ['', Validators.required],
      toDate: ['', Validators.required],
      reason: ['', [Validators.required, Validators.minLength(5)]],
    },
    { validators: dateRangeValidator },
  );

  readonly columns: DataTableColumn<LeaveRequest>[] = [
    { key: 'id', label: 'Request', sortable: true },
    { key: 'type', label: 'Type', sortable: true },
    {
      key: 'fromDate',
      label: 'From',
      format: (row) => formatSgDate(row.fromDate),
    },
    {
      key: 'toDate',
      label: 'To',
      format: (row) => formatSgDate(row.toDate),
    },
    { key: 'days', label: 'Days', align: 'center' },
    {
      key: 'status',
      label: 'Status',
      badge: (row) => ({
        label: row.status,
        tone:
          row.status === 'Approved'
            ? 'success'
            : row.status === 'Pending'
              ? 'warning'
              : row.status === 'Cancelled'
                ? 'neutral'
                : 'danger',
      }),
    },
    { key: 'reason', label: 'Reason' },
  ];

  ngOnInit(): void {
    this.employeeService.getWorkspace().subscribe(() => this.loading.set(false));
    this.form.valueChanges.subscribe((value) => {
      this.dayPreview.set(this.calcDays(value.fromDate ?? '', value.toDate ?? ''));
    });
  }

  calcDays(fromDate: string, toDate: string): number {
    if (!fromDate || !toDate) {
      return 0;
    }
    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) {
      return 0;
    }
    return Math.floor((to.getTime() - from.getTime()) / 86400000) + 1;
  }

  applyLeave(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.toast.warning('Leave form', 'Check leave type, date range, and reason.');
      return;
    }

    const values = this.form.getRawValue();
    const days = this.calcDays(values.fromDate, values.toDate);
    if (days < 1) {
      this.toast.warning('Date range', 'End date must be on or after start date.');
      return;
    }

    const balance = this.ws().leaveBalances.find((b) => b.type === values.type);
    if (values.type !== 'Unpaid' && balance && balance.balance < days) {
      this.toast.danger(
        'Insufficient balance',
        `Simulated ${values.type} balance is ${balance.balance} day(s).`,
      );
      return;
    }

    const result = this.employeeService.applyLeave({ ...values, days });
    if ('error' in result) {
      this.toast.danger('Leave blocked', result.error);
      return;
    }
    this.form.reset({
      type: 'Annual',
      fromDate: '',
      toDate: '',
      reason: '',
    });
    this.dayPreview.set(0);
    this.toast.success(
      'Leave submitted',
      `${result.id} · ${days} day(s) pending HR — balance updates only after approval.`,
    );
  }

  requestCancel(row: LeaveRequest): void {
    if (row.status !== 'Pending') {
      this.toast.warning('Cannot cancel', 'Only pending requests can be cancelled.');
      return;
    }
    this.cancelTarget.set(row);
  }

  confirmCancel(): void {
    const target = this.cancelTarget();
    this.cancelTarget.set(null);
    if (!target) {
      return;
    }
    const ok = this.employeeService.cancelLeave(target.id);
    if (ok) {
      this.toast.success('Request cancelled', `${target.id} cancelled (balance was never reserved).`);
    } else {
      this.toast.danger('Cancel failed', 'Request was not pending or not found.');
    }
  }

  closeCancel(): void {
    this.cancelTarget.set(null);
  }

  invalid(name: 'type' | 'fromDate' | 'toDate' | 'reason'): boolean {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }

  get rangeInvalid(): boolean {
    return !!this.form.errors?.['rangeInvalid'] && this.form.touched;
  }

  pendingRows(): LeaveRequest[] {
    return this.ws().leaveRequests.filter((r) => r.status === 'Pending');
  }
}
