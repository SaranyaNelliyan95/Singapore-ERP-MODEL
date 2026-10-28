import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { DataTableColumn, LeaveType } from '../../../../core/models/common.model';
import { LeaveRequest } from '../../../../core/models/employee.model';
import { EmployeeMockService } from '../../../../core/services/employee-mock.service';
import { LeaveApiService, LeaveRequestDto, LeaveTypeDto } from '../../../../core/services/leave-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { formatSgDate } from '../../../../core/utils/singapore.utils';
import { environment } from '../../../../../environments/environment';
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
  private readonly leaveApi = inject(LeaveApiService);
  private readonly fb = inject(FormBuilder);
  readonly toast = inject(ToastService);

  readonly useBackend = environment.useBackendApi;
  readonly loading = signal(true);
  readonly cancelTarget = signal<LeaveRequest | null>(null);
  readonly dayPreview = signal(0);
  readonly ws = this.employeeService.workspace;
  readonly apiTypes = signal<LeaveTypeDto[]>([]);
  readonly apiRequests = signal<LeaveRequest[]>([]);

  /** Synced from Admin Master Data leave policies (mock) or backend types (API). */
  readonly leaveTypes = computed(() => {
    if (this.useBackend && this.apiTypes().length) {
      return this.apiTypes().map((t) => t.name.replace(/\s+Leave$/i, '') as LeaveType);
    }
    return this.employeeService.enabledLeaveTypes();
  });

  readonly displayRequests = computed(() =>
    this.useBackend ? this.apiRequests() : this.ws().leaveRequests,
  );

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
    this.form.valueChanges.subscribe((value) => {
      this.dayPreview.set(this.calcDays(value.fromDate ?? '', value.toDate ?? ''));
    });
    if (this.useBackend) {
      void this.loadApi();
    } else {
      this.employeeService.getWorkspace().subscribe(() => this.loading.set(false));
    }
  }

  private async loadApi(): Promise<void> {
    try {
      const [types, requests] = await Promise.all([
        firstValueFrom(this.leaveApi.types()),
        firstValueFrom(this.leaveApi.myRequests()),
      ]);
      this.apiTypes.set(types);
      this.apiRequests.set(requests.map((r) => this.mapApiRequest(r, types)));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load leave from API';
      this.toast.danger('Leave API', message);
    } finally {
      this.loading.set(false);
    }
  }

  private mapApiRequest(row: LeaveRequestDto, types: LeaveTypeDto[]): LeaveRequest {
    const typeName = types.find((t) => t.id === row.leaveTypeId)?.name ?? 'Annual';
    const status =
      row.status === 'APPROVED'
        ? 'Approved'
        : row.status === 'REJECTED'
          ? 'Rejected'
          : row.status === 'CANCELLED'
            ? 'Cancelled'
            : row.status === 'SUBMITTED' || row.status === 'DRAFT'
              ? 'Pending'
              : 'Pending';
    return {
      id: row.id,
      employeeId: row.employeeId,
      type: typeName.replace(/\s+Leave$/i, '') as LeaveType,
      fromDate: row.startDate,
      toDate: row.endDate,
      days: Number(row.days),
      reason: row.reason ?? '',
      status,
      approver: 'HR',
      hrComments: row.decisionNote ?? undefined,
    };
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

    if (this.useBackend) {
      void this.applyLeaveApi(values, days);
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

  private async applyLeaveApi(
    values: { type: LeaveType; fromDate: string; toDate: string; reason: string },
    days: number,
  ): Promise<void> {
    const type = this.apiTypes().find((t) => {
      const short = t.name.replace(/\s+Leave$/i, '').toLowerCase();
      return (
        short === values.type.toLowerCase() ||
        (t.code.toLowerCase() === 'al' && values.type === 'Annual')
      );
    });
    if (!type) {
      this.toast.danger(
        'Leave type missing',
        `Backend has no leave type matching “${values.type}”. Seed AL / Annual Leave in dev profile.`,
      );
      return;
    }
    try {
      const draft = await firstValueFrom(
        this.leaveApi.create({
          leaveTypeId: type.id,
          startDate: values.fromDate,
          endDate: values.toDate,
          days,
          reason: values.reason,
        }),
      );
      const submitted = await firstValueFrom(this.leaveApi.submit(draft.id));
      this.apiRequests.update((rows) => [
        this.mapApiRequest(submitted, this.apiTypes()),
        ...rows,
      ]);
      this.form.reset({ type: 'Annual', fromDate: '', toDate: '', reason: '' });
      this.dayPreview.set(0);
      this.toast.success(
        'Leave submitted',
        `${submitted.id.slice(0, 8)}… · ${days} day(s) pending HR (PostgreSQL).`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Leave submit failed';
      this.toast.danger('Leave API', message);
    }
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
    return this.displayRequests().filter((r) => r.status === 'Pending');
  }
}
