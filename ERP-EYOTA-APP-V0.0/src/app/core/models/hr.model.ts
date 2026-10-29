import type { SystemPolicies } from './admin.model';
import { EmploymentPassType, RequestStatus, WorkLocation } from './common.model';
import {
  AttendanceRecord,
  BankUpdateRequest,
  ClaimRecord,
  ClockState,
  EmployeeAsset,
  EmployeeDocument,
  EmployeeNotification,
  EmployeeProfile,
  LeaveBalance,
  LeaveRequest,
  PassAlert,
  PayslipRecord,
  ProfileUpdateRequest,
  TrainingRecord,
} from './employee.model';

export type EmploymentLifecycleStatus =
  | 'Active'
  | 'Resigned'
  | 'On Leave'
  | 'Probation'
  | 'Notice';

export interface StaffDirectoryRow {
  employeeId: string;
  fullName: string;
  department: string;
  designation: string;
  employmentType: EmploymentPassType;
  workLocation: WorkLocation;
  status: EmploymentLifecycleStatus;
  passExpiry: string | null;
  contractExpiry: string | null;
  nricOrFin: string;
  mobile: string;
  passportExpiry: string | null;
  medicalClearance: 'Valid' | 'Missing' | 'Expired';
  branch?: string;
  projectId?: string | null;
  dateOfJoining?: string;
  probationEndDate?: string | null;
  noticeEndDate?: string | null;
}

export type ComplianceAgency = 'MOM' | 'ICA' | 'Internal';

export interface ComplianceWatchItem {
  id: string;
  employeeId: string;
  employeeName: string;
  category: 'Work Pass' | 'Passport' | 'Medical' | 'Safety Cert' | 'Contract' | 'ICA Record';
  agency?: ComplianceAgency;
  reference: string;
  expiryDate: string | null;
  daysRemaining: number | null;
  status: 'Ok' | 'Expiring' | 'Expired' | 'Missing' | 'Pending Review';
  checklistItem?: string;
  comments?: string;
}

export interface EmployeeManagementStats {
  totalEmployees: number;
  activeEmployees: number;
  localCount: number;
  foreignCount: number;
  onLeave: number;
  newJoiners: number;
  onProbation: number;
  servingNotice: number;
  missingDocuments: number;
  upcomingExpiries: number;
  /** Work-pass rows with ≤ 30 days remaining (demo / stored compliance data). */
  passRenewalsUrgent: number;
  /**
   * Share of active staff tagged with BCA-related certs in demo data.
   * Not an official CoreTrade statutory calculation — placeholder until rules are configured.
   */
  bcaCoreTradePct: number | null;
  overtimeRiskCount: number;
}

export interface ProjectRecord {
  id: string;
  name: string;
  code: string;
  site: string;
  status: 'Active' | 'On Hold' | 'Completed';
  plannedHeadcount: number;
  startDate: string;
  endDate: string | null;
  requiredCerts: string[];
}

export interface ManpowerRequest {
  id: string;
  projectId: string;
  role: string;
  skill: string;
  headcount: number;
  status: 'Open' | 'Approved' | 'Rejected' | 'Filled';
  requestedOn: string;
  notes: string;
}

export interface ProjectAllocation {
  id: string;
  projectId: string;
  employeeId: string;
  role: string;
  startDate: string;
  endDate: string | null;
  allocationPct: number;
  status: 'Active' | 'Ended' | 'Conflict';
}

export interface PayrollException {
  id: string;
  runId: string;
  employeeId: string;
  type: 'Missing bank' | 'Missing attendance' | 'OT pending' | 'Claim pending' | 'Other';
  severity: 'Info' | 'Warning' | 'Blocker';
  message: string;
  resolved: boolean;
}

export interface OnboardingCandidate {
  id: string;
  candidateName: string;
  role: string;
  department: string;
  startDate: string;
  stage: 'Offer' | 'MOM Forms' | 'Medical' | 'Orientation' | 'Completed';
  employmentType: EmploymentPassType;
  checklistProgress: number;
}

export type PayrollRunStatus =
  | 'Draft'
  | 'Under Review'
  | 'Approved'
  | 'Finalized'
  /** @deprecated mapped to Finalized for older seed data */
  | 'Authorized'
  | 'Paid';

export interface PayrollRun {
  id: string;
  period: string;
  status: PayrollRunStatus;
  employeeCount: number;
  totalNetPay: number;
  totalCpfEmployee: number;
  totalCpfEmployer: number;
  totalSdl: number;
  authorizedOn: string | null;
  reviewedOn?: string | null;
  approvedOn?: string | null;
  finalizedOn?: string | null;
}

export interface HrDashboardStats {
  totalEmployees: number;
  localCount: number;
  prCount: number;
  foreignCount: number;
  onLeaveToday: number;
  passesExpiring90: number;
  attendanceRateToday: number;
  pendingLeaves: number;
  pendingClaims: number;
  pendingDocuments: number;
  pendingBankRequests: number;
  payrollStatus: string;
}

export interface WorkforceState {
  directory: StaffDirectoryRow[];
  profiles: Record<string, EmployeeProfile>;
  leaveBalances: Record<string, LeaveBalance[]>;
  leaveRequests: LeaveRequest[];
  claims: ClaimRecord[];
  payslips: PayslipRecord[];
  attendance: AttendanceRecord[];
  documents: EmployeeDocument[];
  bankRequests: BankUpdateRequest[];
  profileRequests: ProfileUpdateRequest[];
  clocks: Record<string, ClockState>;
  passAlerts: Record<string, PassAlert[]>;
  compliance: ComplianceWatchItem[];
  onboarding: OnboardingCandidate[];
  payrollRuns: PayrollRun[];
  payrollExceptions: PayrollException[];
  projects: ProjectRecord[];
  manpowerRequests: ManpowerRequest[];
  allocations: ProjectAllocation[];
  costCentres: string[];
  otApprovals: Record<string, boolean>;
  assets: EmployeeAsset[];
  training: TrainingRecord[];
  notifications: EmployeeNotification[];
  /** Admin-managed policies mirrored into ESS / HR */
  policies: SystemPolicies;
}
