import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DataTableColumn } from '../../../../core/models/common.model';
import { ComplianceWatchItem } from '../../../../core/models/hr.model';
import { EmployeeMockService } from '../../../../core/services/employee-mock.service';
import { HrMockService } from '../../../../core/services/hr-mock.service';
import { ToastService } from '../../../../core/services/toast.service';
import { formatSgDate } from '../../../../core/utils/singapore.utils';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';
import { DemoNoticeComponent } from '../../../employee/shared/demo-notice';

@Component({
  selector: 'app-hr-compliance',
  standalone: true,
  imports: [DataTableComponent, LoadingSpinnerComponent, DemoNoticeComponent],
  templateUrl: './hr-compliance.html',
  styleUrl: './hr-compliance.css',
})
export class HrCompliancePage implements OnInit {
  readonly hr = inject(HrMockService);
  private readonly workforce = inject(EmployeeMockService);
  readonly toast = inject(ToastService);

  readonly loading = signal(true);

  readonly flagged = computed(() =>
    this.hr
      .workforce()
      .compliance.filter((row) => row.status === 'Expiring' || row.status === 'Expired' || row.status === 'Missing'),
  );

  readonly columns: DataTableColumn<ComplianceWatchItem>[] = [
    { key: 'employeeName', label: 'Employee', sortable: true },
    { key: 'category', label: 'Category', sortable: true },
    { key: 'reference', label: 'Reference' },
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
            : row.status === 'Expiring' || row.status === 'Missing'
              ? 'warning'
              : 'danger',
      }),
    },
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
    }
  }
}
