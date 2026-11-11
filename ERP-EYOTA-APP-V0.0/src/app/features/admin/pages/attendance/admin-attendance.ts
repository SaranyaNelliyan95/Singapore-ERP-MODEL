import { Component, OnInit, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DataTableColumn } from '../../../../core/models/common.model';
import {
  AttendanceApiService,
  AttendanceSessionDto,
} from '../../../../core/services/attendance-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { formatSgDate } from '../../../../core/utils/singapore.utils';
import { environment } from '../../../../../environments/environment';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal/confirm-modal';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';

interface AdminAttendanceRow {
  id: string;
  date: string;
  employeeName: string;
  employeeCode: string;
  checkIn: string;
  checkOut: string;
  workMode: string;
  gpsLabel: string;
  status: string;
}

@Component({
  selector: 'app-admin-attendance',
  standalone: true,
  imports: [DataTableComponent, LoadingSpinnerComponent, ConfirmModalComponent],
  templateUrl: './admin-attendance.html',
  styleUrl: './admin-attendance.css',
})
export class AdminAttendancePage implements OnInit {
  private readonly attendanceApi = inject(AttendanceApiService);
  readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly useBackend = environment.useBackendApi;
  readonly gpsMandatory = signal(true);
  readonly rows = signal<AdminAttendanceRow[]>([]);
  readonly confirmOpen = signal(false);
  readonly pendingGps = signal<boolean | null>(null);

  readonly columns: DataTableColumn<AdminAttendanceRow>[] = [
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      format: (row) => formatSgDate(row.date),
    },
    { key: 'employeeName', label: 'Employee', sortable: true },
    { key: 'employeeCode', label: 'Code', sortable: true },
    { key: 'checkIn', label: 'In' },
    { key: 'checkOut', label: 'Out' },
    { key: 'workMode', label: 'Mode', sortable: true },
    { key: 'gpsLabel', label: 'GPS / Location', sortable: true },
    {
      key: 'status',
      label: 'Status',
      badge: (row) => ({
        label: row.status,
        tone:
          row.status === 'Present'
            ? 'success'
            : row.status === 'In Progress'
              ? 'warning'
              : 'neutral',
      }),
    },
  ];

  ngOnInit(): void {
    if (!this.useBackend) {
      this.loading.set(false);
      return;
    }
    void this.reload().finally(() => this.loading.set(false));
  }

  requestToggle(): void {
    this.pendingGps.set(!this.gpsMandatory());
    this.confirmOpen.set(true);
  }

  confirmMessage(): string {
    if (this.pendingGps()) {
      return 'On: employees must allow location when clocking in or out. Coordinates and accuracy are saved. Clocking without GPS will be blocked.';
    }
    return 'Off: employees can clock in or out without sharing location. No GPS coordinates will be captured for new punches.';
  }

  cancelToggle(): void {
    this.confirmOpen.set(false);
    this.pendingGps.set(null);
  }

  async confirmToggle(): Promise<void> {
    const next = this.pendingGps();
    if (next == null) {
      return;
    }
    this.saving.set(true);
    try {
      const policy = await firstValueFrom(this.attendanceApi.setAdminGpsPolicy(next));
      this.gpsMandatory.set(!!policy.gpsMandatory);
      this.toast.success(
        policy.gpsMandatory ? 'GPS On' : 'GPS Off',
        policy.gpsMandatory
          ? 'Employees must use GPS for clock-in and clock-out.'
          : 'GPS is not required; location will not be captured.',
      );
    } catch (err) {
      this.toast.danger(
        'Policy update failed',
        err instanceof Error ? err.message : 'Unable to update GPS policy',
      );
    } finally {
      this.saving.set(false);
      this.confirmOpen.set(false);
      this.pendingGps.set(null);
    }
  }

  private async reload(): Promise<void> {
    try {
      const [policy, sessions] = await Promise.all([
        firstValueFrom(this.attendanceApi.getAdminGpsPolicy()),
        firstValueFrom(this.attendanceApi.adminList()),
      ]);
      this.gpsMandatory.set(!!policy.gpsMandatory);
      this.rows.set(sessions.map((s) => this.toRow(s)));
    } catch (err) {
      this.toast.danger(
        'Attendance load failed',
        err instanceof Error ? err.message : 'Unable to load admin attendance',
      );
    }
  }

  private toRow(s: AttendanceSessionDto): AdminAttendanceRow {
    const gpsLabel =
      s.clockInLat != null && s.clockInLng != null
        ? `${s.clockInLat.toFixed(5)}, ${s.clockInLng.toFixed(5)}` +
          (s.clockInAccuracy != null ? ` (±${Math.round(s.clockInAccuracy)}m)` : '')
        : s.geofenceResult === 'SKIPPED'
          ? 'GPS off / skipped'
          : '—';
    return {
      id: s.id,
      date: s.attendanceDate,
      employeeName: s.employeeName ?? '—',
      employeeCode: s.employeeCode ?? '—',
      checkIn: this.formatInstant(s.clockInAt),
      checkOut: this.formatInstant(s.clockOutAt),
      workMode: s.workMode,
      gpsLabel,
      status: s.status === 'OPEN' ? 'In Progress' : s.status === 'CLOSED' ? 'Present' : s.status,
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
