import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataTableColumn, WorkLocation } from '../../../../core/models/common.model';
import { AttendanceRecord } from '../../../../core/models/employee.model';
import { EmployeeMockService } from '../../../../core/services/employee-mock.service';
import { ToastService } from '../../../../core/services/toast.service';
import { formatSgDate } from '../../../../core/utils/singapore.utils';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge';
import { DemoNoticeComponent } from '../../shared/demo-notice';

@Component({
  selector: 'app-employee-attendance',
  standalone: true,
  imports: [
    FormsModule,
    DataTableComponent,
    LoadingSpinnerComponent,
    StatusBadgeComponent,
    DemoNoticeComponent,
  ],
  templateUrl: './employee-attendance.html',
  styleUrl: './employee-attendance.css',
})
export class EmployeeAttendancePage implements OnInit {
  private readonly employeeService = inject(EmployeeMockService);
  readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly ws = this.employeeService.workspace;
  selectedLocation: WorkLocation = 'Office';

  readonly columns: DataTableColumn<AttendanceRecord>[] = [
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      format: (row) => formatSgDate(row.date),
    },
    { key: 'checkIn', label: 'Check-in', format: (row) => row.checkIn ?? '—' },
    { key: 'checkOut', label: 'Check-out', format: (row) => row.checkOut ?? '—' },
    { key: 'location', label: 'Location', sortable: true },
    {
      key: 'gpsTracked',
      label: 'GPS',
      format: (row) => (row.gpsTracked ? 'On' : 'Off'),
    },
    {
      key: 'otHours',
      label: 'OT hrs',
      align: 'center',
      sortable: true,
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
    this.employeeService.getWorkspace().subscribe(() => this.loading.set(false));
  }

  toggleGps(): void {
    const enabled = this.employeeService.toggleGps();
    this.toast.success(
      enabled ? 'GPS tracking on' : 'GPS tracking off',
      enabled
        ? 'Simulated GPS flag enabled for the next clock action.'
        : 'Simulated GPS flag disabled.',
    );
  }

  clockIn(): void {
    if (this.ws().clock.status === 'Checked in') {
      this.toast.warning('Already clocked in', 'Clock out before starting a new session.');
      return;
    }
    const clock = this.employeeService.clockIn(this.selectedLocation);
    this.toast.success(
      'Clocked in',
      `${clock.checkIn} · ${clock.location}${clock.gpsEnabled ? ' · GPS on' : ' · GPS off'}`,
    );
  }

  clockOut(): void {
    if (this.ws().clock.status !== 'Checked in') {
      this.toast.warning('Not clocked in', 'Clock in first to end your session.');
      return;
    }
    const clock = this.employeeService.clockOut();
    this.toast.success('Clocked out', `Session closed at ${clock.checkOut} (simulated).`);
  }
}
