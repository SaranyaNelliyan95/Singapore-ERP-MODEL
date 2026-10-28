import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataTableColumn } from '../../../../core/models/common.model';
import { ComplianceAgency, ComplianceWatchItem } from '../../../../core/models/hr.model';
import { EmployeeMockService } from '../../../../core/services/employee-mock.service';
import { HrMockService } from '../../../../core/services/hr-mock.service';
import { ToastService } from '../../../../core/services/toast.service';
import { formatSgDate } from '../../../../core/utils/singapore.utils';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';
import { DemoNoticeComponent } from '../../../employee/shared/demo-notice';

type PassBucket = 'all' | 'critical' | 'mid' | 'safe';

@Component({
  selector: 'app-hr-compliance',
  standalone: true,
  imports: [FormsModule, DataTableComponent, LoadingSpinnerComponent, DemoNoticeComponent],
  templateUrl: './hr-compliance.html',
  styleUrl: './hr-compliance.css',
})
export class HrCompliancePage implements OnInit {
  readonly hr = inject(HrMockService);
  private readonly workforce = inject(EmployeeMockService);
  readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly agency = signal<'All' | ComplianceAgency>('All');
  readonly statusFilter = signal<string>('All');
  readonly commentDraft = signal('');
  readonly passBucket = signal<PassBucket>('critical');

  readonly passTabs: { id: PassBucket; label: string }[] = [
    { id: 'all', label: 'All active passes' },
    { id: 'critical', label: 'Critical < 30 days' },
    { id: 'mid', label: '30–90 days' },
    { id: 'safe', label: 'Over 90 days' },
  ];

  readonly commandKpis = computed(() => {
    const state = this.hr.workforce();
    const mom = state.compliance.filter((r) => r.agency === 'MOM');
    const momOk = mom.filter((r) => r.status === 'Ok').length;
    const criticalPasses = state.compliance.filter(
      (r) =>
        r.category === 'Work Pass' &&
        r.daysRemaining !== null &&
        r.daysRemaining <= 30,
    ).length;
    const window30to90 = state.compliance.filter(
      (r) =>
        r.category === 'Work Pass' &&
        r.daysRemaining !== null &&
        r.daysRemaining > 30 &&
        r.daysRemaining <= 90,
    ).length;
    const active = state.directory.filter((d) => d.status !== 'Resigned');
    const bcaIds = new Set(
      state.documents
        .filter(
          (d) =>
            d.category === 'Certification' &&
            /bca|coretrade|csoc/i.test(`${d.name} ${d.fileName}`),
        )
        .map((d) => d.employeeId),
    );
    const bcaCertified = active.filter((d) => bcaIds.has(d.employeeId)).length;
    return {
      momReadinessPct: mom.length === 0 ? 100 : Math.round((momOk / mom.length) * 100),
      criticalPasses,
      window30to90,
      bcaCertified,
      bcaCoveragePct:
        active.length === 0 ? 0 : Math.round((bcaCertified / active.length) * 100),
      openChecklist: state.compliance.filter(
        (r) =>
          r.status === 'Pending Review' ||
          r.status === 'Missing' ||
          r.status === 'Expiring' ||
          r.status === 'Expired',
      ).length,
      overdue: state.compliance.filter((r) => r.status === 'Expired').length,
      pending: state.compliance.filter(
        (r) => r.status === 'Pending Review' || r.status === 'Missing',
      ).length,
    };
  });

  readonly workrightChecklist = computed(() => {
    const state = this.hr.workforce();
    const docs = state.documents;
    const payslipsOk = state.payslips.length > 0 ? 100 : 0;
    const ketDocs = docs.filter((d) => /ket|employment term|contract/i.test(d.name));
    const ketPct =
      ketDocs.length === 0
        ? 0
        : Math.round(
            (ketDocs.filter((d) => d.status === 'Verified').length / ketDocs.length) * 100,
          );
    const bankOk =
      state.bankRequests.filter((b) => b.status === 'Approved').length > 0 ||
      Object.values(state.profiles).some((p) => !!p.bankAccountNumber)
        ? 100
        : 40;
    const cpfDemo = 100; // demo evidence only — no CPF filing integration
    const otAlerts = state.attendance.filter((a) => a.otHours > 0).length;
    const otPct = otAlerts === 0 ? 100 : Math.max(40, 100 - otAlerts * 10);
    return [
      {
        id: 'payslips',
        label: 'Itemised payslips',
        detail: 'Evidence: published payslip records in store',
        pct: payslipsOk,
      },
      {
        id: 'ket',
        label: 'Key Employment Terms (KET)',
        detail: 'Evidence: verified contract / KET documents',
        pct: ketPct,
      },
      {
        id: 'bank',
        label: 'Direct bank / GIRO details',
        detail: 'Evidence: bank details on profile or approved bank request',
        pct: bankOk,
      },
      {
        id: 'cpf',
        label: 'CPF contribution tracking',
        detail: 'Placeholder — no live CPF Board integration in this build',
        pct: cpfDemo,
      },
      {
        id: 'ot',
        label: 'Monthly overtime watch',
        detail: `${otAlerts} attendance row(s) with OT hours (demo alert)`,
        pct: otPct,
      },
    ];
  });

  readonly bcaMatrix = computed(() => {
    const state = this.hr.workforce();
    return state.projects
      .filter((p) => p.status === 'Active')
      .map((p) => {
        const allocated = state.allocations.filter(
          (a) => a.projectId === p.id && a.status === 'Active',
        ).length;
        const gap = Math.max(0, p.plannedHeadcount - allocated);
        return {
          projectId: p.id,
          projectName: p.name,
          site: p.site,
          requiredCerts: p.requiredCerts,
          planned: p.plannedHeadcount,
          allocated,
          gap,
        };
      });
  });

  readonly passPipeline = computed(() => {
    const bucket = this.passBucket();
    return this.hr.workforce().compliance.filter((row) => {
      if (row.category !== 'Work Pass') {
        return false;
      }
      const days = row.daysRemaining;
      if (bucket === 'all') {
        return true;
      }
      if (days === null) {
        return bucket === 'critical';
      }
      if (bucket === 'critical') {
        return days <= 30;
      }
      if (bucket === 'mid') {
        return days > 30 && days <= 90;
      }
      return days > 90;
    });
  });

  readonly passBucketCount = computed(() => this.passPipeline().length);

  readonly filtered = computed(() =>
    this.hr.workforce().compliance.filter((row) => {
      const agencyOk = this.agency() === 'All' || row.agency === this.agency();
      const statusOk = this.statusFilter() === 'All' || row.status === this.statusFilter();
      return agencyOk && statusOk;
    }),
  );

  readonly flagged = computed(() =>
    this.filtered().filter(
      (row) =>
        row.status === 'Expiring' ||
        row.status === 'Expired' ||
        row.status === 'Missing' ||
        row.status === 'Pending Review',
    ),
  );

  readonly columns: DataTableColumn<ComplianceWatchItem>[] = [
    { key: 'employeeName', label: 'Employee', sortable: true },
    {
      key: 'agency',
      label: 'Agency',
      format: (row) => row.agency ?? '—',
      sortable: true,
    },
    { key: 'category', label: 'Category', sortable: true },
    { key: 'reference', label: 'Reference' },
    {
      key: 'checklistItem',
      label: 'Checklist',
      format: (row) => row.checklistItem ?? '—',
    },
    {
      key: 'expiryDate',
      label: 'Expiry',
      format: (row) => formatSgDate(row.expiryDate),
    },
    {
      key: 'daysRemaining',
      label: 'Days left',
      align: 'center',
      format: (row) => (row.daysRemaining === null ? '—' : String(row.daysRemaining)),
      sortable: true,
    },
    {
      key: 'status',
      label: 'Status',
      badge: (row) => ({
        label: row.status,
        tone:
          row.status === 'Ok'
            ? 'success'
            : row.status === 'Expiring' || row.status === 'Missing' || row.status === 'Pending Review'
              ? 'warning'
              : 'danger',
      }),
    },
  ];

  readonly agencyOptions: Array<'All' | ComplianceAgency> = ['All', 'MOM', 'ICA', 'Internal'];
  readonly statusOptions = [
    'All',
    'Ok',
    'Expiring',
    'Expired',
    'Missing',
    'Pending Review',
  ];

  ngOnInit(): void {
    this.hr.getMasterSnapshot().subscribe(() => this.loading.set(false));
  }

  remind(item: ComplianceWatchItem): void {
    const ok = this.workforce.sendRenewalReminder(item.id);
    if (ok) {
      this.toast.success(
        'Reminder sent',
        `Renewal notification queued for ${item.employeeName} (synced to employee inbox).`,
      );
    } else {
      this.toast.danger('Reminder', 'Unable to queue reminder for this item.');
    }
  }

  verify(item: ComplianceWatchItem, approve: boolean): void {
    const ok = this.workforce.verifyComplianceItem(
      item.id,
      approve,
      this.commentDraft() || (approve ? 'Verified by HR (demo)' : 'Needs employee re-upload'),
    );
    if (ok) {
      this.toast.success(
        approve ? 'Verified' : 'Sent back',
        `${item.category} · ${item.employeeName}`,
      );
      this.commentDraft.set('');
    } else {
      this.toast.danger('Compliance', 'Item not found in shared store.');
    }
  }
}
