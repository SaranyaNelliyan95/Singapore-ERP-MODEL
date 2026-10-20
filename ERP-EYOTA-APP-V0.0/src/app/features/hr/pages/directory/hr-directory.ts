import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DataTableColumn, EmploymentPassType, WorkLocation } from '../../../../core/models/common.model';
import { StaffDirectoryRow } from '../../../../core/models/hr.model';
import { EmployeeMockService } from '../../../../core/services/employee-mock.service';
import { HrMockService } from '../../../../core/services/hr-mock.service';
import { ToastService } from '../../../../core/services/toast.service';
import { formatSgDate, formatSgPhone, maskNricOrFin } from '../../../../core/utils/singapore.utils';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';
import { DemoNoticeComponent } from '../../../employee/shared/demo-notice';

@Component({
  selector: 'app-hr-directory',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    DataTableComponent,
    LoadingSpinnerComponent,
    DemoNoticeComponent,
  ],
  templateUrl: './hr-directory.html',
  styleUrl: './hr-directory.css',
})
export class HrDirectoryPage implements OnInit {
  readonly hr = inject(HrMockService);
  private readonly workforce = inject(EmployeeMockService);
  private readonly fb = inject(FormBuilder);
  readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly department = signal<string>('All');
  readonly passType = signal<string>('All');
  readonly location = signal<string>('All');
  readonly formOpen = signal(false);
  readonly editId = signal<string | null>(null);

  readonly departments = computed(() => [
    'All',
    ...new Set([
      ...this.hr.workforce().directory.map((row) => row.department),
      ...this.hr.workforce().policies.departments,
    ]),
  ]);

  readonly filtered = computed(() => {
    return this.hr.workforce().directory.filter((row) => {
      const deptOk = this.department() === 'All' || row.department === this.department();
      const passOk = this.passType() === 'All' || row.employmentType === this.passType();
      const locOk = this.location() === 'All' || row.workLocation === this.location();
      return deptOk && passOk && locOk;
    });
  });

  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    department: ['', Validators.required],
    designation: ['', Validators.required],
    employmentType: ['Local' as EmploymentPassType, Validators.required],
    workLocation: ['Office' as WorkLocation, Validators.required],
    dateOfJoining: ['', Validators.required],
    mobile: ['', [Validators.required, Validators.pattern(/^[89]\d{7}$/)]],
    nricOrFin: ['', [Validators.required, Validators.minLength(9)]],
    status: ['Active' as StaffDirectoryRow['status'], Validators.required],
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
  readonly employmentTypes: EmploymentPassType[] = ['Local', 'PR', 'WP', 'S Pass', 'EP'];
  readonly workLocations: WorkLocation[] = ['Office', 'Site', 'WFH'];
  readonly statusOptions: StaffDirectoryRow['status'][] = ['Active', 'On Leave', 'Resigned'];

  ngOnInit(): void {
    this.hr.getMasterSnapshot().subscribe(() => this.loading.set(false));
  }

  openCreate(): void {
    this.editId.set(null);
    const depts = this.hr.workforce().policies.departments;
    this.form.reset({
      fullName: '',
      department: depts[0] ?? 'Projects',
      designation: '',
      employmentType: 'Local',
      workLocation: 'Office',
      dateOfJoining: new Date().toISOString().slice(0, 10),
      mobile: '',
      nricOrFin: '',
      status: 'Active',
    });
    this.formOpen.set(true);
  }

  openEdit(row: StaffDirectoryRow): void {
    this.editId.set(row.employeeId);
    const profile = this.hr.workforce().profiles[row.employeeId];
    this.form.reset({
      fullName: row.fullName,
      department: row.department,
      designation: row.designation,
      employmentType: row.employmentType,
      workLocation: row.workLocation,
      dateOfJoining: profile?.dateOfJoining ?? new Date().toISOString().slice(0, 10),
      mobile: row.mobile,
      nricOrFin: row.nricOrFin,
      status: row.status,
    });
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editId.set(null);
  }

  saveEmployee(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.toast.warning('Employee form', 'Complete required fields with valid SG mobile and NRIC/FIN.');
      return;
    }
    const values = this.form.getRawValue();
    const editId = this.editId();
    if (editId) {
      const ok = this.workforce.updateEmployee(editId, {
        department: values.department,
        designation: values.designation,
        employmentType: values.employmentType,
        workLocation: values.workLocation,
        status: values.status,
        mobile: values.mobile,
      });
      if (ok) {
        this.toast.success('Employee updated', `${editId} master record refreshed in shared store.`);
      }
    } else {
      const row = this.workforce.createEmployee({
        fullName: values.fullName,
        department: values.department,
        designation: values.designation,
        employmentType: values.employmentType,
        workLocation: values.workLocation,
        dateOfJoining: values.dateOfJoining,
        mobile: values.mobile,
        nricOrFin: values.nricOrFin.toUpperCase(),
      });
      this.toast.success(
        'Employee created',
        `${row.employeeId} · ${row.fullName} added to directory (demo).`,
      );
    }
    this.closeForm();
  }
}
