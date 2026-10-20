import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataTableColumn, EmploymentPassType, WorkLocation } from '../../../../core/models/common.model';
import { StaffDirectoryRow } from '../../../../core/models/hr.model';
import { HrMockService } from '../../../../core/services/hr-mock.service';
import { formatSgDate, formatSgPhone, maskNricOrFin } from '../../../../core/utils/singapore.utils';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';
import { DemoNoticeComponent } from '../../../employee/shared/demo-notice';

@Component({
  selector: 'app-hr-directory',
  standalone: true,
  imports: [FormsModule, DataTableComponent, LoadingSpinnerComponent, DemoNoticeComponent],
  templateUrl: './hr-directory.html',
  styleUrl: './hr-directory.css',
})
export class HrDirectoryPage implements OnInit {
  private readonly hr = inject(HrMockService);

  readonly loading = signal(true);
  readonly department = signal<string>('All');
  readonly passType = signal<string>('All');
  readonly location = signal<string>('All');

  readonly departments = computed(() => [
    'All',
    ...new Set(this.hr.workforce().directory.map((row) => row.department)),
  ]);

  readonly filtered = computed(() => {
    return this.hr.workforce().directory.filter((row) => {
      const deptOk = this.department() === 'All' || row.department === this.department();
      const passOk = this.passType() === 'All' || row.employmentType === this.passType();
      const locOk = this.location() === 'All' || row.workLocation === this.location();
      return deptOk && passOk && locOk;
    });
  });

  readonly columns: DataTableColumn<StaffDirectoryRow>[] = [
    { key: 'employeeId', label: 'Employee ID', sortable: true },
    { key: 'fullName', label: 'Full name', sortable: true },
    { key: 'designation', label: 'Designation', sortable: true },
    { key: 'department', label: 'Department', sortable: true },
    {
      key: 'nricOrFin',
      label: 'NRIC / FIN',
      format: (row) => maskNricOrFin(row.nricOrFin),
    },
    { key: 'employmentType', label: 'Pass type', sortable: true },
    { key: 'workLocation', label: 'Location', sortable: true },
    {
      key: 'mobile',
      label: 'Mobile',
      format: (row) => formatSgPhone(row.mobile),
    },
    {
      key: 'passExpiry',
      label: 'Pass expiry',
      format: (row) => formatSgDate(row.passExpiry),
    },
    {
      key: 'status',
      label: 'Status',
      badge: (row) => ({
        label: row.status,
        tone:
          row.status === 'Active' ? 'success' : row.status === 'On Leave' ? 'warning' : 'neutral',
      }),
    },
  ];

  readonly passOptions: Array<'All' | EmploymentPassType> = [
    'All',
    'Local',
    'PR',
    'WP',
    'S Pass',
    'EP',
  ];
  readonly locationOptions: Array<'All' | WorkLocation> = ['All', 'Office', 'Site', 'WFH'];

  ngOnInit(): void {
    this.hr.getMasterSnapshot().subscribe(() => this.loading.set(false));
  }
}
