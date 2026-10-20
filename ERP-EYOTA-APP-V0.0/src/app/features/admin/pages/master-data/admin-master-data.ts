import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminMockService } from '../../../../core/services/admin-mock.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal/confirm-modal';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';
import { ClaimLimitPolicy, LeavePolicy } from '../../../../core/models/admin.model';

@Component({
  selector: 'app-admin-master-data',
  standalone: true,
  imports: [FormsModule, LoadingSpinnerComponent, ConfirmModalComponent],
  templateUrl: './admin-master-data.html',
  styleUrl: './admin-master-data.css',
})
export class AdminMasterDataPage implements OnInit {
  readonly admin = inject(AdminMockService);
  readonly toast = inject(ToastService);
  readonly loading = signal(true);
  readonly restoreOpen = signal(false);
  readonly policies = this.admin.policies;

  readonly leaveDraft = signal<LeavePolicy[]>([]);
  readonly claimDraft = signal<ClaimLimitPolicy[]>([]);
  readonly holidaysText = signal('');
  readonly deductionsText = signal('');
  readonly assetsText = signal('');

  ngOnInit(): void {
    this.admin.bootstrap().subscribe(() => {
      this.reloadDrafts();
      this.loading.set(false);
    });
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

  confirmRestore(): void {
    this.restoreOpen.set(false);
    this.admin.restoreDemoDefaults();
    this.reloadDrafts();
    this.toast.success('Demo defaults restored', 'Master data reset to packaged Singapore sample policies.');
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
    this.leaveDraft.set(p.leavePolicies.map((row) => ({ ...row })));
    this.claimDraft.set(p.claimLimits.map((row) => ({ ...row })));
    this.holidaysText.set(p.holidays.map((h) => `${h.date}|${h.name}`).join('\n'));
    this.deductionsText.set(p.deductionCodes.join(', '));
    this.assetsText.set(p.assetCategories.join(', '));
  }
}
