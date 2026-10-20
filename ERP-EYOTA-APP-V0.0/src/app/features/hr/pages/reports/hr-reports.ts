import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ComplianceWatchItem, StaffDirectoryRow } from '../../../../core/models/hr.model';
import { HrMockService } from '../../../../core/services/hr-mock.service';
import { ToastService } from '../../../../core/services/toast.service';
import { formatSgDate } from '../../../../core/utils/singapore.utils';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';
import { DemoNoticeComponent } from '../../../employee/shared/demo-notice';

@Component({
  selector: 'app-hr-reports',
  standalone: true,
  imports: [LoadingSpinnerComponent, DemoNoticeComponent],
  templateUrl: './hr-reports.html',
  styleUrl: './hr-reports.css',
})
export class HrReportsPage implements OnInit {
  readonly hr = inject(HrMockService);
  readonly toast = inject(ToastService);

  readonly loading = signal(true);

  readonly foreignWorkerCount = computed(() => this.hr.stats().foreignCount);

  readonly expiringPasses = computed(() =>
    this.hr
      .workforce()
      .compliance.filter(
        (row) =>
          row.category === 'Work Pass' &&
          (row.status === 'Expiring' || row.status === 'Expired'),
      ).length,
  );

  readonly pendingDocs = computed(() => this.hr.stats().pendingDocuments);

  readonly medicalMissing = computed(
    () =>
      this.hr.workforce().directory.filter((row) => row.medicalClearance === 'Missing').length +
      this.hr
        .workforce()
        .compliance.filter((row) => row.category === 'Medical' && row.status === 'Missing').length,
  );

  ngOnInit(): void {
    this.hr.getMasterSnapshot().subscribe(() => this.loading.set(false));
  }

  generateWorkrightPack(): void {
    const csv = this.complianceToCsv(this.hr.workforce().compliance);
    this.downloadCsv(csv, 'mom-workright-inspection-pack-demo.csv');
    this.toast.success(
      'Workright pack generated',
      'Simulated MOM Workright Inspection Centre CSV downloaded locally — not submitted to MOM.',
    );
  }

  exportDirectory(): void {
    const csv = this.directoryToCsv(this.hr.workforce().directory);
    this.downloadCsv(csv, 'eyota-staff-directory-demo.csv');
    this.toast.success('Directory exported', 'Staff master CSV downloaded locally (demo).');
  }

  private complianceToCsv(rows: ComplianceWatchItem[]): string {
    const header = [
      'Employee ID',
      'Employee Name',
      'Category',
      'Reference',
      'Expiry Date',
      'Days Remaining',
      'Status',
    ];
    const lines = rows.map((row) =>
      [
        this.escapeCsv(row.employeeId),
        this.escapeCsv(row.employeeName),
        this.escapeCsv(row.category),
        this.escapeCsv(row.reference),
        this.escapeCsv(row.expiryDate ?? ''),
        row.daysRemaining === null ? '' : String(row.daysRemaining),
        this.escapeCsv(row.status),
      ].join(','),
    );
    return [header.join(','), ...lines].join('\n');
  }

  private directoryToCsv(rows: StaffDirectoryRow[]): string {
    const header = [
      'Employee ID',
      'Full Name',
      'Department',
      'Designation',
      'Pass Type',
      'Work Location',
      'Status',
      'Pass Expiry',
      'Medical Clearance',
    ];
    const lines = rows.map((row) =>
      [
        this.escapeCsv(row.employeeId),
        this.escapeCsv(row.fullName),
        this.escapeCsv(row.department),
        this.escapeCsv(row.designation),
        this.escapeCsv(row.employmentType),
        this.escapeCsv(row.workLocation),
        this.escapeCsv(row.status),
        this.escapeCsv(row.passExpiry ? formatSgDate(row.passExpiry) : ''),
        this.escapeCsv(row.medicalClearance),
      ].join(','),
    );
    return [header.join(','), ...lines].join('\n');
  }

  private escapeCsv(value: string): string {
    if (/[",\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private downloadCsv(csv: string, fileName: string): void {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
