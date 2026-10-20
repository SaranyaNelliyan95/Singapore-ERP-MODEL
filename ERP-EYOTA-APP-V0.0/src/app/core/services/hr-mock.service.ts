import { Injectable, computed, inject } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import { EmployeeMockService } from './employee-mock.service';
import { HrDashboardStats, StaffDirectoryRow } from '../models/hr.model';

@Injectable({ providedIn: 'root' })
export class HrMockService {
  private readonly workforceService = inject(EmployeeMockService);

  /** Shared store reference — same instance Employee ESS mutates */
  readonly workforce = this.workforceService.workforce;

  readonly stats = computed<HrDashboardStats>(() => {
    const state = this.workforce();
    const active = state.directory.filter((row) => row.status !== 'Resigned');
    const today = new Date().toISOString().slice(0, 10);
    const todayRows = state.attendance.filter((row) => row.date === today);
    const present = todayRows.filter(
      (row) => row.status === 'Present' || row.status === 'Late' || row.status === 'In Progress',
    ).length;
    const attendanceRateToday =
      todayRows.length === 0 ? 92 : Math.round((present / Math.max(active.length, 1)) * 100);

    return {
      totalEmployees: active.length,
      localCount: active.filter((row) => row.employmentType === 'Local').length,
      prCount: active.filter((row) => row.employmentType === 'PR').length,
      foreignCount: active.filter((row) =>
        ['WP', 'S Pass', 'EP'].includes(row.employmentType),
      ).length,
      onLeaveToday: active.filter((row) => row.status === 'On Leave').length,
      passesExpiring90: state.compliance.filter(
        (row) =>
          row.category === 'Work Pass' &&
          row.daysRemaining !== null &&
          row.daysRemaining <= 90,
      ).length,
      attendanceRateToday,
      pendingLeaves: state.leaveRequests.filter((row) => row.status === 'Pending').length,
      pendingClaims: state.claims.filter((row) => row.status === 'Pending').length,
      pendingDocuments: state.documents.filter((row) => row.status === 'Pending').length,
      pendingBankRequests: state.bankRequests.filter((row) => row.status === 'Pending HR').length,
      payrollStatus: (() => {
        const active =
          state.payrollRuns.find((run) =>
            ['Draft', 'Under Review', 'Approved'].includes(run.status),
          ) ?? state.payrollRuns[0];
        return active ? `${active.period} · ${active.status}` : '—';
      })(),
    };
  });

  pendingProfileRequests(): number {
    return (this.workforce().profileRequests ?? []).filter((row) => row.status === 'Pending HR')
      .length;
  }

  getMasterSnapshot(): Observable<{ stats: HrDashboardStats; directory: StaffDirectoryRow[] }> {
    return of({
      stats: this.stats(),
      directory: this.workforce().directory,
    }).pipe(delay(280));
  }

  employeeName(employeeId: string): string {
    return (
      this.workforce().directory.find((row) => row.employeeId === employeeId)?.fullName ??
      employeeId
    );
  }
}
