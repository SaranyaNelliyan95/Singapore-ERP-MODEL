import {
  AssetType,
  ClaimType,
  EmploymentPassType,
  LeaveType,
  RequestStatus,
  WorkLocation,
} from './common.model';

export interface EmployeeProfile {
  employeeId: string;
  fullName: string;
  nricOrFin: string;
  nationality: string;
  employmentType: EmploymentPassType;
  department: string;
  designation: string;
  reportingManager: string;
  dateOfJoining: string;
  probationStatus: string;
  workLocation: WorkLocation;
  personalEmail: string;
  mobile: string;
  residentialAddress: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  bankName: string;
  bankAccountNumber: string;
}

export interface LeaveBalance {
  type: LeaveType;
  entitled: number;
  used: number;
  balance: number;
  simulatedNote: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: LeaveType;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: RequestStatus;
  approver: string;
  /** HR decision comment when rejected/approved */
  hrComments?: string;
  decidedOn?: string;
}

export interface ClaimRecord {
  id: string;
  employeeId: string;
  type: ClaimType;
  date: string;
  amountSgd: number;
  costCentre: string;
  remarks: string;
  status: RequestStatus;
  approverComments: string;
  /** Simulated receipt attachment flag */
  hasReceipt: boolean;
}

export interface PayslipRecord {
  id: string;
  employeeId: string;
  payPeriod: string;
  basic: number;
  allowances: number;
  overtime: number;
  bonus: number;
  cpfEmployee: number;
  cpfEmployer: number;
  sdl: number;
  deductions: number;
  netPay: number;
  bankCreditedDate: string;
  demoDocument: true;
}

export interface PassAlert {
  label: string;
  expiryDate: string;
  daysRemaining: number;
  severity: 'info' | 'warning' | 'danger';
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  location: WorkLocation;
  otHours: number;
  gpsTracked: boolean;
  lateMinutes: number;
  status: 'Present' | 'Late' | 'Absent' | 'On Leave' | 'In Progress';
}

export interface EmployeeDocument {
  id: string;
  employeeId: string;
  name: string;
  category: 'Passport' | 'Work Pass' | 'Certification' | 'Contract' | 'Medical' | 'Other';
  fileName: string;
  uploadedOn: string;
  expiryDate: string | null;
  status: 'Verified' | 'Pending' | 'Expired';
  sizeLabel: string;
}

export interface EmployeeAsset {
  id: string;
  employeeId: string;
  assetId: string;
  type: AssetType;
  assignedDate: string;
  condition: 'Good' | 'Fair' | 'Replace Soon';
  returnStatus: 'Assigned' | 'Returned';
}

export interface TrainingRecord {
  id: string;
  employeeId: string;
  courseName: string;
  category: 'Safety' | 'BCA' | 'Soft Skill' | 'Compliance';
  completedDate: string | null;
  expiryDate: string | null;
  status: 'Current' | 'Expiring' | 'Expired' | 'Required';
}

export interface EmployeeNotification {
  id: string;
  employeeId: string;
  type: 'Leave' | 'Payslip' | 'Document' | 'Training' | 'Claim' | 'System';
  message: string;
  date: string;
  read: boolean;
}

export interface BankUpdateRequest {
  id: string;
  employeeId: string;
  bankName: string;
  bankAccountNumber: string;
  status: 'Pending HR' | 'Approved' | 'Rejected';
  submittedOn: string;
  note: string;
}

export type ContactPatch = Pick<
  EmployeeProfile,
  | 'personalEmail'
  | 'mobile'
  | 'residentialAddress'
  | 'emergencyContactName'
  | 'emergencyContactPhone'
  | 'emergencyContactRelation'
>;

export interface ProfileUpdateRequest {
  id: string;
  employeeId: string;
  submittedOn: string;
  status: 'Pending HR' | 'Approved' | 'Rejected';
  patch: ContactPatch;
  note: string;
  hrComments: string;
}

export interface ClockState {
  status: 'Checked out' | 'Checked in';
  checkIn: string | null;
  checkOut: string | null;
  location: WorkLocation;
  gpsEnabled: boolean;
}

export interface EmployeeWorkspace {
  profile: EmployeeProfile;
  leaveBalances: LeaveBalance[];
  leaveRequests: LeaveRequest[];
  claims: ClaimRecord[];
  payslips: PayslipRecord[];
  passAlerts: PassAlert[];
  attendance: AttendanceRecord[];
  documents: EmployeeDocument[];
  assets: EmployeeAsset[];
  training: TrainingRecord[];
  notifications: EmployeeNotification[];
  bankRequests: BankUpdateRequest[];
  profileRequests: ProfileUpdateRequest[];
  clock: ClockState;
  costCentres: string[];
}

/** @deprecated Prefer EmployeeWorkspace — kept for Stage 1 callers during migration */
export type EmployeeDashboard = EmployeeWorkspace;
