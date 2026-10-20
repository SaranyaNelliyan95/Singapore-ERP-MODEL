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

export interface StaffDirectoryRow {
  employeeId: string;
  fullName: string;
  department: string;
  designation: string;
  employmentType: EmploymentPassType;
  workLocation: WorkLocation;
  status: 'Active' | 'Resigned' | 'On Leave';
  passExpiry: string | null;
  contractExpiry: string | null;
  nricOrFin: string;
  mobile: string;
  passportExpiry: string | null;
  medicalClearance: 'Valid' | 'Missing' | 'Expired';
}

export interface ComplianceWatchItem {
  id: string;
  employeeId: string;
  employeeName: string;
  category: 'Work Pass' | 'Passport' | 'Medical' | 'Safety Cert' | 'Contract';
  reference: string;
  expiryDate: string | null;
  daysRemaining: number | null;
  status: 'Ok' | 'Expiring' | 'Expired' | 'Missing';
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
  costCentres: string[];
  otApprovals: Record<string, boolean>;
  assets: EmployeeAsset[];
  training: TrainingRecord[];
  notifications: EmployeeNotification[];
  /** Admin-managed policies mirrored into ESS / HR */
  policies: SystemPolicies;
}
