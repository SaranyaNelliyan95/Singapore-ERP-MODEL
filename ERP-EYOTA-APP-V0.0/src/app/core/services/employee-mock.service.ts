import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import {
  AttendanceRecord,
  BankUpdateRequest,
  ClaimRecord,
  ClockState,
  ContactPatch,
  EmployeeAsset,
  EmployeeDocument,
  EmployeeNotification,
  EmployeeProfile,
  EmployeeWorkspace,
  LeaveBalance,
  LeaveRequest,
  PassAlert,
  PayslipRecord,
  ProfileUpdateRequest,
  TrainingRecord,
} from '../models/employee.model';
import {
  ComplianceWatchItem,
  EmployeeManagementStats,
  ManpowerRequest,
  OnboardingCandidate,
  PayrollException,
  PayrollRun,
  ProjectAllocation,
  ProjectRecord,
  StaffDirectoryRow,
  WorkforceState,
} from '../models/hr.model';
import { SystemPolicies } from '../models/admin.model';
import { ClaimType, EmploymentPassType, LeaveType, WorkLocation } from '../models/common.model';
import { AuthService } from './auth.service';
import { createDefaultSystemPolicies } from './system-policies.defaults';
import { daysUntil } from '../utils/singapore.utils';

const DEMO_EMPLOYEE_ID = 'EY-1042';
const WORKFORCE_STORAGE_KEY = 'eyota.demo.workforce.v1';
/** Demo-only persistence — not production data storage */
const DEMO_PERSISTENCE_NOTE = 'localStorage demo snapshot (frontend-only)';

const DEFAULT_BALANCES = (): LeaveBalance[] => [
  { type: 'Annual', entitled: 18, used: 4, balance: 14, simulatedNote: 'Simulated annual sample' },
  { type: 'Sick', entitled: 14, used: 1, balance: 13, simulatedNote: 'Simulated sick sample' },
  {
    type: 'Hospitalisation',
    entitled: 60,
    used: 0,
    balance: 60,
    simulatedNote: 'Simulated hospitalisation sample',
  },
  { type: 'Childcare', entitled: 6, used: 0, balance: 6, simulatedNote: 'Simulated childcare sample' },
  { type: 'Maternity', entitled: 0, used: 0, balance: 0, simulatedNote: 'Simulated placeholder' },
  { type: 'Paternity', entitled: 0, used: 0, balance: 0, simulatedNote: 'Simulated placeholder' },
  { type: 'Unpaid', entitled: 0, used: 0, balance: 0, simulatedNote: 'No balance limit in demo' },
  {
    type: 'Compassionate',
    entitled: 3,
    used: 0,
    balance: 3,
    simulatedNote: 'Simulated company policy sample',
  },
];

@Injectable({ providedIn: 'root' })
export class EmployeeMockService {
  private readonly auth = inject(AuthService);
  private seq = 200;
  private readonly store = signal<WorkforceState>(this.loadOrSeedWorkforce());

  /** Full company store — HR + cross-role sync */
  readonly workforce = this.store.asReadonly();

  /** Personal ESS view for the logged-in employee */
  readonly workspace = computed(() => this.toPersonalWorkspace(this.requireEmployeeId()));

  readonly scopedEmployeeId = computed(
    () => this.auth.currentUser()?.employeeId ?? DEMO_EMPLOYEE_ID,
  );

  /** Safe demo reset — clears localStorage snapshot and re-seeds packaged data */
  resetAllDemoData(): void {
    localStorage.removeItem(WORKFORCE_STORAGE_KEY);
    this.seq = 200;
    this.store.set(this.seedWorkforce());
    this.persist();
  }

  getWorkspace(): Observable<EmployeeWorkspace> {
    return of(this.workspace()).pipe(delay(320));
  }

  getDashboard(): Observable<EmployeeWorkspace> {
    return this.getWorkspace();
  }

  /** Submit contact changes for HR approval (does not mutate profile until approved). */
  submitProfileUpdate(patch: ContactPatch, note: string): ProfileUpdateRequest {
    const id = this.requireEmployeeId();
    const request: ProfileUpdateRequest = {
      id: `PR-${++this.seq}`,
      employeeId: id,
      submittedOn: new Date().toISOString(),
      status: 'Pending HR',
      patch,
      note,
      hrComments: '',
    };
    this.mutate((state) => ({
      ...state,
      profileRequests: [request, ...(state.profileRequests ?? [])],
    }));
    this.pushNotification(
      id,
      'System',
      `${request.id} contact update submitted — awaiting HR verification.`,
    );
    return request;
  }

  submitBankUpdate(bankName: string, bankAccountNumber: string, note: string): BankUpdateRequest {
    const id = this.requireEmployeeId();
    const request: BankUpdateRequest = {
      id: `BR-${++this.seq}`,
      employeeId: id,
      bankName,
      bankAccountNumber,
      status: 'Pending HR',
      submittedOn: new Date().toISOString(),
      note,
    };
    this.mutate((state) => ({
      ...state,
      bankRequests: [request, ...state.bankRequests],
    }));
    this.pushNotification(
      id,
      'System',
      `${request.id} bank update queued for HR authorization.`,
    );
    return request;
  }

  toggleGps(): boolean {
    const id = this.requireEmployeeId();
    let enabled = false;
    this.mutate((state) => {
      const clock = state.clocks[id] ?? this.defaultClock();
      enabled = !clock.gpsEnabled;
      return {
        ...state,
        clocks: { ...state.clocks, [id]: { ...clock, gpsEnabled: enabled } },
      };
    });
    return enabled;
  }

  clockIn(location: WorkLocation): ClockState {
    const id = this.requireEmployeeId();
    const now = this.timeNow();
    const today = this.todayIso();
    let clock: ClockState = this.defaultClock();

    this.mutate((state) => {
      const current = state.clocks[id] ?? this.defaultClock();
      const existing = state.attendance.find((row) => row.employeeId === id && row.date === today);
      const row: AttendanceRecord = existing
        ? {
            ...existing,
            checkIn: now,
            checkOut: null,
            location,
            status: 'In Progress',
            gpsTracked: current.gpsEnabled,
          }
        : {
            id: `AT-${++this.seq}`,
            employeeId: id,
            date: today,
            checkIn: now,
            checkOut: null,
            location,
            otHours: 0,
            gpsTracked: current.gpsEnabled,
            lateMinutes: now > '09:00' ? 12 : 0,
            status: 'In Progress',
          };

      clock = {
        status: 'Checked in',
        checkIn: now,
        checkOut: null,
        location,
        gpsEnabled: current.gpsEnabled,
      };

      return {
        ...state,
        attendance: existing
          ? state.attendance.map((item) =>
              item.employeeId === id && item.date === today ? row : item,
            )
          : [row, ...state.attendance],
        clocks: { ...state.clocks, [id]: clock },
      };
    });

    return clock;
  }

  clockOut(): ClockState {
    const id = this.requireEmployeeId();
    const now = this.timeNow();
    const today = this.todayIso();
    let clock = this.store().clocks[id] ?? this.defaultClock();

    this.mutate((state) => {
      const attendance = state.attendance.map((row) => {
        if (row.employeeId !== id || row.date !== today) {
          return row;
        }
        return {
          ...row,
          checkOut: now,
          otHours: now > '18:00' ? 1 : row.otHours,
          status: (row.lateMinutes > 0 ? 'Late' : 'Present') as AttendanceRecord['status'],
        };
      });

      clock = {
        ...(state.clocks[id] ?? this.defaultClock()),
        status: 'Checked out',
        checkOut: now,
      };

      return {
        ...state,
        attendance,
        clocks: { ...state.clocks, [id]: clock },
      };
    });

    return clock;
  }

  applyLeave(input: {
    type: LeaveType;
    fromDate: string;
    toDate: string;
    days: number;
    reason: string;
  }): LeaveRequest | { error: string } {
    const id = this.requireEmployeeId();
    const holidays = new Set(this.store().policies.holidays.map((h) => h.date));
    if (holidays.has(input.fromDate) || holidays.has(input.toDate)) {
      return {
        error:
          'Selected dates include a Singapore public holiday from Admin Master Data. Choose another range (demo).',
      };
    }

    const profile = this.store().profiles[id];
    const request: LeaveRequest = {
      id: `LV-${++this.seq}`,
      employeeId: id,
      type: input.type,
      fromDate: input.fromDate,
      toDate: input.toDate,
      days: input.days,
      reason: input.reason,
      status: 'Pending',
      approver: profile?.reportingManager ?? 'HR Manager',
    };

    // Balance is reserved only on HR approval (Workflow B)
    this.mutate((state) => ({
      ...state,
      leaveRequests: [request, ...state.leaveRequests],
    }));

    this.pushNotification(id, 'Leave', `${request.id} submitted and pending HR approval.`);
    return request;
  }

  cancelLeave(requestId: string): boolean {
    const id = this.requireEmployeeId();
    const target = this.store().leaveRequests.find(
      (row) => row.id === requestId && row.status === 'Pending' && row.employeeId === id,
    );
    if (!target) {
      return false;
    }

    this.mutate((state) => ({
      ...state,
      leaveRequests: state.leaveRequests.map((row) =>
        row.id === requestId ? { ...row, status: 'Cancelled' } : row,
      ),
    }));
    this.pushNotification(id, 'Leave', `${requestId} cancelled by employee.`);
    return true;
  }

  submitClaim(input: {
    type: ClaimType;
    date: string;
    amountSgd: number;
    costCentre: string;
    remarks: string;
    hasReceipt: boolean;
  }): ClaimRecord | { error: string } {
    const policy = this.store().policies.claimLimits.find((row) => row.type === input.type);
    if (policy?.requireReceipt && !input.hasReceipt) {
      return {
        error: `${input.type} claims require a receipt attachment (Admin Master Data · demo).`,
      };
    }

    const id = this.requireEmployeeId();
    const claim: ClaimRecord = {
      id: `CL-${++this.seq}`,
      employeeId: id,
      type: input.type,
      date: input.date,
      amountSgd: input.amountSgd,
      costCentre: input.costCentre,
      remarks: input.remarks,
      status: 'Pending',
      approverComments: '',
      hasReceipt: input.hasReceipt,
    };
    this.mutate((state) => ({ ...state, claims: [claim, ...state.claims] }));
    this.pushNotification(id, 'Claim', `${claim.id} submitted — pending HR settlement.`);
    return claim;
  }

  uploadDocument(meta: {
    name: string;
    category: EmployeeDocument['category'];
    fileName: string;
    sizeLabel: string;
  }): EmployeeDocument {
    const id = this.requireEmployeeId();
    const doc: EmployeeDocument = {
      id: `DOC-${++this.seq}`,
      employeeId: id,
      name: meta.name,
      category: meta.category,
      fileName: meta.fileName,
      uploadedOn: new Date().toISOString().slice(0, 10),
      expiryDate: null,
      status: 'Pending',
      sizeLabel: meta.sizeLabel,
    };
    this.mutate((state) => ({ ...state, documents: [doc, ...state.documents] }));
    this.pushNotification(id, 'Document', `${doc.name} uploaded — awaiting HR verification.`);
    return doc;
  }

  submitFaq(question: string): void {
    this.pushNotification(
      this.requireEmployeeId(),
      'System',
      `FAQ submitted (demo): “${question.slice(0, 80)}” — HR will respond shortly.`,
    );
  }

  markNotificationRead(id: string): void {
    const employeeId = this.requireEmployeeId();
    this.mutate((state) => ({
      ...state,
      notifications: (state.notifications ?? []).map((item) =>
        item.id === id && item.employeeId === employeeId ? { ...item, read: true } : item,
      ),
    }));
  }

  // ——— HR operations (shared store) ———

  approveLeave(requestId: string): boolean {
    return this.setLeaveStatus(requestId, 'Approved');
  }

  rejectLeave(requestId: string, comments: string): boolean {
    const target = this.store().leaveRequests.find((row) => row.id === requestId);
    if (!target || target.status !== 'Pending') {
      return false;
    }
    const decidedOn = new Date().toISOString();
    this.mutate((state) => ({
      ...state,
      leaveRequests: state.leaveRequests.map((row) =>
        row.id === requestId
          ? { ...row, status: 'Rejected', hrComments: comments, decidedOn }
          : row,
      ),
    }));
    this.pushNotification(
      target.employeeId,
      'Leave',
      `${requestId} was rejected by HR. ${comments}`.trim(),
    );
    return true;
  }

  approveClaims(ids: string[]): number {
    const notify: Array<{ employeeId: string; id: string }> = [];
    let count = 0;
    this.mutate((state) => ({
      ...state,
      claims: state.claims.map((claim) => {
        if (ids.includes(claim.id) && claim.status === 'Pending') {
          count += 1;
          notify.push({ employeeId: claim.employeeId, id: claim.id });
          return { ...claim, status: 'Approved', approverComments: 'Approved by HR' };
        }
        return claim;
      }),
    }));
    for (const item of notify) {
      this.pushNotification(item.employeeId, 'Claim', `${item.id} approved by HR.`);
    }
    return count;
  }

  flagClaims(ids: string[], comment: string): number {
    const notify: Array<{ employeeId: string; id: string }> = [];
    let count = 0;
    this.mutate((state) => ({
      ...state,
      claims: state.claims.map((claim) => {
        if (ids.includes(claim.id) && claim.status === 'Pending') {
          count += 1;
          notify.push({ employeeId: claim.employeeId, id: claim.id });
          return { ...claim, status: 'Rejected', approverComments: comment };
        }
        return claim;
      }),
    }));
    for (const item of notify) {
      this.pushNotification(
        item.employeeId,
        'Claim',
        `${item.id} flagged/rejected by HR: ${comment}`,
      );
    }
    return count;
  }

  approveOvertime(attendanceId: string): boolean {
    const row = this.store().attendance.find((item) => item.id === attendanceId);
    if (!row || row.otHours <= 0) {
      return false;
    }
    this.mutate((state) => ({
      ...state,
      otApprovals: { ...state.otApprovals, [attendanceId]: true },
    }));
    this.pushNotification(
      row.employeeId,
      'System',
      `Overtime ${row.otHours}h on ${row.date} approved by HR (simulated).`,
    );
    return true;
  }

  verifyDocument(docId: string, approve: boolean): boolean {
    const doc = this.store().documents.find((item) => item.id === docId);
    if (!doc || doc.status !== 'Pending') {
      return false;
    }
    this.mutate((state) => ({
      ...state,
      documents: state.documents.map((item) =>
        item.id === docId
          ? { ...item, status: approve ? 'Verified' : 'Expired' }
          : item,
      ),
    }));
    this.pushNotification(
      doc.employeeId,
      'Document',
      `${doc.name} was ${approve ? 'verified' : 'rejected'} by HR.`,
    );
    return true;
  }

  decideBankRequest(requestId: string, approve: boolean): boolean {
    const req = this.store().bankRequests.find((item) => item.id === requestId);
    if (!req || req.status !== 'Pending HR') {
      return false;
    }

    this.mutate((state) => {
      const bankRequests = state.bankRequests.map((item) =>
        item.id === requestId
          ? { ...item, status: approve ? ('Approved' as const) : ('Rejected' as const) }
          : item,
      );

      if (!approve) {
        return { ...state, bankRequests };
      }

      const profile = state.profiles[req.employeeId];
      if (!profile) {
        return { ...state, bankRequests };
      }

      return {
        ...state,
        bankRequests,
        profiles: {
          ...state.profiles,
          [req.employeeId]: {
            ...profile,
            bankName: req.bankName,
            bankAccountNumber: req.bankAccountNumber,
          },
        },
      };
    });

    this.pushNotification(
      req.employeeId,
      'System',
      `Bank update ${requestId} was ${approve ? 'approved — profile updated' : 'rejected'} by HR.`,
    );
    return true;
  }

  sendRenewalReminder(complianceId: string): boolean {
    const item = this.store().compliance.find((row) => row.id === complianceId);
    if (!item) {
      return false;
    }
    this.pushNotification(
      item.employeeId,
      'Document',
      `Renewal reminder: ${item.category} (${item.reference}) — please action soon.`,
    );
    return true;
  }

  /** @deprecated Prefer advancePayroll — kept for older callers */
  authorizePayroll(runId: string): boolean {
    return this.advancePayroll(runId, 'finalize');
  }

  /**
   * Payroll lifecycle: Draft → Under Review → Approved → Finalized.
   * Finalized generates simulated payslips for active employees and notifies them.
   */
  advancePayroll(
    runId: string,
    action: 'submitReview' | 'approve' | 'finalize',
  ): boolean {
    const run = this.store().payrollRuns.find((item) => item.id === runId);
    if (!run) {
      return false;
    }
    if (!this.store().policies.statutory.payrollPeriodOpen && action !== 'submitReview') {
      return false;
    }

    const now = new Date().toISOString();
    if (action === 'submitReview' && run.status === 'Draft') {
      this.mutate((state) => ({
        ...state,
        payrollRuns: state.payrollRuns.map((item) =>
          item.id === runId ? { ...item, status: 'Under Review', reviewedOn: now } : item,
        ),
      }));
      return true;
    }

    if (action === 'approve' && (run.status === 'Under Review' || run.status === 'Draft')) {
      this.mutate((state) => ({
        ...state,
        payrollRuns: state.payrollRuns.map((item) =>
          item.id === runId
            ? { ...item, status: 'Approved', approvedOn: now, reviewedOn: item.reviewedOn ?? now }
            : item,
        ),
      }));
      return true;
    }

    if (
      action === 'finalize' &&
      (run.status === 'Approved' ||
        run.status === 'Under Review' ||
        run.status === 'Draft' ||
        run.status === 'Authorized')
    ) {
      this.finalizePayrollRun(runId, now);
      return true;
    }

    return false;
  }

  private finalizePayrollRun(runId: string, now: string): void {
    const run = this.store().payrollRuns.find((item) => item.id === runId);
    if (!run) {
      return;
    }

    const activeIds = this.store()
      .directory.filter((row) => row.status === 'Active' || row.status === 'On Leave')
      .map((row) => row.employeeId);

    const existingPeriods = new Set(
      this.store()
        .payslips.filter((slip) => slip.payPeriod === run.period)
        .map((slip) => slip.employeeId),
    );

    const generated: PayslipRecord[] = [];
    for (const employeeId of activeIds) {
      if (existingPeriods.has(employeeId)) {
        continue;
      }
      const profile = this.store().profiles[employeeId];
      if (!profile) {
        continue;
      }
      const otHours = this.store().attendance
        .filter((row) => row.employeeId === employeeId && this.store().otApprovals[row.id])
        .reduce((sum, row) => sum + row.otHours, 0);
      const basic = this.estimateBasic(profile);
      const overtime = Math.round(otHours * (basic / 160) * 100) / 100;
      const allowances = Math.round(basic * 0.05);
      const statutory = this.store().policies.statutory;
      const isLocalOrPr =
        profile.employmentType === 'Local' || profile.employmentType === 'PR';
      const cpfEmployee = isLocalOrPr
        ? Math.round(basic * (statutory.cpfEmployeeRatePct / 100) * 100) / 100
        : 0;
      const cpfEmployer = isLocalOrPr
        ? Math.round(basic * (statutory.cpfEmployerRatePct / 100) * 100) / 100
        : 0;
      const sdl = Math.round(basic * (statutory.sdlRatePct / 100) * 100) / 100;
      const deductions = 50;
      const netPay =
        Math.round((basic + allowances + overtime - cpfEmployee - deductions - sdl) * 100) / 100;

      generated.push({
        id: `PS-${run.period.replace(/\s/g, '')}-${employeeId}-${++this.seq}`,
        employeeId,
        payPeriod: run.period,
        basic,
        allowances,
        overtime,
        bonus: 0,
        cpfEmployee,
        cpfEmployer,
        sdl,
        deductions,
        netPay,
        bankCreditedDate: now.slice(0, 10),
        demoDocument: true,
      });
    }

    this.mutate((state) => ({
      ...state,
      payrollRuns: state.payrollRuns.map((item) =>
        item.id === runId
          ? {
              ...item,
              status: 'Finalized',
              authorizedOn: now,
              finalizedOn: now,
              employeeCount: activeIds.length,
              totalNetPay:
                Math.round(
                  (item.totalNetPay + generated.reduce((s, p) => s + p.netPay, 0)) * 100,
                ) / 100,
            }
          : item,
      ),
      payslips: [...generated, ...state.payslips],
    }));

    for (const slip of generated) {
      this.pushNotification(
        slip.employeeId,
        'Payslip',
        `${run.period} itemised payslip is ready (DEMO DOCUMENT — simulated payroll).`,
      );
    }
  }

  private estimateBasic(profile: EmployeeProfile): number {
    const map: Record<string, number> = {
      'Senior Civil Engineer': 6200,
      'Site Supervisor': 3800,
      'Quantity Surveyor': 5200,
      'General Worker': 2200,
      'BIM Coordinator': 7100,
      'HR Manager': 6800,
      'Project Engineer': 4800,
      'Graduate Engineer': 3600,
    };
    return map[profile.designation] ?? 4500;
  }

  /** Admin → ESS/HR policy sync */
  updatePolicies(policies: SystemPolicies): void {
    this.mutate((state) => ({
      ...state,
      policies,
      costCentres: [...policies.costCentres],
    }));
  }

  patchPolicies(partial: Partial<SystemPolicies>): void {
    this.mutate((state) => {
      const policies = { ...state.policies, ...partial };
      return {
        ...state,
        policies,
        costCentres: [...policies.costCentres],
      };
    });
  }

  restoreDemoPolicies(): SystemPolicies {
    const policies = createDefaultSystemPolicies();
    this.updatePolicies(policies);
    return policies;
  }

  getClaimLimit(type: ClaimType): number {
    return (
      this.store().policies.claimLimits.find((row) => row.type === type)?.maxAmountSgd ?? 99999
    );
  }

  enabledLeaveTypes(): LeaveType[] {
    return this.store()
      .policies.leavePolicies.filter((row) => row.enabled)
      .map((row) => row.type);
  }

  addNewHireDraft(input: {
    fullName: string;
    department: string;
    role: string;
    employmentType: StaffDirectoryRow['employmentType'];
    startDate: string;
  }): OnboardingCandidate {
    const candidate: OnboardingCandidate = {
      id: `OB-${++this.seq}`,
      candidateName: input.fullName,
      role: input.role,
      department: input.department,
      startDate: input.startDate,
      stage: 'Offer',
      employmentType: input.employmentType,
      checklistProgress: 10,
    };
    this.mutate((state) => ({
      ...state,
      onboarding: [candidate, ...state.onboarding],
    }));
    return candidate;
  }

  advanceOnboarding(candidateId: string): OnboardingCandidate | null {
    const stages: OnboardingCandidate['stage'][] = [
      'Offer',
      'MOM Forms',
      'Medical',
      'Orientation',
      'Completed',
    ];
    let updated: OnboardingCandidate | null = null;
    this.mutate((state) => ({
      ...state,
      onboarding: state.onboarding.map((row) => {
        if (row.id !== candidateId) {
          return row;
        }
        const idx = stages.indexOf(row.stage);
        const next = stages[Math.min(idx + 1, stages.length - 1)];
        updated = {
          ...row,
          stage: next,
          checklistProgress: Math.min(100, row.checklistProgress + 25),
        };
        return updated;
      }),
    }));
    return updated;
  }

  /**
   * Convert completed onboarding candidate into a directory employee + profile.
   * Optionally provision a demo ESS login via AuthService.
   */
  activateOnboardingAsEmployee(
    candidateId: string,
    opts?: { createLogin?: boolean; email?: string },
  ): { employeeId: string; loginEmail?: string } | null {
    const candidate = this.store().onboarding.find((row) => row.id === candidateId);
    if (!candidate) {
      return null;
    }

    const employeeId = this.nextEmployeeId();
    const profile: EmployeeProfile = {
      employeeId,
      fullName: candidate.candidateName,
      nricOrFin: this.fictionalFin(candidate.employmentType),
      nationality: 'Singapore',
      employmentType: candidate.employmentType,
      department: candidate.department,
      designation: candidate.role,
      reportingManager: 'Wei Ming Lim',
      dateOfJoining: candidate.startDate,
      probationStatus: 'Probation',
      workLocation: 'Office',
      personalEmail: opts?.email ?? `${candidate.candidateName.toLowerCase().replace(/\s+/g, '.')}@email.sg`,
      mobile: '9' + String(1000000 + (this.seq % 8999999)).slice(0, 7),
      residentialAddress: 'Pending address update, Singapore 000000',
      emergencyContactName: 'To be updated',
      emergencyContactPhone: '90000000',
      emergencyContactRelation: 'TBC',
      bankName: 'DBS',
      bankAccountNumber: '0000000000',
    };

    const directoryRow: StaffDirectoryRow = {
      employeeId,
      fullName: profile.fullName,
      department: profile.department,
      designation: profile.designation,
      employmentType: profile.employmentType,
      workLocation: profile.workLocation,
      status: 'Probation',
      passExpiry: candidate.employmentType === 'Local' || candidate.employmentType === 'PR' ? null : '2027-12-31',
      contractExpiry: '2027-12-31',
      nricOrFin: profile.nricOrFin,
      mobile: profile.mobile,
      passportExpiry: '2029-01-01',
      medicalClearance: 'Valid',
      branch: 'HQ — Paya Lebar',
      projectId: null,
      dateOfJoining: candidate.startDate,
      probationEndDate: (() => {
        const d = new Date(candidate.startDate);
        d.setMonth(d.getMonth() + 6);
        return d.toISOString().slice(0, 10);
      })(),
      noticeEndDate: null,
    };

    this.mutate((state) => ({
      ...state,
      directory: [directoryRow, ...state.directory],
      profiles: { ...state.profiles, [employeeId]: profile },
      leaveBalances: { ...state.leaveBalances, [employeeId]: DEFAULT_BALANCES() },
      clocks: { ...state.clocks, [employeeId]: this.defaultClock() },
      passAlerts: { ...state.passAlerts, [employeeId]: [] },
      onboarding: state.onboarding.map((row) =>
        row.id === candidateId
          ? { ...row, stage: 'Completed', checklistProgress: 100 }
          : row,
      ),
    }));

    let loginEmail: string | undefined;
    if (opts?.createLogin) {
      loginEmail = opts.email ?? `newhire.${employeeId.toLowerCase()}@eyota.sg`;
      this.auth.registerDemoEmployee({
        email: loginEmail,
        password: 'Employee@123',
        displayName: profile.fullName,
        employeeId,
      });
    }

    this.pushNotification(
      employeeId,
      'System',
      `Welcome to Eyota — employee record ${employeeId} activated (demo).`,
    );

    return { employeeId, loginEmail };
  }

  createEmployee(input: {
    fullName: string;
    department: string;
    designation: string;
    employmentType: EmploymentPassType;
    workLocation: WorkLocation;
    dateOfJoining: string;
    mobile: string;
    nricOrFin: string;
    reportingManager?: string;
  }): StaffDirectoryRow {
    const employeeId = this.nextEmployeeId();
    const profile: EmployeeProfile = {
      employeeId,
      fullName: input.fullName,
      nricOrFin: input.nricOrFin,
      nationality: 'Singapore',
      employmentType: input.employmentType,
      department: input.department,
      designation: input.designation,
      reportingManager: input.reportingManager ?? 'Wei Ming Lim',
      dateOfJoining: input.dateOfJoining,
      probationStatus: 'Probation',
      workLocation: input.workLocation,
      personalEmail: `${input.fullName.toLowerCase().replace(/\s+/g, '.')}@email.sg`,
      mobile: input.mobile,
      residentialAddress: 'To be confirmed, Singapore',
      emergencyContactName: 'To be updated',
      emergencyContactPhone: '90000000',
      emergencyContactRelation: 'TBC',
      bankName: 'DBS',
      bankAccountNumber: '0000000000',
    };

    const probationEnd = (() => {
      const d = new Date(input.dateOfJoining);
      d.setMonth(d.getMonth() + 6);
      return d.toISOString().slice(0, 10);
    })();
    const row: StaffDirectoryRow = {
      employeeId,
      fullName: input.fullName,
      department: input.department,
      designation: input.designation,
      employmentType: input.employmentType,
      workLocation: input.workLocation,
      status: 'Probation',
      passExpiry:
        input.employmentType === 'Local' || input.employmentType === 'PR' ? null : '2027-12-31',
      contractExpiry: '2027-12-31',
      nricOrFin: input.nricOrFin,
      mobile: input.mobile,
      passportExpiry: '2029-01-01',
      medicalClearance: 'Valid',
      branch: 'HQ — Paya Lebar',
      projectId: null,
      dateOfJoining: input.dateOfJoining,
      probationEndDate: probationEnd,
      noticeEndDate: null,
    };

    this.mutate((state) => ({
      ...state,
      directory: [row, ...state.directory],
      profiles: { ...state.profiles, [employeeId]: profile },
      leaveBalances: { ...state.leaveBalances, [employeeId]: DEFAULT_BALANCES() },
      clocks: { ...state.clocks, [employeeId]: this.defaultClock() },
      passAlerts: { ...state.passAlerts, [employeeId]: [] },
    }));

    return row;
  }

  updateEmployee(
    employeeId: string,
    patch: Partial<
      Pick<
        StaffDirectoryRow,
        | 'department'
        | 'designation'
        | 'employmentType'
        | 'workLocation'
        | 'status'
        | 'passExpiry'
        | 'contractExpiry'
        | 'mobile'
        | 'medicalClearance'
        | 'branch'
        | 'projectId'
        | 'dateOfJoining'
        | 'probationEndDate'
        | 'noticeEndDate'
      >
    >,
  ): boolean {
    if (!this.store().profiles[employeeId]) {
      return false;
    }
    this.mutate((state) => {
      const directory = state.directory.map((row) =>
        row.employeeId === employeeId ? { ...row, ...patch } : row,
      );
      const profile = state.profiles[employeeId];
      const nextProfile: EmployeeProfile = {
        ...profile,
        department: patch.department ?? profile.department,
        designation: patch.designation ?? profile.designation,
        employmentType: patch.employmentType ?? profile.employmentType,
        workLocation: patch.workLocation ?? profile.workLocation,
        mobile: patch.mobile ?? profile.mobile,
        dateOfJoining: patch.dateOfJoining ?? profile.dateOfJoining,
        probationStatus:
          patch.status === 'Probation'
            ? 'Probation'
            : patch.status === 'Active'
              ? 'Confirmed'
              : profile.probationStatus,
      };
      return {
        ...state,
        directory,
        profiles: { ...state.profiles, [employeeId]: nextProfile },
      };
    });
    return true;
  }

  decideProfileRequest(requestId: string, approve: boolean, comments = ''): boolean {
    const req = this.store().profileRequests?.find((item) => item.id === requestId);
    if (!req || req.status !== 'Pending HR') {
      return false;
    }

    this.mutate((state) => {
      const profileRequests = (state.profileRequests ?? []).map((item) =>
        item.id === requestId
          ? {
              ...item,
              status: approve ? ('Approved' as const) : ('Rejected' as const),
              hrComments: comments,
            }
          : item,
      );

      if (!approve) {
        return { ...state, profileRequests };
      }

      const profile = state.profiles[req.employeeId];
      if (!profile) {
        return { ...state, profileRequests };
      }

      const next = { ...profile, ...req.patch };
      return {
        ...state,
        profileRequests,
        profiles: { ...state.profiles, [req.employeeId]: next },
        directory: state.directory.map((row) =>
          row.employeeId === req.employeeId
            ? { ...row, mobile: req.patch.mobile ?? row.mobile }
            : row,
        ),
      };
    });

    this.pushNotification(
      req.employeeId,
      'System',
      `Profile update ${requestId} was ${approve ? 'approved' : 'rejected'} by HR.`,
    );
    return true;
  }

  assignAsset(input: {
    employeeId: string;
    assetId: string;
    type: EmployeeAsset['type'];
    condition: EmployeeAsset['condition'];
  }): EmployeeAsset {
    const asset: EmployeeAsset = {
      id: `AST-${++this.seq}`,
      employeeId: input.employeeId,
      assetId: input.assetId,
      type: input.type,
      assignedDate: new Date().toISOString().slice(0, 10),
      condition: input.condition,
      returnStatus: 'Assigned',
    };
    this.mutate((state) => ({
      ...state,
      assets: [asset, ...(state.assets ?? [])],
    }));
    this.pushNotification(
      input.employeeId,
      'System',
      `Asset ${input.assetId} (${input.type}) assigned to you (demo).`,
    );
    return asset;
  }

  returnAsset(assetRecordId: string): boolean {
    const asset = this.store().assets?.find((row) => row.id === assetRecordId);
    if (!asset || asset.returnStatus === 'Returned') {
      return false;
    }
    this.mutate((state) => ({
      ...state,
      assets: (state.assets ?? []).map((row) =>
        row.id === assetRecordId ? { ...row, returnStatus: 'Returned' } : row,
      ),
    }));
    this.pushNotification(
      asset.employeeId,
      'System',
      `Asset ${asset.assetId} marked returned (demo).`,
    );
    return true;
  }

  assignTraining(input: {
    employeeId: string;
    courseName: string;
    category: TrainingRecord['category'];
  }): TrainingRecord {
    const record: TrainingRecord = {
      id: `TR-${++this.seq}`,
      employeeId: input.employeeId,
      courseName: input.courseName,
      category: input.category,
      completedDate: null,
      expiryDate: null,
      status: 'Required',
    };
    this.mutate((state) => ({
      ...state,
      training: [record, ...(state.training ?? [])],
    }));
    this.pushNotification(
      input.employeeId,
      'Training',
      `Training assigned: ${input.courseName} (demo).`,
    );
    return record;
  }

  /** HR Employee Management dashboard metrics (derived from shared store) */
  getEmployeeManagementStats(): EmployeeManagementStats {
    const state = this.store();
    const directory = state.directory;
    const active = directory.filter((row) => row.status !== 'Resigned');
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const cut = ninetyDaysAgo.toISOString().slice(0, 10);
    const foreignTypes = new Set(['WP', 'S Pass', 'EP']);
    const bcaEmployeeIds = new Set(
      state.documents
        .filter(
          (doc) =>
            doc.category === 'Certification' &&
            /bca|coretrade|csoc|sec\s*\(/i.test(`${doc.name} ${doc.fileName}`),
        )
        .map((doc) => doc.employeeId),
    );
    const bcaTagged = active.filter((row) => bcaEmployeeIds.has(row.employeeId)).length;

    return {
      totalEmployees: active.length,
      activeEmployees: directory.filter((row) => row.status === 'Active' || row.status === 'Probation')
        .length,
      localCount: active.filter((row) => row.employmentType === 'Local' || row.employmentType === 'PR')
        .length,
      foreignCount: active.filter((row) => foreignTypes.has(row.employmentType)).length,
      onLeave: directory.filter((row) => row.status === 'On Leave').length,
      newJoiners: directory.filter((row) => (row.dateOfJoining ?? '') >= cut).length,
      onProbation: directory.filter((row) => row.status === 'Probation').length,
      servingNotice: directory.filter((row) => row.status === 'Notice').length,
      missingDocuments: state.documents.filter((doc) => doc.status === 'Pending').length,
      upcomingExpiries: state.compliance.filter(
        (row) =>
          row.daysRemaining !== null &&
          row.daysRemaining <= 90 &&
          (row.status === 'Expiring' || row.status === 'Expired'),
      ).length,
      passRenewalsUrgent: state.compliance.filter(
        (row) =>
          row.category === 'Work Pass' &&
          row.daysRemaining !== null &&
          row.daysRemaining <= 30,
      ).length,
      bcaCoreTradePct:
        active.length === 0 ? null : Math.round((bcaTagged / active.length) * 1000) / 10,
      overtimeRiskCount: state.attendance.filter(
        (row) => (row.otHours ?? 0) > 0 && row.status !== 'Absent',
      ).length,
    };
  }

  setEmployeeLifecycleStatus(
    employeeId: string,
    status: StaffDirectoryRow['status'],
  ): boolean {
    if (!this.store().profiles[employeeId]) {
      return false;
    }
    this.mutate((state) => ({
      ...state,
      directory: state.directory.map((row) =>
        row.employeeId === employeeId ? { ...row, status } : row,
      ),
      profiles: {
        ...state.profiles,
        [employeeId]: {
          ...state.profiles[employeeId],
          probationStatus:
            status === 'Probation'
              ? 'Probation'
              : status === 'Active'
                ? 'Confirmed'
                : state.profiles[employeeId].probationStatus,
        },
      },
    }));
    return true;
  }

  resolvePayrollException(exceptionId: string): boolean {
    const target = this.store().payrollExceptions?.find((row) => row.id === exceptionId);
    if (!target || target.resolved) {
      return false;
    }
    this.mutate((state) => ({
      ...state,
      payrollExceptions: (state.payrollExceptions ?? []).map((row) =>
        row.id === exceptionId ? { ...row, resolved: true } : row,
      ),
    }));
    return true;
  }

  refreshPayrollExceptions(runId: string): PayrollException[] {
    const state = this.store();
    const run = state.payrollRuns.find((row) => row.id === runId);
    if (!run) {
      return [];
    }
    const generated: PayrollException[] = [];
    for (const row of state.directory.filter((d) => d.status !== 'Resigned')) {
      const profile = state.profiles[row.employeeId];
      if (profile && (profile.bankAccountNumber === '0000000000' || !profile.bankName)) {
        generated.push({
          id: `PX-BANK-${row.employeeId}-${runId}`,
          runId,
          employeeId: row.employeeId,
          type: 'Missing bank',
          severity: 'Blocker',
          message: 'Bank details incomplete — payslip publish blocked until bank update approved.',
          resolved: false,
        });
      }
      const pendingClaims = state.claims.filter(
        (c) => c.employeeId === row.employeeId && c.status === 'Pending',
      );
      if (pendingClaims.length) {
        generated.push({
          id: `PX-CL-${row.employeeId}-${runId}`,
          runId,
          employeeId: row.employeeId,
          type: 'Claim pending',
          severity: 'Warning',
          message: `${pendingClaims.length} pending claim(s) may affect settlement.`,
          resolved: false,
        });
      }
    }
    const otPending = state.attendance.filter(
      (a) => a.otHours > 0 && !state.otApprovals[a.id],
    );
    for (const a of otPending.slice(0, 5)) {
      generated.push({
        id: `PX-OT-${a.id}-${runId}`,
        runId,
        employeeId: a.employeeId,
        type: 'OT pending',
        severity: 'Warning',
        message: `Overtime ${a.otHours}h on ${a.date} awaiting HR approval.`,
        resolved: false,
      });
    }

    this.mutate((s) => ({
      ...s,
      payrollExceptions: [
        ...generated,
        ...(s.payrollExceptions ?? []).filter((row) => row.runId !== runId || row.resolved),
      ],
    }));
    return generated;
  }

  upsertProject(input: Omit<ProjectRecord, 'id'> & { id?: string }): ProjectRecord {
    const project: ProjectRecord = {
      id: input.id ?? `PRJ-${++this.seq}`,
      name: input.name,
      code: input.code,
      site: input.site,
      status: input.status,
      plannedHeadcount: input.plannedHeadcount,
      startDate: input.startDate,
      endDate: input.endDate,
      requiredCerts: input.requiredCerts,
    };
    this.mutate((state) => {
      const list = state.projects ?? [];
      const exists = list.some((row) => row.id === project.id);
      return {
        ...state,
        projects: exists
          ? list.map((row) => (row.id === project.id ? project : row))
          : [project, ...list],
      };
    });
    return project;
  }

  createManpowerRequest(input: {
    projectId: string;
    role: string;
    skill: string;
    headcount: number;
    notes: string;
  }): ManpowerRequest | { error: string } {
    const project = this.store().projects?.find((row) => row.id === input.projectId);
    if (!project) {
      return { error: 'Project not found in shared store.' };
    }
    if (project.status !== 'Active') {
      return { error: 'Manpower requests are only allowed for Active projects.' };
    }
    const request: ManpowerRequest = {
      id: `MR-${++this.seq}`,
      projectId: input.projectId,
      role: input.role,
      skill: input.skill,
      headcount: input.headcount,
      status: 'Open',
      requestedOn: new Date().toISOString().slice(0, 10),
      notes: input.notes,
    };
    this.mutate((state) => ({
      ...state,
      manpowerRequests: [request, ...(state.manpowerRequests ?? [])],
    }));
    return request;
  }

  decideManpowerRequest(requestId: string, approve: boolean): boolean {
    const req = this.store().manpowerRequests?.find((row) => row.id === requestId);
    if (!req || req.status !== 'Open') {
      return false;
    }
    this.mutate((state) => ({
      ...state,
      manpowerRequests: (state.manpowerRequests ?? []).map((row) =>
        row.id === requestId
          ? { ...row, status: approve ? ('Approved' as const) : ('Rejected' as const) }
          : row,
      ),
    }));
    return true;
  }

  allocateEmployee(input: {
    projectId: string;
    employeeId: string;
    role: string;
    startDate: string;
    endDate: string | null;
    allocationPct: number;
  }): ProjectAllocation | { error: string } {
    const state = this.store();
    const project = state.projects?.find((row) => row.id === input.projectId);
    if (!project) {
      return { error: 'Project not found.' };
    }
    if (!state.profiles[input.employeeId]) {
      return { error: 'Employee not found.' };
    }
    const overlapping = (state.allocations ?? []).filter(
      (row) =>
        row.employeeId === input.employeeId &&
        row.status === 'Active' &&
        row.allocationPct + input.allocationPct > 100,
    );
    if (overlapping.length) {
      return {
        error: `Allocation conflict: employee already at ${overlapping[0].allocationPct}% on another project.`,
      };
    }
    const allocation: ProjectAllocation = {
      id: `AL-${++this.seq}`,
      projectId: input.projectId,
      employeeId: input.employeeId,
      role: input.role,
      startDate: input.startDate,
      endDate: input.endDate,
      allocationPct: input.allocationPct,
      status: 'Active',
    };
    this.mutate((s) => ({
      ...s,
      allocations: [allocation, ...(s.allocations ?? [])],
      directory: s.directory.map((row) =>
        row.employeeId === input.employeeId ? { ...row, projectId: input.projectId } : row,
      ),
    }));
    this.pushNotification(
      input.employeeId,
      'System',
      `Assigned to project ${project.name} as ${input.role} (demo).`,
    );
    return allocation;
  }

  endAllocation(allocationId: string): boolean {
    const allocation = this.store().allocations?.find((row) => row.id === allocationId);
    if (!allocation || allocation.status !== 'Active') {
      return false;
    }
    this.mutate((state) => ({
      ...state,
      allocations: (state.allocations ?? []).map((row) =>
        row.id === allocationId
          ? {
              ...row,
              status: 'Ended',
              endDate: new Date().toISOString().slice(0, 10),
            }
          : row,
      ),
    }));
    return true;
  }

  verifyComplianceItem(itemId: string, approve: boolean, comments = ''): boolean {
    const item = this.store().compliance.find((row) => row.id === itemId);
    if (!item) {
      return false;
    }
    this.mutate((state) => ({
      ...state,
      compliance: state.compliance.map((row) =>
        row.id === itemId
          ? {
              ...row,
              status: approve ? 'Ok' : 'Pending Review',
              comments,
            }
          : row,
      ),
    }));
    this.pushNotification(
      item.employeeId,
      'Document',
      `${item.category} (${item.reference}) marked ${approve ? 'verified' : 'needs review'} by HR.`,
    );
    return true;
  }

  private nextEmployeeId(): string {
    const nums = this.store().directory.map((row) => {
      const n = Number(row.employeeId.replace(/\D/g, ''));
      return Number.isFinite(n) ? n : 0;
    });
    const next = Math.max(1300, ...nums) + 1;
    return `EY-${next}`;
  }

  private fictionalFin(type: EmploymentPassType): string {
    const prefix = type === 'Local' || type === 'PR' ? 'S' : type === 'EP' ? 'F' : 'G';
    return `${prefix}${8000000 + (this.seq % 999999)}X`;
  }

  private setLeaveStatus(requestId: string, status: 'Approved'): boolean {
    const target = this.store().leaveRequests.find((row) => row.id === requestId);
    if (!target || target.status !== 'Pending') {
      return false;
    }
    const decidedOn = new Date().toISOString();
    this.mutate((state) => ({
      ...state,
      leaveRequests: state.leaveRequests.map((row) =>
        row.id === requestId ? { ...row, status, decidedOn, hrComments: 'Approved by HR' } : row,
      ),
      leaveBalances: {
        ...state.leaveBalances,
        [target.employeeId]: this.adjustBalance(
          state.leaveBalances[target.employeeId] ?? DEFAULT_BALANCES(),
          target.type,
          target.days,
          'use',
        ),
      },
      directory: state.directory.map((row) => {
        if (row.employeeId !== target.employeeId) {
          return row;
        }
        const today = this.todayIso();
        if (target.fromDate <= today && target.toDate >= today) {
          return { ...row, status: 'On Leave' };
        }
        return row;
      }),
    }));
    this.pushNotification(target.employeeId, 'Leave', `${requestId} was approved by HR.`);
    return true;
  }

  private adjustBalance(
    balances: LeaveBalance[],
    type: LeaveType,
    days: number,
    mode: 'use' | 'restore',
  ): LeaveBalance[] {
    if (type === 'Unpaid') {
      return balances;
    }
    return balances.map((balance) => {
      if (balance.type !== type) {
        return balance;
      }
      if (mode === 'use') {
        return {
          ...balance,
          used: balance.used + days,
          balance: Math.max(0, balance.balance - days),
        };
      }
      return {
        ...balance,
        used: Math.max(0, balance.used - days),
        balance: balance.balance + days,
      };
    });
  }

  private pushNotification(
    employeeId: string,
    type: EmployeeNotification['type'],
    message: string,
  ): void {
    const note: EmployeeNotification = {
      id: `NT-${++this.seq}`,
      employeeId,
      type,
      message,
      date: new Date().toISOString().slice(0, 10),
      read: false,
    };
    this.mutate((state) => ({
      ...state,
      notifications: [note, ...(state.notifications ?? [])],
    }));
  }

  private mutate(updater: (state: WorkforceState) => WorkforceState): void {
    this.store.set(updater(this.store()));
    this.persist();
  }

  private persist(): void {
    try {
      localStorage.setItem(
        WORKFORCE_STORAGE_KEY,
        JSON.stringify({ note: DEMO_PERSISTENCE_NOTE, seq: this.seq, state: this.store() }),
      );
    } catch {
      /* ignore quota / private mode */
    }
  }

  private loadOrSeedWorkforce(): WorkforceState {
    try {
      const raw = localStorage.getItem(WORKFORCE_STORAGE_KEY);
      if (!raw) {
        return this.seedWorkforce();
      }
      const parsed = JSON.parse(raw) as { seq?: number; state?: WorkforceState };
      if (!parsed.state?.directory?.length) {
        return this.seedWorkforce();
      }
      if (typeof parsed.seq === 'number') {
        this.seq = parsed.seq;
      }
      return this.normalizeWorkforce(parsed.state);
    } catch {
      return this.seedWorkforce();
    }
  }

  private normalizeWorkforce(state: WorkforceState): WorkforceState {
    const extras = this.seedPersonalExtras();
    const seededExtras = this.seedProjectsAndPayrollExtras();
    return {
      ...state,
      profileRequests: state.profileRequests ?? [],
      assets: state.assets ?? extras.assets,
      training: state.training ?? extras.training,
      notifications: state.notifications ?? extras.notifications,
      policies: (() => {
        const defaults = createDefaultSystemPolicies();
        const policies = state.policies ?? defaults;
        return {
          ...defaults,
          ...policies,
          catalogs: { ...defaults.catalogs!, ...(policies.catalogs ?? {}) },
          hrModules: policies.hrModules?.length ? policies.hrModules : defaults.hrModules,
        };
      })(),
      costCentres: state.costCentres?.length
        ? state.costCentres
        : [...(state.policies?.costCentres ?? createDefaultSystemPolicies().costCentres)],
      claims: (state.claims ?? []).map((claim) => ({
        ...claim,
        hasReceipt: claim.hasReceipt ?? true,
      })),
      payrollRuns: (state.payrollRuns ?? []).map((run) => ({
        ...run,
        status:
          run.status === 'Authorized' || run.status === 'Paid'
            ? ('Finalized' as const)
            : run.status,
      })),
      payrollExceptions: state.payrollExceptions ?? seededExtras.payrollExceptions,
      projects: state.projects?.length ? state.projects : seededExtras.projects,
      manpowerRequests: state.manpowerRequests ?? seededExtras.manpowerRequests,
      allocations: state.allocations ?? seededExtras.allocations,
      compliance: (state.compliance ?? []).map((row) => ({
        ...row,
        agency:
          row.agency ??
          (row.category === 'ICA Record' || row.category === 'Passport' ? 'ICA' : 'MOM'),
      })),
      directory: (state.directory ?? []).map((row) => {
        const profile = state.profiles?.[row.employeeId];
        return {
          ...row,
          branch: row.branch ?? 'HQ — Paya Lebar',
          projectId: row.projectId ?? null,
          dateOfJoining: row.dateOfJoining ?? profile?.dateOfJoining ?? '',
          probationEndDate: row.probationEndDate ?? null,
          noticeEndDate: row.noticeEndDate ?? null,
        };
      }),
    };
  }

  private seedProjectsAndPayrollExtras(): {
    projects: ProjectRecord[];
    manpowerRequests: ManpowerRequest[];
    allocations: ProjectAllocation[];
    payrollExceptions: PayrollException[];
  } {
    const projects: ProjectRecord[] = [
      {
        id: 'PRJ-1',
        name: 'Marina Coastal Expansion',
        code: 'PRJ-Marina',
        site: 'Marina Bay',
        status: 'Active',
        plannedHeadcount: 24,
        startDate: '2025-06-01',
        endDate: '2027-12-31',
        requiredCerts: ['Work-at-Height', 'CSCP'],
      },
      {
        id: 'PRJ-2',
        name: 'Jurong Site Ops',
        code: 'PRJ-Jurong',
        site: 'Jurong Island',
        status: 'Active',
        plannedHeadcount: 40,
        startDate: '2024-01-15',
        endDate: null,
        requiredCerts: ['Safety Supervisor', 'Medical Clearance'],
      },
      {
        id: 'PRJ-3',
        name: 'Changi Staging Yard',
        code: 'PRJ-Changi',
        site: 'Changi East',
        status: 'On Hold',
        plannedHeadcount: 12,
        startDate: '2026-02-01',
        endDate: '2026-12-31',
        requiredCerts: ['Site Induction'],
      },
    ];
    return {
      projects,
      manpowerRequests: [
        {
          id: 'MR-1',
          projectId: 'PRJ-1',
          role: 'Site Supervisor',
          skill: 'Civil supervision',
          headcount: 2,
          status: 'Open',
          requestedOn: '2026-03-10',
          notes: 'Peak pour schedule — demo request',
        },
        {
          id: 'MR-2',
          projectId: 'PRJ-2',
          role: 'General Worker',
          skill: 'Formwork',
          headcount: 6,
          status: 'Approved',
          requestedOn: '2026-03-01',
          notes: 'Approved pending allocation',
        },
      ],
      allocations: [
        {
          id: 'AL-1',
          projectId: 'PRJ-1',
          employeeId: 'EY-1042',
          role: 'Senior Civil Engineer',
          startDate: '2025-06-01',
          endDate: null,
          allocationPct: 80,
          status: 'Active',
        },
        {
          id: 'AL-2',
          projectId: 'PRJ-2',
          employeeId: 'EY-1108',
          role: 'Site Supervisor',
          startDate: '2024-08-01',
          endDate: null,
          allocationPct: 100,
          status: 'Active',
        },
      ],
      payrollExceptions: [],
    };
  }

  private toPersonalWorkspace(employeeId: string): EmployeeWorkspace {
    const state = this.store();
    const profile = state.profiles[employeeId] ?? state.profiles[DEMO_EMPLOYEE_ID];
    return {
      profile,
      leaveBalances: state.leaveBalances[employeeId] ?? DEFAULT_BALANCES(),
      leaveRequests: state.leaveRequests.filter((row) => row.employeeId === employeeId),
      claims: state.claims.filter((row) => row.employeeId === employeeId),
      payslips: state.payslips.filter((row) => row.employeeId === employeeId),
      passAlerts: state.passAlerts[employeeId] ?? [],
      attendance: state.attendance.filter((row) => row.employeeId === employeeId),
      documents: state.documents.filter((row) => row.employeeId === employeeId),
      assets: (state.assets ?? []).filter((row) => row.employeeId === employeeId),
      training: (state.training ?? []).filter((row) => row.employeeId === employeeId),
      notifications: (state.notifications ?? []).filter((row) => row.employeeId === employeeId),
      bankRequests: state.bankRequests.filter((row) => row.employeeId === employeeId),
      profileRequests: (state.profileRequests ?? []).filter((row) => row.employeeId === employeeId),
      clock: state.clocks[employeeId] ?? this.defaultClock(),
      costCentres: state.costCentres,
    };
  }

  private requireEmployeeId(): string {
    return this.auth.currentUser()?.employeeId ?? DEMO_EMPLOYEE_ID;
  }

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private timeNow(): string {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  private defaultClock(): ClockState {
    return {
      status: 'Checked out',
      checkIn: null,
      checkOut: null,
      location: 'Office',
      gpsEnabled: false,
    };
  }

  private seedPersonalExtras(): {
    assets: EmployeeWorkspace['assets'];
    training: EmployeeWorkspace['training'];
    notifications: EmployeeNotification[];
  } {
    const employeeId = DEMO_EMPLOYEE_ID;
    return {
      assets: [
        {
          id: 'AST-1',
          employeeId,
          assetId: 'LT-SG-2044',
          type: 'Laptop',
          assignedDate: '2023-01-10',
          condition: 'Good',
          returnStatus: 'Assigned',
        },
        {
          id: 'AST-2',
          employeeId,
          assetId: 'AC-8891',
          type: 'Access Card',
          assignedDate: '2021-03-15',
          condition: 'Good',
          returnStatus: 'Assigned',
        },
        {
          id: 'AST-3',
          employeeId,
          assetId: 'PPE-HEL-331',
          type: 'Helmet',
          assignedDate: '2024-06-01',
          condition: 'Fair',
          returnStatus: 'Assigned',
        },
      ],
      training: [
        {
          id: 'TR-1',
          employeeId,
          courseName: 'Work-at-Height Supervisor',
          category: 'Safety',
          completedDate: '2024-05-20',
          expiryDate: '2026-05-20',
          status: 'Expiring',
        },
        {
          id: 'TR-2',
          employeeId,
          courseName: 'PDPA Essentials',
          category: 'Compliance',
          completedDate: '2025-09-01',
          expiryDate: '2027-09-01',
          status: 'Current',
        },
        {
          id: 'TR-3',
          employeeId,
          courseName: 'Site Induction Refresh',
          category: 'BCA',
          completedDate: null,
          expiryDate: null,
          status: 'Required',
        },
      ],
      notifications: [
        {
          id: 'NT-1',
          employeeId,
          type: 'Leave',
          message: 'Annual leave LV-2201 is pending manager approval.',
          date: '2026-03-15',
          read: false,
        },
        {
          id: 'NT-2',
          employeeId,
          type: 'Payslip',
          message: 'March 2026 itemised payslip is ready (DEMO DOCUMENT).',
          date: '2026-03-28',
          read: true,
        },
      ],
    };
  }

  private seedWorkforce(): WorkforceState {
    const priya: EmployeeProfile = {
      employeeId: 'EY-1042',
      fullName: 'Priya Tan',
      nricOrFin: 'S8732145A',
      nationality: 'Singaporean',
      employmentType: 'Local',
      department: 'Structural Engineering',
      designation: 'Senior Civil Engineer',
      reportingManager: 'Wei Ming Lim',
      dateOfJoining: '2021-03-15',
      probationStatus: 'Confirmed',
      workLocation: 'Office',
      personalEmail: 'priya.tan@email.sg',
      mobile: '91234567',
      residentialAddress: '128 Bedok North Ave 3, #08-21, Singapore 460128',
      emergencyContactName: 'Jason Tan',
      emergencyContactPhone: '98765432',
      emergencyContactRelation: 'Spouse',
      bankName: 'DBS',
      bankAccountNumber: '0721234567',
    };

    const ravi: EmployeeProfile = {
      employeeId: 'EY-1108',
      fullName: 'Ravi Kumar',
      nricOrFin: 'F8123456N',
      nationality: 'Indian',
      employmentType: 'S Pass',
      department: 'Site Ops',
      designation: 'Site Supervisor',
      reportingManager: 'Wei Ming Lim',
      dateOfJoining: '2022-08-01',
      probationStatus: 'Confirmed',
      workLocation: 'Site',
      personalEmail: 'ravi.kumar@email.sg',
      mobile: '92345678',
      residentialAddress: 'Worker Dormitory Blk 3, Singapore 629876',
      emergencyContactName: 'Ananya Kumar',
      emergencyContactPhone: '87654321',
      emergencyContactRelation: 'Spouse',
      bankName: 'OCBC',
      bankAccountNumber: '501998877',
    };

    const mei: EmployeeProfile = {
      employeeId: 'EY-1175',
      fullName: 'Mei Ling Ong',
      nricOrFin: 'S9011223D',
      nationality: 'Singapore PR',
      employmentType: 'PR',
      department: 'QS',
      designation: 'Quantity Surveyor',
      reportingManager: 'Wei Ming Lim',
      dateOfJoining: '2020-01-10',
      probationStatus: 'Confirmed',
      workLocation: 'Office',
      personalEmail: 'meiling.ong@email.sg',
      mobile: '93456789',
      residentialAddress: '45 Tampines Ave 8, Singapore 529203',
      emergencyContactName: 'David Ong',
      emergencyContactPhone: '91220011',
      emergencyContactRelation: 'Brother',
      bankName: 'UOB',
      bankAccountNumber: '341122334',
    };

    const duc: EmployeeProfile = {
      employeeId: 'EY-1201',
      fullName: 'Nguyen Van Duc',
      nricOrFin: 'G7654321K',
      nationality: 'Vietnamese',
      employmentType: 'WP',
      department: 'Site Ops',
      designation: 'General Worker',
      reportingManager: 'Ravi Kumar',
      dateOfJoining: '2024-04-28',
      probationStatus: 'Confirmed',
      workLocation: 'Site',
      personalEmail: 'duc.nguyen@email.sg',
      mobile: '84561234',
      residentialAddress: 'Site Quarters A, Singapore 629100',
      emergencyContactName: 'Site Warden',
      emergencyContactPhone: '80001122',
      emergencyContactRelation: 'Employer contact',
      bankName: 'POSB',
      bankAccountNumber: '098765432',
    };

    const daniel: EmployeeProfile = {
      employeeId: 'EY-1022',
      fullName: 'Daniel Koh',
      nricOrFin: 'F7654987P',
      nationality: 'Malaysian',
      employmentType: 'EP',
      department: 'BIM',
      designation: 'BIM Coordinator',
      reportingManager: 'Wei Ming Lim',
      dateOfJoining: '2023-08-19',
      probationStatus: 'Confirmed',
      workLocation: 'WFH',
      personalEmail: 'daniel.koh@email.sg',
      mobile: '95671234',
      residentialAddress: '88 Science Park Dr, Singapore 118243',
      emergencyContactName: 'Sarah Koh',
      emergencyContactPhone: '90110022',
      emergencyContactRelation: 'Spouse',
      bankName: 'DBS',
      bankAccountNumber: '072998877',
    };

    const directory: StaffDirectoryRow[] = [
      {
        employeeId: 'EY-1042',
        fullName: 'Priya Tan',
        department: 'Structural Engineering',
        designation: 'Senior Civil Engineer',
        employmentType: 'Local',
        workLocation: 'Office',
        status: 'Active',
        passExpiry: null,
        contractExpiry: '2027-03-15',
        nricOrFin: 'S8732145A',
        mobile: '91234567',
        passportExpiry: '2028-11-02',
        medicalClearance: 'Valid',
        branch: 'HQ — Paya Lebar',
        projectId: 'PRJ-1',
        dateOfJoining: '2021-03-15',
        probationEndDate: null,
        noticeEndDate: null,
      },
      {
        employeeId: 'EY-1108',
        fullName: 'Ravi Kumar',
        department: 'Site Ops',
        designation: 'Site Supervisor',
        employmentType: 'S Pass',
        workLocation: 'Site',
        status: 'Active',
        passExpiry: '2026-05-12',
        contractExpiry: '2026-12-01',
        nricOrFin: 'F8123456N',
        mobile: '92345678',
        passportExpiry: '2027-01-20',
        medicalClearance: 'Valid',
        branch: 'Jurong Yard',
        projectId: 'PRJ-2',
        dateOfJoining: '2022-08-01',
        probationEndDate: null,
        noticeEndDate: null,
      },
      {
        employeeId: 'EY-1175',
        fullName: 'Mei Ling Ong',
        department: 'QS',
        designation: 'Quantity Surveyor',
        employmentType: 'PR',
        workLocation: 'Office',
        status: 'On Leave',
        passExpiry: null,
        contractExpiry: '2028-01-10',
        nricOrFin: 'S9011223D',
        mobile: '93456789',
        passportExpiry: '2029-04-01',
        medicalClearance: 'Valid',
        branch: 'HQ — Paya Lebar',
        projectId: null,
        dateOfJoining: '2020-01-10',
        probationEndDate: null,
        noticeEndDate: null,
      },
      {
        employeeId: 'EY-1201',
        fullName: 'Nguyen Van Duc',
        department: 'Site Ops',
        designation: 'General Worker',
        employmentType: 'WP',
        workLocation: 'Site',
        status: 'Probation',
        passExpiry: '2026-04-28',
        contractExpiry: '2026-04-28',
        nricOrFin: 'G7654321K',
        mobile: '84561234',
        passportExpiry: '2026-06-30',
        medicalClearance: 'Missing',
        branch: 'Marina Site Office',
        projectId: 'PRJ-1',
        dateOfJoining: '2026-01-15',
        probationEndDate: '2026-07-15',
        noticeEndDate: null,
      },
      {
        employeeId: 'EY-1022',
        fullName: 'Daniel Koh',
        department: 'BIM',
        designation: 'BIM Coordinator',
        employmentType: 'EP',
        workLocation: 'WFH',
        status: 'Notice',
        passExpiry: '2027-08-19',
        contractExpiry: '2027-08-19',
        nricOrFin: 'F7654987P',
        mobile: '95671234',
        passportExpiry: '2026-06-30',
        medicalClearance: 'Valid',
        branch: 'HQ — Paya Lebar',
        projectId: null,
        dateOfJoining: '2023-08-19',
        probationEndDate: null,
        noticeEndDate: '2026-05-31',
      },
      {
        employeeId: 'EY-0088',
        fullName: 'Wei Ming Lim',
        department: 'HR',
        designation: 'HR Manager',
        employmentType: 'Local',
        workLocation: 'Office',
        status: 'Active',
        passExpiry: null,
        contractExpiry: null,
        nricOrFin: 'S7711223C',
        mobile: '90001122',
        passportExpiry: '2030-01-01',
        medicalClearance: 'Valid',
        branch: 'HQ — Paya Lebar',
        projectId: null,
        dateOfJoining: '2018-05-01',
        probationEndDate: null,
        noticeEndDate: null,
      },
    ];

    const hrProfile: EmployeeProfile = {
      employeeId: 'EY-0088',
      fullName: 'Wei Ming Lim',
      nricOrFin: 'S7711223C',
      nationality: 'Singaporean',
      employmentType: 'Local',
      department: 'HR',
      designation: 'HR Manager',
      reportingManager: 'Aisha Rahman',
      dateOfJoining: '2018-05-01',
      probationStatus: 'Confirmed',
      workLocation: 'Office',
      personalEmail: 'weiming.lim@eyota.sg',
      mobile: '90001122',
      residentialAddress: '12 Holland Grove, Singapore 278810',
      emergencyContactName: 'Grace Lim',
      emergencyContactPhone: '91112233',
      emergencyContactRelation: 'Spouse',
      bankName: 'DBS',
      bankAccountNumber: '072556677',
    };

    const compliance: ComplianceWatchItem[] = directory.flatMap((row) => {
      const items: ComplianceWatchItem[] = [];
      const isForeign = ['WP', 'S Pass', 'EP'].includes(row.employmentType);
      if (row.passExpiry) {
        const days = daysUntil(row.passExpiry);
        items.push({
          id: `CMP-PASS-${row.employeeId}`,
          employeeId: row.employeeId,
          employeeName: row.fullName,
          category: 'Work Pass',
          agency: 'MOM',
          reference: `${row.employmentType} · ${row.nricOrFin}`,
          expiryDate: row.passExpiry,
          daysRemaining: days,
          status: days < 0 ? 'Expired' : days <= 90 ? 'Expiring' : 'Ok',
          checklistItem: 'MOM work-pass validity',
          comments: '',
        });
      }
      if (row.passportExpiry && isForeign) {
        const days = daysUntil(row.passportExpiry);
        items.push({
          id: `CMP-PPT-${row.employeeId}`,
          employeeId: row.employeeId,
          employeeName: row.fullName,
          category: 'Passport',
          agency: 'ICA',
          reference: 'Passport validity (ICA travel document)',
          expiryDate: row.passportExpiry,
          daysRemaining: days,
          status: days < 0 ? 'Expired' : days <= 90 ? 'Expiring' : 'Ok',
          checklistItem: 'ICA passport / travel document',
          comments: '',
        });
      }
      if (isForeign) {
        items.push({
          id: `CMP-ICA-${row.employeeId}`,
          employeeId: row.employeeId,
          employeeName: row.fullName,
          category: 'ICA Record',
          agency: 'ICA',
          reference: 'Disembarkation / FIN record check',
          expiryDate: null,
          daysRemaining: null,
          status: row.employeeId === 'EY-1201' ? 'Pending Review' : 'Ok',
          checklistItem: 'ICA employment residency record',
          comments: row.employeeId === 'EY-1201' ? 'Awaiting FIN card scan upload' : '',
        });
      }
      items.push({
        id: `CMP-MED-${row.employeeId}`,
        employeeId: row.employeeId,
        employeeName: row.fullName,
        category: 'Medical',
        agency: isForeign ? 'MOM' : 'Internal',
        reference: 'Medical clearance',
        expiryDate: null,
        daysRemaining: null,
        status:
          row.medicalClearance === 'Valid'
            ? 'Ok'
            : row.medicalClearance === 'Expired'
              ? 'Expired'
              : 'Missing',
        checklistItem: isForeign ? 'MOM medical examination' : 'Company medical',
        comments: '',
      });
      return items;
    });

    const priyaPayslips: PayslipRecord[] = [
      {
        id: 'PS-202603',
        employeeId: 'EY-1042',
        payPeriod: 'Mar 2026',
        basic: 6200,
        allowances: 450,
        overtime: 180,
        bonus: 0,
        cpfEmployee: 1240,
        cpfEmployer: 1054,
        sdl: 12.4,
        deductions: 80,
        netPay: 5497.6,
        bankCreditedDate: '2026-03-28',
        demoDocument: true,
      },
      {
        id: 'PS-202602',
        employeeId: 'EY-1042',
        payPeriod: 'Feb 2026',
        basic: 6200,
        allowances: 420,
        overtime: 0,
        bonus: 0,
        cpfEmployee: 1240,
        cpfEmployer: 1054,
        sdl: 12.4,
        deductions: 80,
        netPay: 5287.6,
        bankCreditedDate: '2026-02-27',
        demoDocument: true,
      },
    ];

    const otherPayslips: PayslipRecord[] = [
      {
        id: 'PS-RK-202603',
        employeeId: 'EY-1108',
        payPeriod: 'Mar 2026',
        basic: 3800,
        allowances: 300,
        overtime: 420,
        bonus: 0,
        cpfEmployee: 0,
        cpfEmployer: 0,
        sdl: 7.6,
        deductions: 50,
        netPay: 4470,
        bankCreditedDate: '2026-03-28',
        demoDocument: true,
      },
      {
        id: 'PS-DK-202603',
        employeeId: 'EY-1022',
        payPeriod: 'Mar 2026',
        basic: 7100,
        allowances: 500,
        overtime: 0,
        bonus: 0,
        cpfEmployee: 0,
        cpfEmployer: 0,
        sdl: 14.2,
        deductions: 100,
        netPay: 7500,
        bankCreditedDate: '2026-03-28',
        demoDocument: true,
      },
    ];

    const payrollRuns: PayrollRun[] = [
      {
        id: 'PR-202603',
        period: 'Mar 2026',
        status: 'Draft',
        employeeCount: 6,
        totalNetPay: 48210.4,
        totalCpfEmployee: 6120,
        totalCpfEmployer: 5400,
        totalSdl: 96.4,
        authorizedOn: null,
        reviewedOn: null,
        approvedOn: null,
        finalizedOn: null,
      },
      {
        id: 'PR-202602',
        period: 'Feb 2026',
        status: 'Finalized',
        employeeCount: 6,
        totalNetPay: 47102.1,
        totalCpfEmployee: 5980,
        totalCpfEmployer: 5280,
        totalSdl: 94.2,
        authorizedOn: '2026-02-26T10:00:00',
        reviewedOn: '2026-02-25T10:00:00',
        approvedOn: '2026-02-26T09:00:00',
        finalizedOn: '2026-02-26T10:00:00',
      },
    ];

    return {
      directory,
      profiles: {
        'EY-1042': priya,
        'EY-1108': ravi,
        'EY-1175': mei,
        'EY-1201': duc,
        'EY-1022': daniel,
        'EY-0088': hrProfile,
      },
      leaveBalances: {
        'EY-1042': [
          {
            type: 'Annual',
            entitled: 18,
            used: 6,
            balance: 12,
            simulatedNote: 'Simulated annual entitlement sample',
          },
          {
            type: 'Sick',
            entitled: 14,
            used: 2,
            balance: 12,
            simulatedNote: 'Simulated outpatient sick leave sample',
          },
          ...DEFAULT_BALANCES().filter((b) => b.type !== 'Annual' && b.type !== 'Sick'),
        ],
        'EY-1108': DEFAULT_BALANCES(),
        'EY-1175': DEFAULT_BALANCES().map((b) =>
          b.type === 'Annual' ? { ...b, used: 3, balance: 15 } : b,
        ),
        'EY-1201': DEFAULT_BALANCES(),
        'EY-1022': DEFAULT_BALANCES(),
        'EY-0088': DEFAULT_BALANCES(),
      },
      leaveRequests: [
        {
          id: 'LV-2201',
          employeeId: 'EY-1042',
          type: 'Annual',
          fromDate: '2026-04-02',
          toDate: '2026-04-04',
          days: 3,
          reason: 'Family trip',
          status: 'Pending',
          approver: 'Wei Ming Lim',
        },
        {
          id: 'LV-2188',
          employeeId: 'EY-1042',
          type: 'Sick',
          fromDate: '2026-02-11',
          toDate: '2026-02-11',
          days: 1,
          reason: 'MC attached',
          status: 'Approved',
          approver: 'Wei Ming Lim',
        },
        {
          id: 'LV-2210',
          employeeId: 'EY-1175',
          type: 'Annual',
          fromDate: '2026-03-17',
          toDate: '2026-03-20',
          days: 4,
          reason: 'Personal matters',
          status: 'Pending',
          approver: 'Wei Ming Lim',
        },
        {
          id: 'LV-2215',
          employeeId: 'EY-1108',
          type: 'Hospitalisation',
          fromDate: '2026-03-25',
          toDate: '2026-03-27',
          days: 3,
          reason: 'Scheduled procedure',
          status: 'Pending',
          approver: 'Wei Ming Lim',
        },
      ],
      claims: [
        {
          id: 'CL-901',
          employeeId: 'EY-1042',
          type: 'Transport',
          date: '2026-03-08',
          amountSgd: 42.5,
          costCentre: 'PRJ-Marina',
          remarks: 'Site visit taxi',
          status: 'Approved',
          approverComments: 'Within policy',
          hasReceipt: true,
        },
        {
          id: 'CL-912',
          employeeId: 'EY-1042',
          type: 'Meals',
          date: '2026-03-12',
          amountSgd: 28.9,
          costCentre: 'PRJ-Jurong',
          remarks: 'Client lunch',
          status: 'Pending',
          approverComments: '',
          hasReceipt: true,
        },
        {
          id: 'CL-920',
          employeeId: 'EY-1108',
          type: 'Transport',
          date: '2026-03-14',
          amountSgd: 65,
          costCentre: 'PRJ-Jurong',
          remarks: 'Site shuttle top-up',
          status: 'Pending',
          approverComments: '',
          hasReceipt: true,
        },
        {
          id: 'CL-925',
          employeeId: 'EY-1022',
          type: 'Medical',
          date: '2026-03-10',
          amountSgd: 120,
          costCentre: 'OH-Admin',
          remarks: 'Clinic visit',
          status: 'Pending',
          approverComments: '',
          hasReceipt: true,
        },
      ],
      payslips: [...priyaPayslips, ...otherPayslips],
      attendance: [
        {
          id: 'AT-1',
          employeeId: 'EY-1042',
          date: '2026-03-17',
          checkIn: '08:52',
          checkOut: '18:05',
          location: 'Office',
          otHours: 0.5,
          gpsTracked: false,
          lateMinutes: 0,
          status: 'Present',
        },
        {
          id: 'AT-2',
          employeeId: 'EY-1108',
          date: '2026-03-17',
          checkIn: '07:40',
          checkOut: '19:10',
          location: 'Site',
          otHours: 2,
          gpsTracked: true,
          lateMinutes: 0,
          status: 'Present',
        },
        {
          id: 'AT-3',
          employeeId: 'EY-1175',
          date: '2026-03-17',
          checkIn: null,
          checkOut: null,
          location: 'Office',
          otHours: 0,
          gpsTracked: false,
          lateMinutes: 0,
          status: 'On Leave',
        },
        {
          id: 'AT-4',
          employeeId: 'EY-1201',
          date: '2026-03-17',
          checkIn: '08:18',
          checkOut: '18:00',
          location: 'Site',
          otHours: 0,
          gpsTracked: true,
          lateMinutes: 18,
          status: 'Late',
        },
        {
          id: 'AT-5',
          employeeId: 'EY-1042',
          date: '2026-03-16',
          checkIn: '09:12',
          checkOut: '18:00',
          location: 'Site',
          otHours: 0,
          gpsTracked: true,
          lateMinutes: 12,
          status: 'Late',
        },
      ],
      documents: [
        {
          id: 'DOC-1',
          employeeId: 'EY-1042',
          name: 'Passport bio page',
          category: 'Passport',
          fileName: 'passport-priya.pdf',
          uploadedOn: '2025-11-02',
          expiryDate: '2028-11-02',
          status: 'Verified',
          sizeLabel: '420 KB',
        },
        {
          id: 'DOC-2',
          employeeId: 'EY-1042',
          name: 'Safety Supervisor Certificate',
          category: 'Certification',
          fileName: 'safety-supervisor.pdf',
          uploadedOn: '2024-05-20',
          expiryDate: '2026-05-20',
          status: 'Verified',
          sizeLabel: '1.1 MB',
        },
        {
          id: 'DOC-4',
          employeeId: 'EY-1201',
          name: 'Medical clearance scan',
          category: 'Medical',
          fileName: 'medical-duc.pdf',
          uploadedOn: '2026-03-15',
          expiryDate: null,
          status: 'Pending',
          sizeLabel: '640 KB',
        },
        {
          id: 'DOC-5',
          employeeId: 'EY-1108',
          name: 'S Pass card copy',
          category: 'Work Pass',
          fileName: 'spass-ravi.pdf',
          uploadedOn: '2026-03-01',
          expiryDate: '2026-05-12',
          status: 'Pending',
          sizeLabel: '310 KB',
        },
      ],
      bankRequests: [],
      profileRequests: [],
      clocks: {
        'EY-1042': this.defaultClock(),
        'EY-1108': this.defaultClock(),
        'EY-1175': this.defaultClock(),
        'EY-1201': this.defaultClock(),
        'EY-1022': this.defaultClock(),
        'EY-0088': this.defaultClock(),
      },
      passAlerts: {
        'EY-1042': [
          {
            label: 'Safety Supervisor Cert',
            expiryDate: '2026-05-20',
            daysRemaining: 35,
            severity: 'warning',
          },
          {
            label: 'Passport',
            expiryDate: '2028-11-02',
            daysRemaining: 960,
            severity: 'info',
          },
        ],
      },
      compliance,
      onboarding: [
        {
          id: 'OB-41',
          candidateName: 'Farhan Aziz',
          role: 'Project Engineer',
          department: 'Projects',
          startDate: '2026-04-01',
          stage: 'MOM Forms',
          employmentType: 'EP',
          checklistProgress: 45,
        },
        {
          id: 'OB-42',
          candidateName: 'Chloe Ng',
          role: 'Graduate Engineer',
          department: 'Structural Engineering',
          startDate: '2026-04-15',
          stage: 'Offer',
          employmentType: 'Local',
          checklistProgress: 20,
        },
      ],
      payrollRuns,
      ...this.seedProjectsAndPayrollExtras(),
      costCentres: ['PRJ-Marina', 'PRJ-Jurong', 'PRJ-Changi', 'OH-Structural', 'OH-Admin'],
      otApprovals: {},
      assets: this.seedPersonalExtras().assets,
      training: this.seedPersonalExtras().training,
      notifications: this.seedPersonalExtras().notifications,
      policies: createDefaultSystemPolicies(),
    };
  }
}
