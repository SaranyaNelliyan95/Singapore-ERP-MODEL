import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { DataTableColumn, WorkLocation } from '../../../../core/models/common.model';
import { AttendanceRecord } from '../../../../core/models/employee.model';
import {
  AttendanceApiService,
  AttendanceSessionDto,
  WorkModeApi,
} from '../../../../core/services/attendance-api.service';
import { EmployeeMockService } from '../../../../core/services/employee-mock.service';
import {
  GeoLocationError,
  GeolocationService,
} from '../../../../core/services/geolocation.service';
import { OnboardingApiService } from '../../../../core/services/onboarding-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { formatSgDate } from '../../../../core/utils/singapore.utils';
import { environment } from '../../../../../environments/environment';
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
  private readonly geo = inject(GeolocationService);
  private readonly attendanceApi = inject(AttendanceApiService);
  private readonly onboardingApi = inject(OnboardingApiService);
  readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly locating = signal(false);
  readonly useBackend = environment.useBackendApi;
  readonly gpsMandatory = signal(true);
  readonly ws = this.employeeService.workspace;
  readonly backendStatus = signal<'Checked out' | 'Checked in'>('Checked out');
  readonly backendSessionLabel = signal('No active backend session');
  readonly historyRows = signal<AttendanceRecord[]>([]);
  readonly canClockIn = signal(true);
  readonly canClockOut = signal(false);
  /** False until HR marks Complete Ready to Work (when onboarding exists). */
  readonly readyForAttendance = signal(true);
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
      format: (row) => (row.gpsTracked ? 'Captured' : 'Off'),
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
    if (this.useBackend) {
      void this.refreshBackend().finally(() => this.loading.set(false));
      return;
    }
    this.employeeService.getWorkspace().subscribe(() => {
      this.historyRows.set(this.ws().attendance);
      this.loading.set(false);
    });
  }

  displayStatus(): string {
    return this.useBackend ? this.backendStatus() : this.ws().clock.status;
  }

  displaySession(): string {
    return this.useBackend ? this.backendSessionLabel() : this.mockSessionLabel();
  }

  private mockSessionLabel(): string {
    const clock = this.ws().clock;
    if (!clock.checkIn) {
      return 'No active session';
    }
    let label = `In ${clock.checkIn}`;
    if (clock.checkOut) {
      label += ` · Out ${clock.checkOut}`;
    }
    return `${label} · ${clock.location}`;
  }

  toggleGps(): void {
    if (this.useBackend) {
      this.toast.warning(
        'Admin controlled',
        'GPS On/Off is managed by Admin under Attendance. Employees cannot change it here.',
      );
      return;
    }
    const enabled = this.employeeService.toggleGps();
    this.toast.success(
      enabled ? 'GPS tracking on' : 'GPS tracking off',
      enabled
        ? 'Simulated GPS flag only — set environment.useBackendApi = true for real GPS + geofencing.'
        : 'Simulated GPS flag disabled.',
    );
  }

  async clockIn(): Promise<void> {
    if (this.useBackend) {
      await this.clockWithBackend('in');
      return;
    }
    if (this.ws().clock.status === 'Checked in') {
      this.toast.warning('Already clocked in', 'Clock out before starting a new session.');
      return;
    }
    const clock = this.employeeService.clockIn(this.selectedLocation);
    this.historyRows.set(this.ws().attendance);
    this.toast.success(
      'Clocked in (demo mock)',
      `${clock.checkIn} · ${clock.location} — not persisted to PostgreSQL.`,
    );
  }

  async clockOut(): Promise<void> {
    if (this.useBackend) {
      await this.clockWithBackend('out');
      return;
    }
    if (this.ws().clock.status !== 'Checked in') {
      this.toast.warning('Not clocked in', 'Clock in first to end your session.');
      return;
    }
    const clock = this.employeeService.clockOut();
    this.historyRows.set(this.ws().attendance);
    this.toast.success('Clocked out (demo mock)', `Session closed at ${clock.checkOut}.`);
  }

  private async clockWithBackend(action: 'in' | 'out'): Promise<void> {
    if (action === 'in' && !this.readyForAttendance()) {
      this.toast.warning(
        'Not ready to work',
        'Attendance unlocks after HR clicks Complete Ready to Work on your onboarding.',
      );
      return;
    }
    if (action === 'in' && !this.canClockIn()) {
      this.toast.warning('Already recorded', 'Only one clock-in is allowed per day.');
      return;
    }
    if (action === 'out' && !this.canClockOut()) {
      this.toast.warning('Cannot clock out', 'Clock in first, or you already clocked out today.');
      return;
    }

    this.locating.set(true);
    try {
      let position = null;
      if (this.gpsMandatory()) {
        if (!this.geo.isSupported()) {
          this.toast.danger(
            'GPS unsupported',
            'This browser cannot provide location. Use HTTPS or localhost with a modern browser.',
          );
          return;
        }
        const permission = await this.geo.queryPermission();
        if (permission === 'denied') {
          this.toast.danger(
            'Location permission denied',
            'Allow location access for this site, enable device location services, then retry.',
          );
          return;
        }
        position = await this.geo.getCurrentPosition();
      }

      const workMode = this.toWorkMode(this.selectedLocation);
      const session =
        action === 'in'
          ? await firstValueFrom(this.attendanceApi.clockIn(position, workMode))
          : await firstValueFrom(this.attendanceApi.clockOut(position, workMode));

      await this.refreshBackend();
      const gpsNote = this.gpsMandatory()
        ? position
          ? ` · GPS ±${Math.round(position.accuracyMetres)} m`
          : ''
        : ' · GPS off (not captured)';
      const distance =
        session.distanceMetres != null ? ` · ${Math.round(session.distanceMetres)} m from workplace` : '';
      this.toast.success(
        action === 'in' ? 'Clocked in' : 'Clocked out',
        `Saved · ${session.geofenceResult}${distance}${gpsNote}`,
      );
    } catch (err) {
      const message =
        err instanceof GeoLocationError || err instanceof Error
          ? err.message
          : 'Attendance request failed.';
      this.toast.danger(action === 'in' ? 'Clock-in blocked' : 'Clock-out blocked', message);
    } finally {
      this.locating.set(false);
    }
  }

  private async refreshBackend(): Promise<void> {
    try {
      await this.refreshReadyForAttendance();
      const policy = await firstValueFrom(this.attendanceApi.getGpsPolicy());
      this.gpsMandatory.set(!!policy.gpsMandatory);
      const today = await firstValueFrom(this.attendanceApi.today());
      this.applyToday(today);
      const history = await firstValueFrom(this.attendanceApi.history());
      this.historyRows.set(history.map((s) => this.toHistoryRow(s)));
    } catch {
      this.backendSessionLabel.set('Unable to load attendance from API — is the backend running?');
    }
  }

  private async refreshReadyForAttendance(): Promise<void> {
    try {
      const onboarding = await firstValueFrom(this.onboardingApi.myOnboarding());
      const ready = (onboarding.pipelineStatus || '').toUpperCase() === 'READY_TO_WORK';
      this.readyForAttendance.set(ready);
    } catch {
      // No onboarding record — legacy employees may still clock in
      this.readyForAttendance.set(true);
    }
  }

  private applyToday(today: AttendanceSessionDto | null): void {
    if (today && today.status === 'OPEN') {
      this.backendStatus.set('Checked in');
      this.backendSessionLabel.set(
        `In ${this.formatInstant(today.clockInAt)} · ${today.workMode} · ${today.geofenceResult}` +
          this.locationSuffix(today.clockInLat, today.clockInLng, today.clockInAccuracy),
      );
      this.canClockIn.set(false);
      this.canClockOut.set(true);
      return;
    }
    if (today && today.status === 'CLOSED') {
      this.backendStatus.set('Checked out');
      this.backendSessionLabel.set(
        `Out ${this.formatInstant(today.clockOutAt)} · closed ${today.attendanceDate}` +
          this.locationSuffix(today.clockOutLat, today.clockOutLng, today.clockOutAccuracy),
      );
      this.canClockIn.set(false);
      this.canClockOut.set(false);
      return;
    }
    this.backendStatus.set('Checked out');
    this.backendSessionLabel.set(
      this.readyForAttendance()
        ? 'No active backend session today'
        : 'Clock-in locked until HR completes Ready to Work',
    );
    this.canClockIn.set(this.readyForAttendance());
    this.canClockOut.set(false);
  }

  private locationSuffix(lat?: number | null, lng?: number | null, acc?: number | null): string {
    if (lat == null || lng == null) {
      return '';
    }
    const accuracy = acc != null ? ` ±${Math.round(acc)}m` : '';
    return ` · ${lat.toFixed(5)}, ${lng.toFixed(5)}${accuracy}`;
  }

  private toHistoryRow(s: AttendanceSessionDto): AttendanceRecord {
    return {
      id: s.id,
      employeeId: s.employeeId,
      date: s.attendanceDate,
      checkIn: this.formatInstant(s.clockInAt),
      checkOut: this.formatInstant(s.clockOutAt),
      location: this.fromWorkMode(s.workMode),
      otHours: 0,
      gpsTracked: s.geofenceResult !== 'SKIPPED' && s.clockInLat != null,
      lateMinutes: 0,
      status: s.status === 'OPEN' ? 'In Progress' : s.status === 'CLOSED' ? 'Present' : 'Absent',
    };
  }

  private fromWorkMode(mode: WorkModeApi): WorkLocation {
    if (mode === 'SITE') {
      return 'Site';
    }
    if (mode === 'WFH') {
      return 'WFH';
    }
    return 'Office';
  }

  private toWorkMode(location: WorkLocation): WorkModeApi {
    if (location === 'Site') {
      return 'SITE';
    }
    if (location === 'WFH') {
      return 'WFH';
    }
    return 'OFFICE';
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
