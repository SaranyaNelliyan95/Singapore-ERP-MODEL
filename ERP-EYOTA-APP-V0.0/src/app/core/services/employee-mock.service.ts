import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import {
  AttendanceRecord,
  BankUpdateRequest,
  ClaimRecord,
  ClockState,
  EmployeeDocument,
  EmployeeNotification,
  EmployeeProfile,
  EmployeeWorkspace,
  LeaveBalance,
  LeaveRequest,
  PassAlert,
  PayslipRecord,
} from '../models/employee.model';
import {
  ComplianceWatchItem,
  OnboardingCandidate,
  PayrollRun,
  StaffDirectoryRow,
  WorkforceState,
} from '../models/hr.model';
import { SystemPolicies } from '../models/admin.model';
import { ClaimType, LeaveType, WorkLocation } from '../models/common.model';
import { AuthService } from './auth.service';
import { createDefaultSystemPolicies } from './system-policies.defaults';
import { daysUntil } from '../utils/singapore.utils';

const DEMO_EMPLOYEE_ID = 'EY-1042';

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
  private readonly store = signal<WorkforceState>(this.seedWorkforce());
  private seq = 200;
  private readonly personalExtras = signal<{
    assets: EmployeeWorkspace['assets'];
    training: EmployeeWorkspace['training'];
    notifications: EmployeeNotification[];
  }>(this.seedPersonalExtras());

  /** Full company store — HR + cross-role sync */
  readonly workforce = this.store.asReadonly();

  /** Personal ESS view for the logged-in employee */
  readonly workspace = computed(() => this.toPersonalWorkspace(this.requireEmployeeId()));

  readonly scopedEmployeeId = computed(
    () => this.auth.currentUser()?.employeeId ?? DEMO_EMPLOYEE_ID,
  );

  getWorkspace(): Observable<EmployeeWorkspace> {
    return of(this.workspace()).pipe(delay(320));
  }

  getDashboard(): Observable<EmployeeWorkspace> {
    return this.getWorkspace();
  }

  updateContact(
    patch: Pick<
      EmployeeProfile,
      | 'personalEmail'
      | 'mobile'
      | 'residentialAddress'
      | 'emergencyContactName'
      | 'emergencyContactPhone'
      | 'emergencyContactRelation'
    >,
  ): void {
    const id = this.requireEmployeeId();
    this.mutate((state) => {
      const profile = { ...state.profiles[id], ...patch };
      return {
        ...state,
        profiles: { ...state.profiles, [id]: profile },
        directory: state.directory.map((row) =>
          row.employeeId === id
            ? { ...row, mobile: patch.mobile ?? row.mobile }
            : row,
        ),
      };
    });
  }

  submitBankUpdate(bankName: string, bankAccountNumber: string, note: string): BankUpdateRequest {
    const request: BankUpdateRequest = {
      id: `BR-${++this.seq}`,
      employeeId: this.requireEmployeeId(),
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
  }): LeaveRequest {
    const id = this.requireEmployeeId();
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

    this.mutate((state) => ({
      ...state,
      leaveRequests: [request, ...state.leaveRequests],
      leaveBalances: {
        ...state.leaveBalances,
        [id]: this.adjustBalance(state.leaveBalances[id] ?? DEFAULT_BALANCES(), input.type, input.days, 'use'),
      },
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
      leaveBalances: {
        ...state.leaveBalances,
        [id]: this.adjustBalance(
          state.leaveBalances[id] ?? DEFAULT_BALANCES(),
          target.type,
          target.days,
          'restore',
        ),
      },
    }));
    return true;
  }

  submitClaim(input: {
    type: ClaimType;
    date: string;
    amountSgd: number;
    costCentre: string;
    remarks: string;
  }): ClaimRecord {
    const claim: ClaimRecord = {
      id: `CL-${++this.seq}`,
      employeeId: this.requireEmployeeId(),
      type: input.type,
      date: input.date,
      amountSgd: input.amountSgd,
      costCentre: input.costCentre,
      remarks: input.remarks,
      status: 'Pending',
      approverComments: '',
    };
    this.mutate((state) => ({ ...state, claims: [claim, ...state.claims] }));
    return claim;
  }

  uploadDocument(meta: {
    name: string;
    category: EmployeeDocument['category'];
    fileName: string;
    sizeLabel: string;
  }): EmployeeDocument {
    const doc: EmployeeDocument = {
      id: `DOC-${++this.seq}`,
      employeeId: this.requireEmployeeId(),
      name: meta.name,
      category: meta.category,
      fileName: meta.fileName,
      uploadedOn: new Date().toISOString().slice(0, 10),
      expiryDate: null,
      status: 'Pending',
      sizeLabel: meta.sizeLabel,
    };
    this.mutate((state) => ({ ...state, documents: [doc, ...state.documents] }));
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
    this.personalExtras.update((extras) => ({
      ...extras,
      notifications: extras.notifications.map((item) =>
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
    this.mutate((state) => ({
      ...state,
      leaveRequests: state.leaveRequests.map((row) =>
        row.id === requestId ? { ...row, status: 'Rejected', reason: `${row.reason} | HR: ${comments}` } : row,
      ),
      leaveBalances: {
        ...state.leaveBalances,
        [target.employeeId]: this.adjustBalance(
          state.leaveBalances[target.employeeId] ?? DEFAULT_BALANCES(),
          target.type,
          target.days,
          'restore',
        ),
      },
    }));
    this.pushNotification(
      target.employeeId,
      'Leave',
      `${requestId} was rejected by HR. ${comments}`.trim(),
    );
    return true;
  }

  approveClaims(ids: string[]): number {
    let count = 0;
    this.mutate((state) => ({
      ...state,
      claims: state.claims.map((claim) => {
        if (ids.includes(claim.id) && claim.status === 'Pending') {
          count += 1;
          this.pushNotification(claim.employeeId, 'Claim', `${claim.id} approved by HR.`);
          return { ...claim, status: 'Approved', approverComments: 'Approved by HR' };
        }
        return claim;
      }),
    }));
    return count;
  }

  flagClaims(ids: string[], comment: string): number {
    let count = 0;
    this.mutate((state) => ({
      ...state,
      claims: state.claims.map((claim) => {
        if (ids.includes(claim.id) && claim.status === 'Pending') {
          count += 1;
          return { ...claim, status: 'Rejected', approverComments: comment };
        }
        return claim;
      }),
    }));
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

  authorizePayroll(runId: string): boolean {
    const run = this.store().payrollRuns.find((item) => item.id === runId);
    if (!run || run.status === 'Authorized' || run.status === 'Paid') {
      return false;
    }
    if (!this.store().policies.statutory.payrollPeriodOpen) {
      return false;
    }
    this.mutate((state) => ({
      ...state,
      payrollRuns: state.payrollRuns.map((item) =>
        item.id === runId
          ? { ...item, status: 'Authorized', authorizedOn: new Date().toISOString() }
          : item,
      ),
    }));
    return true;
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

  private setLeaveStatus(requestId: string, status: 'Approved'): boolean {
    const target = this.store().leaveRequests.find((row) => row.id === requestId);
    if (!target || target.status !== 'Pending') {
      return false;
    }
    this.mutate((state) => ({
      ...state,
      leaveRequests: state.leaveRequests.map((row) =>
        row.id === requestId ? { ...row, status } : row,
      ),
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
    this.personalExtras.update((extras) => ({
      ...extras,
      notifications: [
        {
          id: `NT-${++this.seq}`,
          employeeId,
          type,
          message,
          date: new Date().toISOString().slice(0, 10),
          read: false,
        },
        ...extras.notifications,
      ],
    }));
  }

  private mutate(updater: (state: WorkforceState) => WorkforceState): void {
    this.store.set(updater(this.store()));
  }

  private toPersonalWorkspace(employeeId: string): EmployeeWorkspace {
    const state = this.store();
    const profile = state.profiles[employeeId] ?? state.profiles[DEMO_EMPLOYEE_ID];
    const extras = this.personalExtras();
    return {
      profile,
      leaveBalances: state.leaveBalances[employeeId] ?? DEFAULT_BALANCES(),
      leaveRequests: state.leaveRequests.filter((row) => row.employeeId === employeeId),
      claims: state.claims.filter((row) => row.employeeId === employeeId),
      payslips: state.payslips.filter((row) => row.employeeId === employeeId),
      passAlerts: state.passAlerts[employeeId] ?? [],
      attendance: state.attendance.filter((row) => row.employeeId === employeeId),
      documents: state.documents.filter((row) => row.employeeId === employeeId),
      assets: extras.assets.filter((row) => row.employeeId === employeeId),
      training: extras.training.filter((row) => row.employeeId === employeeId),
      notifications: extras.notifications.filter((row) => row.employeeId === employeeId),
      bankRequests: state.bankRequests.filter((row) => row.employeeId === employeeId),
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
      },
      {
        employeeId: 'EY-1201',
        fullName: 'Nguyen Van Duc',
        department: 'Site Ops',
        designation: 'General Worker',
        employmentType: 'WP',
        workLocation: 'Site',
        status: 'Active',
        passExpiry: '2026-04-28',
        contractExpiry: '2026-04-28',
        nricOrFin: 'G7654321K',
        mobile: '84561234',
        passportExpiry: '2026-06-30',
        medicalClearance: 'Missing',
      },
      {
        employeeId: 'EY-1022',
        fullName: 'Daniel Koh',
        department: 'BIM',
        designation: 'BIM Coordinator',
        employmentType: 'EP',
        workLocation: 'WFH',
        status: 'Active',
        passExpiry: '2027-08-19',
        contractExpiry: '2027-08-19',
        nricOrFin: 'F7654987P',
        mobile: '95671234',
        passportExpiry: '2026-06-30',
        medicalClearance: 'Valid',
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
      if (row.passExpiry) {
        const days = daysUntil(row.passExpiry);
        items.push({
          id: `CMP-PASS-${row.employeeId}`,
          employeeId: row.employeeId,
          employeeName: row.fullName,
          category: 'Work Pass',
          reference: `${row.employmentType} · ${row.nricOrFin}`,
          expiryDate: row.passExpiry,
          daysRemaining: days,
          status: days < 0 ? 'Expired' : days <= 90 ? 'Expiring' : 'Ok',
        });
      }
      if (row.passportExpiry) {
        const days = daysUntil(row.passportExpiry);
        items.push({
          id: `CMP-PPT-${row.employeeId}`,
          employeeId: row.employeeId,
          employeeName: row.fullName,
          category: 'Passport',
          reference: 'Passport validity',
          expiryDate: row.passportExpiry,
          daysRemaining: days,
          status: days < 0 ? 'Expired' : days <= 90 ? 'Expiring' : 'Ok',
        });
      }
      items.push({
        id: `CMP-MED-${row.employeeId}`,
        employeeId: row.employeeId,
        employeeName: row.fullName,
        category: 'Medical',
        reference: 'Medical clearance',
        expiryDate: null,
        daysRemaining: null,
        status:
          row.medicalClearance === 'Valid'
            ? 'Ok'
            : row.medicalClearance === 'Expired'
              ? 'Expired'
              : 'Missing',
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
      },
      {
        id: 'PR-202602',
        period: 'Feb 2026',
        status: 'Authorized',
        employeeCount: 6,
        totalNetPay: 47102.1,
        totalCpfEmployee: 5980,
        totalCpfEmployer: 5280,
        totalSdl: 94.2,
        authorizedOn: '2026-02-26T10:00:00',
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
      costCentres: ['PRJ-Marina', 'PRJ-Jurong', 'PRJ-Changi', 'OH-Structural', 'OH-Admin'],
      otApprovals: {},
      policies: createDefaultSystemPolicies(),
    };
  }
}
