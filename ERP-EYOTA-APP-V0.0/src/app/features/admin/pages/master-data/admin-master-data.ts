import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AdminMockService } from '../../../../core/services/admin-mock.service';
import {
  LeaveConfigApiService,
  LeaveConfigDto,
} from '../../../../core/services/leave-config-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { environment } from '../../../../../environments/environment';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal/confirm-modal';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';
import { ClaimLimitPolicy, LeavePolicy, MasterCatalogs } from '../../../../core/models/admin.model';
import { createDefaultSystemPolicies } from '../../../../core/services/system-policies.defaults';

@Component({
  selector: 'app-admin-master-data',
  standalone: true,
  imports: [FormsModule, LoadingSpinnerComponent, ConfirmModalComponent],
  templateUrl: './admin-master-data.html',
  styleUrl: './admin-master-data.css',
})
export class AdminMasterDataPage implements OnInit {
  readonly admin = inject(AdminMockService);
  private readonly leaveConfigApi = inject(LeaveConfigApiService);
  readonly toast = inject(ToastService);
  readonly useBackend = environment.useBackendApi;
  readonly loading = signal(true);
  readonly savingLeaveConfig = signal(false);
  readonly restoreOpen = signal(false);
  readonly fullResetOpen = signal(false);
  readonly policies = this.admin.policies;

  readonly leaveConfigDraft = signal<LeaveConfigDto[]>([]);
  readonly leaveDraft = signal<LeavePolicy[]>([]);
  readonly claimDraft = signal<ClaimLimitPolicy[]>([]);
  readonly holidaysText = signal('');
  readonly deductionsText = signal('');
  readonly assetsText = signal('');
  readonly departmentsText = signal('');
  readonly branchesText = signal('');
  readonly jobGradesText = signal('');
  readonly costCentresText = signal('');
  readonly catalogDraft = signal<MasterCatalogs>(createDefaultSystemPolicies().catalogs!);

  ngOnInit(): void {
    this.admin.bootstrap().subscribe(() => {
      this.reloadDrafts();
      if (this.useBackend) {
        void this.loadLeaveConfigs();
      } else {
        this.loading.set(false);
      }
    });
  }

  private async loadLeaveConfigs(): Promise<void> {
    try {
      const rows = await firstValueFrom(this.leaveConfigApi.list());
      this.leaveConfigDraft.set(rows.map((r) => ({ ...r })));
    } catch (err) {
      this.toast.danger(
        'Leave configuration',
        err instanceof Error ? err.message : 'Failed to load company leave defaults',
      );
    } finally {
      this.loading.set(false);
    }
  }

  updateLeaveConfigRow(index: number, annualDays: number): void {
    this.leaveConfigDraft.update((rows) =>
      rows.map((row, i) => (i === index ? { ...row, annualDays } : row)),
    );
  }

  async saveLeaveConfigs(): Promise<void> {
    this.savingLeaveConfig.set(true);
    try {
      const payload = this.leaveConfigDraft().map((r) => ({
        code: r.code,
        annualDays: r.annualDays,
        notes: r.notes,
      }));
      const saved = await firstValueFrom(this.leaveConfigApi.update(payload));
      this.leaveConfigDraft.set(saved.map((r) => ({ ...r })));
      this.toast.success(
        'Leave defaults saved',
        'Company annual entitlements stored in PostgreSQL. Historical leave transactions are unchanged.',
      );
    } catch (err) {
      this.toast.danger('Save failed', err instanceof Error ? err.message : 'Update failed');
    } finally {
      this.savingLeaveConfig.set(false);
    }
  }

  saveLeave(): void {
    this.admin.updateLeavePolicies(this.leaveDraft());
    this.toast.success('Leave policies saved', 'Employee leave type list updates immediately.');
  }

  saveClaims(): void {
    this.admin.updateClaimLimits(this.claimDraft());
    this.toast.success('Claim limits saved', 'Employee claim submissions enforce new maxima.');
  }

  saveHolidays(): void {
    const holidays = this.holidaysText()
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        const [date, ...nameParts] = line.split('|');
        return {
          id: `HOL-${index + 1}`,
          date: (date ?? '').trim(),
          name: nameParts.join('|').trim() || 'Holiday',
        };
      });
    this.admin.updateHolidays(holidays);
    this.toast.success('Holiday calendar saved', `${holidays.length} Singapore public holidays stored.`);
  }

  saveCodes(): void {
    const split = (value: string) =>
      value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
    this.admin.updateDeductionAndAssets(split(this.deductionsText()), split(this.assetsText()));
    this.toast.success('Codes updated', 'Deduction codes and asset categories saved.');
  }

  saveOrgMasters(): void {
    const split = (value: string) =>
      value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
    this.admin.updateOrgMasters({
      departments: split(this.departmentsText()),
      branches: split(this.branchesText()),
      jobGrades: split(this.jobGradesText()),
      costCentres: split(this.costCentresText()),
    });
    this.toast.success('Org masters saved', 'Departments, branches, grades, and cost centres updated.');
  }

  saveCatalogs(): void {
    this.admin.updateMasterCatalogs(this.catalogDraft());
    this.toast.success(
      'Catalogs saved',
      'Employee, payroll, compliance, and project manpower masters updated.',
    );
  }

  setCatalogList(key: keyof MasterCatalogs, text: string): void {
    const list = text
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    this.catalogDraft.update((c) => ({ ...c, [key]: list }));
  }

  catalogText(key: keyof MasterCatalogs): string {
    return (this.catalogDraft()[key] ?? []).join(', ');
  }

  confirmRestore(): void {
    this.restoreOpen.set(false);
    this.admin.restoreDemoDefaults();
    this.reloadDrafts();
    this.toast.success('Demo defaults restored', 'Master data reset to packaged Singapore sample policies.');
  }

  confirmFullReset(): void {
    this.fullResetOpen.set(false);
    this.admin.resetEntireDemoEnvironment();
    this.reloadDrafts();
    this.toast.success(
      'Full demo reset',
      'Workforce, admin config, and provisioned logins restored from packaged seed (localStorage cleared).',
    );
  }

  updateLeaveRow(index: number, patch: Partial<LeavePolicy>): void {
    this.leaveDraft.update((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  updateClaimRow(index: number, patch: Partial<ClaimLimitPolicy>): void {
    this.claimDraft.update((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  private reloadDrafts(): void {
    const p = this.policies();
    const defaults = createDefaultSystemPolicies();
    this.leaveDraft.set(p.leavePolicies.map((row) => ({ ...row })));
    this.claimDraft.set(p.claimLimits.map((row) => ({ ...row })));
    this.holidaysText.set(p.holidays.map((h) => `${h.date}|${h.name}`).join('\n'));
    this.deductionsText.set(p.deductionCodes.join(', '));
    this.assetsText.set(p.assetCategories.join(', '));
    this.departmentsText.set(p.departments.join(', '));
    this.branchesText.set(p.branches.join(', '));
    this.jobGradesText.set(p.jobGrades.join(', '));
    this.costCentresText.set(p.costCentres.join(', '));
    this.catalogDraft.set({ ...defaults.catalogs!, ...(p.catalogs ?? {}) });
  }
}
