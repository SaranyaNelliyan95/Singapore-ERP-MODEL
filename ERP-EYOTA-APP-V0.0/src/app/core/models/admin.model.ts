import { ClaimType, LeaveType } from './common.model';
import { UserRole } from './user.model';

export type IntegrationStatus = 'Healthy' | 'Degraded' | 'Down' | 'Syncing';
export type ExtendedRole = UserRole | 'payroll' | 'manager' | 'auditor';

export interface SystemUser {
  id: string;
  displayName: string;
  email: string;
  role: ExtendedRole;
  linkedEmployeeId: string | null;
  mfaEnabled: boolean;
  status: 'Active' | 'Inactive';
  lastLogin: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  entity: string;
  beforeValue: string;
  afterValue: string;
  ipAddress: string;
}

export interface IntegrationHealth {
  id: string;
  name: string;
  provider: 'MOM' | 'CPF' | 'IRAS' | 'Bank GIRO' | 'Biometric';
  status: IntegrationStatus;
  lastSync: string;
  message: string;
  /** Masked only — never store raw secrets */
  apiKeyMasked: string;
}

export interface BackupControl {
  schedule: string;
  region: string;
  lastBackup: string;
  nextBackup: string;
  restorePoints: number;
  status: 'Ready' | 'Running' | 'Failed';
  progressPercent: number;
}

export interface AdminDashboardStats {
  usersOnline: number;
  activeUsers: number;
  failedJobs: number;
  securityAlerts: number;
  roleDistribution: { role: string; count: number }[];
  nextBackupLabel: string;
}

export interface CompanyProfile {
  legalName: string;
  uen: string;
  gstRegistered: boolean;
  gstNumberMasked: string;
  address: string;
  postalCode: string;
  payDay: number;
}

export interface LeavePolicy {
  type: LeaveType;
  annualEntitlement: number;
  enabled: boolean;
  carryForwardMax: number;
}

export interface ClaimLimitPolicy {
  type: ClaimType;
  maxAmountSgd: number;
  requireReceipt: boolean;
}

export interface HolidayEntry {
  id: string;
  name: string;
  date: string;
}

export interface WorkflowStage {
  id: string;
  process: 'Leave' | 'Claims' | 'Payroll';
  stageName: string;
  approverRole: ExtendedRole;
  slaHours: number;
  escalationTo: ExtendedRole;
  messageTemplate: string;
}

export interface PermissionCell {
  role: ExtendedRole;
  capability: string;
  allowed: boolean;
}

export interface ArchivePolicy {
  retentionYears: number;
  encryptAtRest: boolean;
  roleLocks: ExtendedRole[];
  workrightPackEnabled: boolean;
}

export interface StatutoryControls {
  payrollPeriodOpen: boolean;
  activePayPeriod: string;
  cpfEmployeeRatePct: number;
  cpfEmployerRatePct: number;
  sdlRatePct: number;
  payslipTemplate: 'MOM Itemised' | 'Compact';
  bankGiroChannelMasked: string;
}

export interface HrModuleVisibility {
  moduleKey: string;
  label: string;
  visible: boolean;
}

export interface SystemHealthMetric {
  id: string;
  name: string;
  value: string;
  status: 'Ok' | 'Warn' | 'Fail';
}

export interface SystemPolicies {
  company: CompanyProfile;
  branches: string[];
  departments: string[];
  costCentres: string[];
  jobGrades: string[];
  leavePolicies: LeavePolicy[];
  claimLimits: ClaimLimitPolicy[];
  deductionCodes: string[];
  assetCategories: string[];
  holidays: HolidayEntry[];
  statutory: StatutoryControls;
  hrModules: HrModuleVisibility[];
}

export interface AdminSystemState {
  users: SystemUser[];
  auditLogs: AuditLogEntry[];
  integrations: IntegrationHealth[];
  backup: BackupControl;
  workflows: WorkflowStage[];
  permissions: PermissionCell[];
  archive: ArchivePolicy;
  health: SystemHealthMetric[];
  failedJobs: { id: string; name: string; at: string }[];
}
