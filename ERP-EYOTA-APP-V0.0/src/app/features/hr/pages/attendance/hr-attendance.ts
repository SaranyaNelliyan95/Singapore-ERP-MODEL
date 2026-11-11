import { Component, OnInit, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DataTableColumn } from '../../../../core/models/common.model';
import { AttendanceRecord } from '../../../../core/models/employee.model';
import {
  AttendanceApiService,
  AttendanceSessionDto,
} from '../../../../core/services/attendance-api.service';
import { EmployeeMockService } from '../../../../core/services/employee-mock.service';
import { HrMockService } from '../../../../core/services/hr-mock.service';
import { ToastService } from '../../../../core/services/toast.service';
import { formatSgDate } from '../../../../core/utils/singapore.utils';
import { environment } from '../../../../../environments/environment';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';
import { DemoNoticeComponent } from '../../../employee/shared/demo-notice';

interface AttendanceView extends AttendanceRecord {
  employeeName: string;
  employeeCode: string;
  gpsLabel: string;
  otApproved: boolean;
}

@Component({
  selector: 'app-hr-attendance',
  standalone: true,
  imports: [DataTableComponent, LoadingSpinnerComponent, DemoNoticeComponent],
  templateUrl: './hr-attendance.html',
  styleUrl: './hr-attendance.css',
})
export class HrAttendancePage implements OnInit {
  readonly hr = inject(HrMockService);
  private readonly workforce = inject(EmployeeMockService);
  private readonly attendanceApi = inject(AttendanceApiService);
  readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly useBackend = environment.useBackendApi;
  readonly apiRows = signal<AttendanceView[]>([]);

  readonly columns: DataTableColumn<AttendanceView>[] = [
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      format: (row) => formatSgDate(row.date),
    },
    { key: 'employeeName', label: 'Employee', sortable: true },
    { key: 'employeeCode', label: 'Code', sortable: true },
    { key: 'checkIn', label: 'In', format: (row) => row.checkIn ?? '—' },
    { key: 'checkOut', label: 'Out', format: (row) => row.checkOut ?? '—' },
    { key: 'location', label: 'Mode', sortable: true },
    { key: 'gpsLabel', label: 'GPS / Location', sortable: true },
    {
      key: 'status',
      label: 'Status',
      badge: (row) => ({
        label: row.status,
        tone:
          row.status === 'Present'
            ? 'success'
            : row.status === 'Late' || row.status === 'In Progress'
              ? 'warning'
              : row.status === 'Absent'
                ? 'danger'
                : 'info',
      }),
    },
  ];

  ngOnInit(): void {
    if (this.useBackend) {
      void this.loadApi().finally(() => this.loading.set(false));
      return;
    }
    this.hr.getMasterSnapshot().subscribe(() => this.loading.set(false));
  }

  rows(): AttendanceView[] {
    if (this.useBackend) {
      return this.apiRows();
    }
    const state = this.hr.workforce();
    return state.attendance.map((row) => ({
      ...row,
      employeeName: this.hr.employeeName(row.employeeId),
      employeeCode: '',
      gpsLabel: row.gpsTracked ? 'Verified' : 'Off',
      otApproved: !!state.otApprovals[row.id],
    }));
  }

  otPending(): AttendanceView[] {
    return this.rows().filter((row) => row.otHours > 0 && !row.otApproved);
  }

  approveOt(row: AttendanceView): void {
    if (this.useBackend) {
      this.toast.warning('API mode', 'OT approval via API is not wired yet for this build.');
      return;
    }
    const ok = this.workforce.approveOvertime(row.id);
    if (ok) {
      this.toast.success(
        'Overtime approved',
        `${row.employeeName} · ${row.otHours}h on ${row.date} (synced notification).`,
      );
    }
  }

  private async loadApi(): Promise<void> {
    try {
      const sessions = await firstValueFrom(this.attendanceApi.hrList());
      this.apiRows.set(sessions.map((s) => this.toView(s)));
    } catch (err) {
      this.toast.danger(
        'Attendance load failed',
        err instanceof Error ? err.message : 'Unable to load HR attendance',
      );
      this.apiRows.set([]);
    }
  }

  private toView(s: AttendanceSessionDto): AttendanceView {
    const gpsLabel =
      s.clockInLat != null && s.clockInLng != null
        ? `${s.clockInLat.toFixed(5)}, ${s.clockInLng.toFixed(5)}` +
          (s.clockInAccuracy != null ? ` (±${Math.round(s.clockInAccuracy)}m)` : '')
        : s.geofenceResult === 'SKIPPED'
          ? 'GPS off / skipped'
          : '—';
    return {
      id: s.id,
      employeeId: s.employeeId,
      employeeName: s.employeeName ?? '—',
      employeeCode: s.employeeCode ?? '—',
      date: s.attendanceDate,
      checkIn: this.formatInstant(s.clockInAt),
      checkOut: this.formatInstant(s.clockOutAt),
      location: s.workMode === 'SITE' ? 'Site' : s.workMode === 'WFH' ? 'WFH' : 'Office',
      otHours: 0,
      gpsTracked: s.clockInLat != null,
      lateMinutes: 0,
      status: s.status === 'OPEN' ? 'In Progress' : s.status === 'CLOSED' ? 'Present' : 'Absent',
      gpsLabel,
      otApproved: true,
    };
  }

  private formatInstant(value: string | null): string {
    if (!value) {
      return '—';
    }
    try {
      return new Date(value).toLocaleTimeString('en-SG', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Singapore',
      });
    } catch {
      return value;
    }
  }
}
