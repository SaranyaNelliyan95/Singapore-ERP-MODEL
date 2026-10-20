import { Component, OnInit, inject, signal } from '@angular/core';
import { DataTableColumn } from '../../../../core/models/common.model';
import { AttendanceRecord } from '../../../../core/models/employee.model';
import { EmployeeMockService } from '../../../../core/services/employee-mock.service';
import { HrMockService } from '../../../../core/services/hr-mock.service';
import { ToastService } from '../../../../core/services/toast.service';
import { formatSgDate } from '../../../../core/utils/singapore.utils';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';
import { DemoNoticeComponent } from '../../../employee/shared/demo-notice';

interface AttendanceView extends AttendanceRecord {
  employeeName: string;
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
  readonly toast = inject(ToastService);

  readonly loading = signal(true);

  readonly columns: DataTableColumn<AttendanceView>[] = [
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      format: (row) => formatSgDate(row.date),
    },
    { key: 'employeeName', label: 'Employee', sortable: true },
    { key: 'checkIn', label: 'In', format: (row) => row.checkIn ?? '—' },
    { key: 'checkOut', label: 'Out', format: (row) => row.checkOut ?? '—' },
    { key: 'location', label: 'Location', sortable: true },
    {
      key: 'lateMinutes',
      label: 'Late (min)',
      align: 'center',
      sortable: true,
    },
    {
      key: 'otHours',
      label: 'OT hrs',
      align: 'center',
      sortable: true,
    },
    {
      key: 'otApproved',
      label: 'OT status',
      badge: (row) =>
        row.otHours <= 0
          ? { label: 'N/A', tone: 'neutral' }
          : row.otApproved
            ? { label: 'Approved', tone: 'success' }
            : { label: 'Pending', tone: 'warning' },
    },
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
    this.hr.getMasterSnapshot().subscribe(() => this.loading.set(false));
  }

  rows(): AttendanceView[] {
    const state = this.hr.workforce();
    return state.attendance.map((row) => ({
      ...row,
      employeeName: this.hr.employeeName(row.employeeId),
      otApproved: !!state.otApprovals[row.id],
    }));
  }

  otPending(): AttendanceView[] {
    return this.rows().filter((row) => row.otHours > 0 && !row.otApproved);
  }

  approveOt(row: AttendanceView): void {
    const ok = this.workforce.approveOvertime(row.id);
    if (ok) {
      this.toast.success(
        'Overtime approved',
        `${row.employeeName} · ${row.otHours}h on ${row.date} (synced notification).`,
      );
    }
  }
}
