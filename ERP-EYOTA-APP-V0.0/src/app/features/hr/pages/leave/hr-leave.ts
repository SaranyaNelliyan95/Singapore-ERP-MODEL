import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DataTableColumn } from '../../../../core/models/common.model';
import { LeaveRequest } from '../../../../core/models/employee.model';
import { EmployeeMockService } from '../../../../core/services/employee-mock.service';
import { HrMockService } from '../../../../core/services/hr-mock.service';
import { ToastService } from '../../../../core/services/toast.service';
import { formatSgDate } from '../../../../core/utils/singapore.utils';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge';
import { DemoNoticeComponent } from '../../../employee/shared/demo-notice';

@Component({
  selector: 'app-hr-leave',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DataTableComponent,
    LoadingSpinnerComponent,
    StatusBadgeComponent,
    DemoNoticeComponent,
  ],
  templateUrl: './hr-leave.html',
  styleUrl: './hr-leave.css',
})
export class HrLeavePage implements OnInit {
  readonly hr = inject(HrMockService);
  private readonly workforce = inject(EmployeeMockService);
  private readonly fb = inject(FormBuilder);
  readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly rejectTarget = signal<LeaveRequest | null>(null);

  readonly rejectForm = this.fb.nonNullable.group({
    comments: ['', [Validators.required, Validators.minLength(5)]],
  });

  readonly pending = computed(() =>
    this.hr.workforce().leaveRequests.filter((row) => row.status === 'Pending'),
  );

  readonly columns: DataTableColumn<LeaveRequest>[] = [
    { key: 'id', label: 'Request', sortable: true },
    {
      key: 'employeeId',
      label: 'Employee',
      sortable: true,
      format: (row) => this.hr.employeeName(row.employeeId),
    },
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
    { key: 'days', label: 'Days', align: 'center', sortable: true },
    { key: 'reason', label: 'Reason' },
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
  ];

  ngOnInit(): void {
    this.hr.getMasterSnapshot().subscribe(() => this.loading.set(false));
  }

  approve(row: LeaveRequest): void {
    const ok = this.workforce.approveLeave(row.id);
    if (ok) {
      this.toast.success('Leave approved', `${row.id} approved — employee view updated instantly.`);
    }
  }

  openReject(row: LeaveRequest): void {
    this.rejectForm.reset({ comments: '' });
    this.rejectTarget.set(row);
  }

  confirmReject(): void {
    this.rejectForm.markAllAsTouched();
    if (this.rejectForm.invalid) {
      this.toast.warning('Comments required', 'Provide at least 5 characters.');
      return;
    }
    const target = this.rejectTarget();
    if (!target) {
      return;
    }
    const comments = this.rejectForm.controls.comments.value;
    const ok = this.workforce.rejectLeave(target.id, comments);
    this.rejectTarget.set(null);
    if (ok) {
      this.toast.success('Leave rejected', `${target.id} rejected with comments — balance restored.`);
    }
  }

  closeReject(): void {
    this.rejectTarget.set(null);
  }

  historyFor(employeeId: string): LeaveRequest[] {
    return this.hr
      .workforce()
      .leaveRequests.filter((row) => row.employeeId === employeeId && row.status !== 'Pending')
      .slice(0, 3);
  }
}
