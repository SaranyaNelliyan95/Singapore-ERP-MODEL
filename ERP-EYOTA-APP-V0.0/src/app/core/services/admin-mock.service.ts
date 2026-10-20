import { Injectable, Injector, computed, inject, signal } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import {
  AdminDashboardStats,
  AdminSystemState,
  ArchivePolicy,
  AuditLogEntry,
  BackupControl,
  ExtendedRole,
  IntegrationHealth,
  PermissionCell,
  StatutoryControls,
  SystemPolicies,
  SystemUser,
  WorkflowStage,
} from '../models/admin.model';
import { AuthService } from './auth.service';
import { EmployeeMockService } from './employee-mock.service';

const CAPABILITIES = [
  'ess.self_service',
  'hr.directory',
  'hr.leave_approve',
  'hr.payroll_run',
  'admin.users',
  'admin.integrations',
  'admin.audit_export',
  'reports.workright',
] as const;

const ROLES: ExtendedRole[] = ['admin', 'hr', 'payroll', 'manager', 'employee', 'auditor'];
const ADMIN_STORAGE_KEY = 'eyota.demo.admin.v1';

@Injectable({ providedIn: 'root' })
export class AdminMockService {
  private readonly workforce = inject(EmployeeMockService);
  private readonly injector = inject(Injector);
  private seq = 5000;
  private readonly state = signal<AdminSystemState>(this.loadOrSeedAdmin());

  readonly system = this.state.asReadonly();
  readonly policies = computed(() => this.workforce.workforce().policies);

  readonly stats = computed<AdminDashboardStats>(() => {
    const s = this.state();
    const active = s.users.filter((u) => u.status === 'Active');
    const dist = ROLES.map((role) => ({
      role,
      count: s.users.filter((u) => u.role === role).length,
    })).filter((row) => row.count > 0);

    return {
      usersOnline: Math.min(24, active.length + 18),
      activeUsers: active.length,
      failedJobs: s.failedJobs.length,
      securityAlerts: s.auditLogs.filter((a) => a.action.toLowerCase().includes('permission')).length,
      roleDistribution: dist.map((d) => ({
        role: d.role.charAt(0).toUpperCase() + d.role.slice(1),
        count: d.count || (d.role === 'employee' ? 118 : d.count),
      })),
      nextBackupLabel: s.backup.nextBackup,
    };
  });

  bootstrap(): Observable<boolean> {
    return of(true).pipe(delay(260));
  }

  isUserActive(email: string): boolean {
    const user = this.state().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    return !user || user.status === 'Active';
  }

  toggleUserActive(userId: string): SystemUser | null {
    const current = this.state().users.find((u) => u.id === userId);
    if (!current) {
      return null;
    }
    const updated: SystemUser = {
      ...current,
      status: current.status === 'Active' ? 'Inactive' : 'Active',
    };
    this.patch((s) => ({
      ...s,
      users: s.users.map((u) => (u.id === userId ? updated : u)),
    }));
    this.audit(
      'User status changed',
      `User · ${updated.email}`,
      current.status,
      updated.status,
    );
    return updated;
  }

  toggleMfa(userId: string): void {
    this.patch((s) => ({
      ...s,
      users: s.users.map((u) =>
        u.id === userId ? { ...u, mfaEnabled: !u.mfaEnabled } : u,
      ),
    }));
    const user = this.state().users.find((u) => u.id === userId);
    if (user) {
      this.audit('MFA toggle', `User · ${user.email}`, String(!user.mfaEnabled), String(user.mfaEnabled));
    }
  }

  setPermission(role: ExtendedRole, capability: string, allowed: boolean): void {
    this.patch((s) => ({
      ...s,
      permissions: s.permissions.map((cell) =>
        cell.role === role && cell.capability === capability ? { ...cell, allowed } : cell,
      ),
    }));
    this.audit('Permission matrix', `${role} · ${capability}`, String(!allowed), String(allowed));
  }

  updateCompany(company: SystemPolicies['company']): void {
    this.workforce.patchPolicies({ company });
    this.audit('Company profile', 'Company Setup', 'updated', company.legalName);
  }

  updateOrgLists(partial: Pick<SystemPolicies, 'branches' | 'departments' | 'costCentres' | 'jobGrades'>): void {
    this.workforce.patchPolicies(partial);
    this.audit('Org structure', 'Company Setup', 'lists', JSON.stringify(partial.costCentres));
  }

  updateLeavePolicies(leavePolicies: SystemPolicies['leavePolicies']): void {
    this.workforce.patchPolicies({ leavePolicies });
    this.audit('Leave policies', 'Master Data', 'updated', `${leavePolicies.filter((p) => p.enabled).length} enabled`);
  }

  updateClaimLimits(claimLimits: SystemPolicies['claimLimits']): void {
    this.workforce.patchPolicies({ claimLimits });
    this.audit('Claim limits', 'Master Data', 'updated', `${claimLimits.length} types`);
  }

  updateHolidays(holidays: SystemPolicies['holidays']): void {
    this.workforce.patchPolicies({ holidays });
    this.audit('Holiday calendar', 'Master Data', 'updated', `${holidays.length} days`);
  }

  updateDeductionAndAssets(deductionCodes: string[], assetCategories: string[]): void {
    this.workforce.patchPolicies({ deductionCodes, assetCategories });
    this.audit('Codes & assets', 'Master Data', 'updated', 'codes');
  }

  restoreDemoDefaults(): void {
    const policies = this.workforce.restoreDemoPolicies();
    this.audit('Restore demo defaults', 'Master Data', 'custom', policies.company.legalName);
  }

  /** Full frontend demo reset — workforce + admin + provisioned logins */
  resetEntireDemoEnvironment(): void {
    this.workforce.resetAllDemoData();
    this.injector.get(AuthService).clearProvisionedUsers();
    localStorage.removeItem(ADMIN_STORAGE_KEY);
    this.seq = 5000;
    this.state.set(this.seedAdmin());
    this.persistAdmin();
    this.audit('Full demo reset', 'System', 'custom state', 'packaged seed restored');
  }

  hasCapability(role: ExtendedRole, capability: string): boolean {
    const cell = this.state().permissions.find(
      (row) => row.role === role && row.capability === capability,
    );
    return cell?.allowed !== false;
  }

  updateWorkflows(workflows: WorkflowStage[]): void {
    this.patch((s) => ({ ...s, workflows }));
    this.audit('Workflow builder', 'Workflows', 'updated', `${workflows.length} stages`);
  }

  testIntegration(id: string): IntegrationHealth | null {
    const current = this.state().integrations.find((row) => row.id === id);
    if (!current) {
      return null;
    }
    const ok = Math.random() > 0.15;
    const result: IntegrationHealth = {
      ...current,
      status: ok ? 'Healthy' : 'Degraded',
      lastSync: new Date().toISOString(),
      message: ok ? 'Test connection succeeded (demo)' : 'Test connection timed out (demo)',
    };
    this.patch((s) => ({
      ...s,
      integrations: s.integrations.map((row) => (row.id === id ? result : row)),
    }));
    this.audit('Integration test', result.name, '—', result.status);
    return result;
  }

  forceSync(id: string): IntegrationHealth | null {
    const current = this.state().integrations.find((row) => row.id === id);
    if (!current) {
      return null;
    }
    const result: IntegrationHealth = {
      ...current,
      status: 'Syncing',
      lastSync: new Date().toISOString(),
      message: 'Force sync in progress (demo)',
    };
    this.patch((s) => ({
      ...s,
      integrations: s.integrations.map((row) => (row.id === id ? result : row)),
    }));

    window.setTimeout(() => {
      this.patch((s) => ({
        ...s,
        integrations: s.integrations.map((row) =>
          row.id === id
            ? {
                ...row,
                status: 'Healthy',
                lastSync: new Date().toISOString(),
                message: 'Force sync completed (demo)',
              }
            : row,
        ),
      }));
    }, 1200);

    this.audit('Force sync', result.name, '—', 'Syncing');
    return result;
  }

  updateStatutory(statutory: StatutoryControls): void {
    this.workforce.patchPolicies({ statutory });
    this.audit(
      'Statutory controls',
      'Payroll Controls',
      statutory.payrollPeriodOpen ? 'period open' : 'period closed',
      statutory.activePayPeriod,
    );
  }

  updateArchive(archive: ArchivePolicy): void {
    this.patch((s) => ({ ...s, archive }));
    this.audit('Archive policy', 'Document Archive', String(archive.retentionYears), 'years');
  }

  updateBackupSchedule(schedule: string, region: string): void {
    this.patch((s) => ({
      ...s,
      backup: { ...s.backup, schedule, region },
    }));
    this.audit('Backup schedule', 'Backup & DR', schedule, region);
  }

  triggerManualSnapshot(): void {
    this.patch((s) => ({
      ...s,
      backup: { ...s.backup, status: 'Running', progressPercent: 10 },
    }));
    this.audit('Manual snapshot', 'Backup & DR', 'Ready', 'Running');

    let progress = 10;
    const timer = window.setInterval(() => {
      progress += 30;
      if (progress >= 100) {
        window.clearInterval(timer);
        this.patch((s) => ({
          ...s,
          backup: {
            ...s.backup,
            status: 'Ready',
            progressPercent: 100,
            lastBackup: new Date().toISOString(),
            restorePoints: s.backup.restorePoints + 1,
            nextBackup: new Date(Date.now() + 86400000).toISOString(),
          },
        }));
        this.audit('Snapshot complete', 'Backup & DR', 'Running', 'Ready');
        return;
      }
      this.patch((s) => ({
        ...s,
        backup: { ...s.backup, progressPercent: progress },
      }));
    }, 500);
  }

  updateHrModules(hrModules: SystemPolicies['hrModules']): void {
    this.workforce.patchPolicies({ hrModules });
    this.audit('HR module visibility', 'HR Access', 'updated', `${hrModules.filter((m) => m.visible).length} visible`);
  }

  exportAuditCsv(): string {
    const header = 'timestamp,actor,action,entity,before,after,ip\n';
    const body = this.state()
      .auditLogs.map(
        (row) =>
          `"${row.timestamp}","${row.actor}","${row.action}","${row.entity}","${row.beforeValue}","${row.afterValue}","${row.ipAddress}"`,
      )
      .join('\n');
    this.audit('Export audit CSV', 'Audit Trail', '—', `${this.state().auditLogs.length} rows`);
    return header + body;
  }

  clearAuditWithConfirm(): void {
    const count = this.state().auditLogs.length;
    this.patch((s) => ({
      ...s,
      auditLogs: [
        {
          id: `AUD-${++this.seq}`,
          timestamp: new Date().toISOString(),
          actor: 'System Admin',
          action: 'Cleared audit log (demo)',
          entity: 'Audit Trail',
          beforeValue: `${count} rows`,
          afterValue: '1 seed row',
          ipAddress: '10.0.0.1',
        },
      ],
    }));
  }

  private audit(action: string, entity: string, beforeValue: string, afterValue: string): void {
    const entry: AuditLogEntry = {
      id: `AUD-${++this.seq}`,
      timestamp: new Date().toISOString(),
      actor: 'Aisha Rahman',
      action,
      entity,
      beforeValue,
      afterValue,
      ipAddress: '118.201.12.44',
    };
    this.patch((s) => ({ ...s, auditLogs: [entry, ...s.auditLogs].slice(0, 200) }));
  }

  private patch(updater: (s: AdminSystemState) => AdminSystemState): void {
    this.state.set(updater(this.state()));
    this.persistAdmin();
  }

  private persistAdmin(): void {
    try {
      localStorage.setItem(
        ADMIN_STORAGE_KEY,
        JSON.stringify({ seq: this.seq, state: this.state() }),
      );
    } catch {
      /* ignore */
    }
  }

  private loadOrSeedAdmin(): AdminSystemState {
    try {
      const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
      if (!raw) {
        return this.seedAdmin();
      }
      const parsed = JSON.parse(raw) as { seq?: number; state?: AdminSystemState };
      if (!parsed.state?.users?.length) {
        return this.seedAdmin();
      }
      if (typeof parsed.seq === 'number') {
        this.seq = parsed.seq;
      }
      return parsed.state;
    } catch {
      return this.seedAdmin();
    }
  }

  private seedAdmin(): AdminSystemState {
    const permissions: PermissionCell[] = ROLES.flatMap((role) =>
      CAPABILITIES.map((capability) => ({
        role,
        capability,
        allowed:
          role === 'admin' ||
          (role === 'hr' && capability.startsWith('hr')) ||
          (role === 'hr' && capability === 'reports.workright') ||
          (role === 'payroll' && capability.includes('payroll')) ||
          (role === 'employee' && capability === 'ess.self_service') ||
          (role === 'manager' && (capability === 'hr.leave_approve' || capability === 'ess.self_service')) ||
          (role === 'auditor' && capability === 'admin.audit_export'),
      })),
    );

    const backup: BackupControl = {
      schedule: 'Daily 02:00 SGT',
      region: 'Singapore (ap-southeast-1)',
      lastBackup: '2026-03-17T02:00:00',
      nextBackup: '2026-03-18T02:00:00',
      restorePoints: 14,
      status: 'Ready',
      progressPercent: 100,
    };

    return {
      users: [
        {
          id: 'USR-01',
          displayName: 'Aisha Rahman',
          email: 'admin@eyota.sg',
          role: 'admin',
          linkedEmployeeId: null,
          mfaEnabled: true,
          status: 'Active',
          lastLogin: '2026-03-17T08:10:00',
        },
        {
          id: 'USR-02',
          displayName: 'Wei Ming Lim',
          email: 'hr@eyota.sg',
          role: 'hr',
          linkedEmployeeId: 'EY-0088',
          mfaEnabled: true,
          status: 'Active',
          lastLogin: '2026-03-17T07:55:00',
        },
        {
          id: 'USR-03',
          displayName: 'Priya Tan',
          email: 'employee@eyota.sg',
          role: 'employee',
          linkedEmployeeId: 'EY-1042',
          mfaEnabled: false,
          status: 'Active',
          lastLogin: '2026-03-17T08:52:00',
        },
        {
          id: 'USR-04',
          displayName: 'Janice Teo',
          email: 'payroll@eyota.sg',
          role: 'payroll',
          linkedEmployeeId: 'EY-0150',
          mfaEnabled: true,
          status: 'Active',
          lastLogin: '2026-03-16T18:20:00',
        },
        {
          id: 'USR-05',
          displayName: 'External Auditor',
          email: 'audit@eyota.sg',
          role: 'auditor',
          linkedEmployeeId: null,
          mfaEnabled: true,
          status: 'Inactive',
          lastLogin: '2026-02-28T10:00:00',
        },
        {
          id: 'USR-06',
          displayName: 'Site Manager',
          email: 'manager@eyota.sg',
          role: 'manager',
          linkedEmployeeId: 'EY-1108',
          mfaEnabled: true,
          status: 'Active',
          lastLogin: '2026-03-16T09:00:00',
        },
      ],
      auditLogs: [
        {
          id: 'AUD-9001',
          timestamp: '2026-03-17T09:12:00',
          actor: 'Aisha Rahman',
          action: 'Updated permission',
          entity: 'Role · HR',
          beforeValue: 'claims.approve=false',
          afterValue: 'claims.approve=true',
          ipAddress: '118.201.12.44',
        },
        {
          id: 'AUD-9002',
          timestamp: '2026-03-17T08:41:00',
          actor: 'Wei Ming Lim',
          action: 'Exported Workright pack',
          entity: 'Inspection Pack',
          beforeValue: '—',
          afterValue: 'Generated ZIP',
          ipAddress: '118.201.12.51',
        },
      ],
      integrations: [
        {
          id: 'INT-MOM',
          name: 'MOM Work Pass Services',
          provider: 'MOM',
          status: 'Healthy',
          lastSync: '2026-03-17T06:00:00',
          message: 'Pass expiry feed OK',
          apiKeyMasked: 'mom_••••••••9f2a',
        },
        {
          id: 'INT-CPF',
          name: 'CPF Board Portal',
          provider: 'CPF',
          status: 'Healthy',
          lastSync: '2026-03-01T22:10:00',
          message: 'Feb contribution accepted',
          apiKeyMasked: 'cpf_••••••••44c1',
        },
        {
          id: 'INT-IRAS',
          name: 'IRAS AIS / IR8A',
          provider: 'IRAS',
          status: 'Degraded',
          lastSync: '2026-03-15T11:00:00',
          message: 'Latency above threshold',
          apiKeyMasked: 'iras_••••••••a81e',
        },
        {
          id: 'INT-GIRO',
          name: 'Bank GIRO networks',
          provider: 'Bank GIRO',
          status: 'Healthy',
          lastSync: '2026-02-28T05:30:00',
          message: 'Payroll file posted',
          apiKeyMasked: 'giro_••••••••2201',
        },
        {
          id: 'INT-BIO',
          name: 'Biometric terminals',
          provider: 'Biometric',
          status: 'Syncing',
          lastSync: '2026-03-17T09:00:00',
          message: 'Jurong gate syncing',
          apiKeyMasked: 'bio_••••••••77d0',
        },
      ],
      backup,
      workflows: [
        {
          id: 'WF-L1',
          process: 'Leave',
          stageName: 'Manager review',
          approverRole: 'manager',
          slaHours: 24,
          escalationTo: 'hr',
          messageTemplate: 'Please review leave request {{id}} for {{employee}}.',
        },
        {
          id: 'WF-L2',
          process: 'Leave',
          stageName: 'HR confirmation',
          approverRole: 'hr',
          slaHours: 48,
          escalationTo: 'admin',
          messageTemplate: 'Escalate leave {{id}} — SLA breached.',
        },
        {
          id: 'WF-C1',
          process: 'Claims',
          stageName: 'Cost centre owner',
          approverRole: 'manager',
          slaHours: 36,
          escalationTo: 'hr',
          messageTemplate: 'Claim {{id}} awaiting cost centre approval.',
        },
        {
          id: 'WF-P1',
          process: 'Payroll',
          stageName: 'Payroll lock',
          approverRole: 'payroll',
          slaHours: 12,
          escalationTo: 'admin',
          messageTemplate: 'Authorize payroll period {{period}}.',
        },
      ],
      permissions,
      archive: {
        retentionYears: 7,
        encryptAtRest: true,
        roleLocks: ['admin', 'hr', 'auditor'],
        workrightPackEnabled: true,
      },
      health: [
        { id: 'H1', name: 'Frontend bundle', value: 'ERP-EYOTA-APP-V0.0', status: 'Ok' },
        { id: 'H2', name: 'Mock API latency', value: '42 ms', status: 'Ok' },
        { id: 'H3', name: 'Micro-state cache', value: '1.2 MB', status: 'Ok' },
        { id: 'H4', name: 'Integration heartbeat', value: '1 degraded', status: 'Warn' },
        { id: 'H5', name: 'Angular runtime', value: 'v22.2', status: 'Ok' },
      ],
      failedJobs: [
        { id: 'JOB-1', name: 'IRAS AIS retry', at: '2026-03-16T22:10:00' },
        { id: 'JOB-2', name: 'Biometric late sync', at: '2026-03-17T08:55:00' },
      ],
    };
  }
}
