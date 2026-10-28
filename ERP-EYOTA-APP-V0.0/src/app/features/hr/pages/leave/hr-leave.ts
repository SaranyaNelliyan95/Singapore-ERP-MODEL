import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { DataTableColumn, LeaveType } from '../../../../core/models/common.model';
import { LeaveRequest } from '../../../../core/models/employee.model';
import { EmployeeMockService } from '../../../../core/services/employee-mock.service';
import { HrMockService } from '../../../../core/services/hr-mock.service';
import { LeaveApiService, LeaveRequestDto, LeaveTypeDto } from '../../../../core/services/leave-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { formatSgDate } from '../../../../core/utils/singapore.utils';
import { environment } from '../../../../../environments/environment';
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
  private readonly leaveApi = inject(LeaveApiService);
  private readonly fb = inject(FormBuilder);
  readonly toast = inject(ToastService);

  readonly useBackend = environment.useBackendApi;
  readonly loading = signal(true);
  readonly rejectTarget = signal<LeaveRequest | null>(null);
  readonly apiPending = signal<LeaveRequest[]>([]);
  private apiTypes: LeaveTypeDto[] = [];

  readonly rejectForm = this.fb.nonNullable.group({
    comments: ['', [Validators.required, Validators.minLength(5)]],
  });

  readonly pending = computed(() =>
    this.useBackend
      ? this.apiPending()
      : this.hr.workforce().leaveRequests.filter((row) => row.status === 'Pending'),
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
    if (this.useBackend) {
      void this.loadPendingApi();
    } else {
      this.hr.getMasterSnapshot().subscribe(() => this.loading.set(false));
    }
  }

  private async loadPendingApi(): Promise<void> {
    try {
      const [types, pending] = await Promise.all([
        firstValueFrom(this.leaveApi.types()),
        firstValueFrom(this.leaveApi.pending()),
      ]);
      this.apiTypes = types;
      this.apiPending.set(pending.map((r) => this.mapApi(r)));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load pending leave';
      this.toast.danger('Leave API', message);
    } finally {
      this.loading.set(false);
    }
  }

  private mapApi(row: LeaveRequestDto): LeaveRequest {
    const typeName = this.apiTypes.find((t) => t.id === row.leaveTypeId)?.name ?? 'Annual';
    return {
      id: row.id,
      employeeId: row.employeeId,
      type: typeName.replace(/\s+Leave$/i, '') as LeaveType,
      fromDate: row.startDate,
      toDate: row.endDate,
      days: Number(row.days),
      reason: row.reason ?? '',
      status: 'Pending',
      approver: 'HR',
    };
  }

  approve(row: LeaveRequest): void {
    if (this.useBackend) {
      void this.approveApi(row);
      return;
    }
    const ok = this.workforce.approveLeave(row.id);
    if (ok) {
      this.toast.success('Leave approved', `${row.id} approved — employee view updated instantly.`);
    }
  }

  private async approveApi(row: LeaveRequest): Promise<void> {
    try {
      await firstValueFrom(this.leaveApi.approve(row.id));
      this.apiPending.update((rows) => rows.filter((r) => r.id !== row.id));
      this.toast.success('Leave approved', `${row.id.slice(0, 8)}… approved in PostgreSQL.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Approve failed';
      this.toast.danger('Leave API', message);
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
    this.rejectTarget.set(null);
    if (this.useBackend) {
      void this.rejectApi(target, comments);
      return;
    }
    const ok = this.workforce.rejectLeave(target.id, comments);
    if (ok) {
      this.toast.success('Leave rejected', `${target.id} rejected with comments — balance restored.`);
    }
  }

  private async rejectApi(target: LeaveRequest, comments: string): Promise<void> {
    try {
      await firstValueFrom(this.leaveApi.reject(target.id, comments));
      this.apiPending.update((rows) => rows.filter((r) => r.id !== target.id));
      this.toast.success('Leave rejected', `${target.id.slice(0, 8)}… rejected in PostgreSQL.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Reject failed';
      this.toast.danger('Leave API', message);
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
