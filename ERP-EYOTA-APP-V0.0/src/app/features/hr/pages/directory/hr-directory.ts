import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { DataTableColumn, EmploymentPassType, WorkLocation } from '../../../../core/models/common.model';
import { StaffDirectoryRow } from '../../../../core/models/hr.model';
import { EmployeeApiService, EmployeeDto } from '../../../../core/services/employee-api.service';
import { EnrollmentApiService } from '../../../../core/services/enrollment-api.service';
import { EmployeeMockService } from '../../../../core/services/employee-mock.service';
import { HrMockService } from '../../../../core/services/hr-mock.service';
import { ToastService } from '../../../../core/services/toast.service';
import { formatSgDate, formatSgPhone, maskNricOrFin } from '../../../../core/utils/singapore.utils';
import { environment } from '../../../../../environments/environment';
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
  private readonly employeeApi = inject(EmployeeApiService);
  private readonly enrollmentApi = inject(EnrollmentApiService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  readonly toast = inject(ToastService);

  readonly useBackend = environment.useBackendApi;
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly apiRows = signal<StaffDirectoryRow[]>([]);
  readonly lastOtpPreview = signal<string | null>(null);
  readonly department = signal<string>('All');
  readonly designation = signal<string>('All');
  readonly status = signal<string>('All');
  readonly passType = signal<string>('All');
  readonly location = signal<string>('All');
  readonly branch = signal<string>('All');
  readonly project = signal<string>('All');
  readonly formOpen = signal(false);
  readonly editId = signal<string | null>(null);

  readonly mgmt = this.hr.managementStats;

  readonly departments = computed(() => [
    'All',
    ...new Set([
      ...this.hr.workforce().directory.map((row) => row.department),
      ...this.hr.workforce().policies.departments,
    ]),
  ]);

  readonly designations = computed(() => [
    'All',
    ...new Set(this.hr.workforce().directory.map((row) => row.designation)),
  ]);

  readonly branches = computed(() => [
    'All',
    ...new Set([
      ...this.hr.workforce().directory.map((row) => row.branch ?? ''),
      ...this.hr.workforce().policies.branches,
    ].filter(Boolean)),
  ]);

  readonly projects = computed(() => [
    { id: 'All', name: 'All projects' },
    ...this.hr.workforce().projects.map((p) => ({ id: p.id, name: p.name })),
  ]);

  readonly filtered = computed(() => {
    const source = this.useBackend ? this.apiRows() : this.hr.workforce().directory;
    return source.filter((row) => {
      const deptOk = this.department() === 'All' || row.department === this.department();
      const desOk = this.designation() === 'All' || row.designation === this.designation();
      const statusOk = this.status() === 'All' || row.status === this.status();
      const passOk = this.passType() === 'All' || row.employmentType === this.passType();
      const locOk = this.location() === 'All' || row.workLocation === this.location();
      const branchOk = this.branch() === 'All' || row.branch === this.branch();
      const projectOk =
        this.project() === 'All' ||
        (this.project() === 'Unassigned' && !row.projectId) ||
        row.projectId === this.project();
      return deptOk && desOk && statusOk && passOk && locOk && branchOk && projectOk;
    });
  });

  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    workEmail: ['', [Validators.required, Validators.email]],
    department: ['', Validators.required],
    designation: ['', Validators.required],
    employmentType: ['Local' as EmploymentPassType, Validators.required],
    workLocation: ['Office' as WorkLocation, Validators.required],
    branch: ['HQ — Paya Lebar', Validators.required],
    projectId: [''],
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
      key: 'branch',
      label: 'Branch',
      format: (row) => row.branch ?? '—',
      sortable: true,
    },
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
          row.status === 'Active'
            ? 'success'
            : row.status === 'On Leave' || row.status === 'Probation'
              ? 'warning'
              : row.status === 'Notice'
                ? 'info'
                : 'neutral',
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
  readonly statusOptions: StaffDirectoryRow['status'][] = [
    'Active',
    'Probation',
    'On Leave',
    'Notice',
    'Resigned',
  ];
  readonly statusFilters = ['All', ...this.statusOptions];

  ngOnInit(): void {
    if (this.useBackend) {
      void this.reloadApiDirectory();
    } else {
      this.hr.getMasterSnapshot().subscribe(() => this.loading.set(false));
    }
  }

  private async reloadApiDirectory(): Promise<void> {
    this.loading.set(true);
    try {
      const list = await firstValueFrom(this.employeeApi.list());
      this.apiRows.set(list.map((e) => this.mapEmployeeDto(e)));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load employees';
      this.toast.danger('Directory API', message);
    } finally {
      this.loading.set(false);
    }
  }

  private mapEmployeeDto(e: EmployeeDto): StaffDirectoryRow {
    const statusMap: Record<string, StaffDirectoryRow['status']> = {
      ACTIVE: 'Active',
      PROBATION: 'Probation',
      NOTICE: 'Notice',
      RESIGNED: 'Resigned',
      TERMINATED: 'Resigned',
    };
    const locMap: Record<string, WorkLocation> = {
      OFFICE: 'Office',
      HYBRID: 'Office',
      REMOTE: 'WFH',
      SITE: 'Site',
    };
    return {
      employeeId: e.employeeCode,
      fullName: e.fullName,
      designation: e.designation ?? '—',
      department: e.department ?? '—',
      branch: '—',
      nricOrFin: '—',
      employmentType: 'Local',
      workLocation: locMap[e.workLocationMode] ?? 'Office',
      mobile: e.mobile ?? '',
      passExpiry: null,
      contractExpiry: null,
      passportExpiry: null,
      medicalClearance: 'Missing',
      status: statusMap[e.employmentStatus] ?? 'Active',
      dateOfJoining: e.dateOfJoining ?? '',
      projectId: null,
    };
  }

  projectName(projectId: string | null | undefined): string {
    if (!projectId) {
      return 'Unassigned';
    }
    return this.hr.workforce().projects.find((p) => p.id === projectId)?.name ?? projectId;
  }

  openCreate(): void {
    this.editId.set(null);
    this.lastOtpPreview.set(null);
    const depts = this.hr.workforce().policies.departments;
    const branches = this.hr.workforce().policies.branches;
    this.form.reset({
      fullName: '',
      workEmail: '',
      department: depts[0] ?? 'Projects',
      designation: '',
      employmentType: 'Local',
      workLocation: 'Office',
      branch: branches[0] ?? 'HQ — Paya Lebar',
      projectId: '',
      dateOfJoining: new Date().toISOString().slice(0, 10),
      mobile: '',
      nricOrFin: 'S0000000A',
      status: 'Probation',
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
      branch: row.branch ?? 'HQ — Paya Lebar',
      projectId: row.projectId ?? '',
      dateOfJoining: row.dateOfJoining ?? profile?.dateOfJoining ?? new Date().toISOString().slice(0, 10),
      mobile: row.mobile,
      nricOrFin: row.nricOrFin,
      status: row.status,
    });
    this.formOpen.set(true);
  }

  openDetail(row: StaffDirectoryRow): void {
    void this.router.navigate(['/hr/master/directory', row.employeeId]);
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
    if (this.useBackend && !editId) {
      void this.createViaApi(values);
      return;
    }
    if (editId) {
      const ok = this.workforce.updateEmployee(editId, {
        department: values.department,
        designation: values.designation,
        employmentType: values.employmentType,
        workLocation: values.workLocation,
        status: values.status,
        mobile: values.mobile,
        branch: values.branch,
        projectId: values.projectId || null,
      });
      if (ok) {
        this.toast.success('Employee updated', `${editId} master record refreshed in shared store.`);
      } else {
        this.toast.danger('Update failed', 'Employee profile not found in shared store.');
        return;
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
      this.workforce.updateEmployee(row.employeeId, {
        branch: values.branch,
        projectId: values.projectId || null,
        status: 'Probation',
      });
      this.toast.success(
        'Employee created',
        `${row.employeeId} · ${row.fullName} added to directory (demo).`,
      );
    }
    this.closeForm();
  }

  private async createViaApi(values: ReturnType<typeof this.form.getRawValue>): Promise<void> {
    this.saving.set(true);
    const employeeCode = `EY-${Date.now().toString().slice(-6)}`;
    const workLocationMode =
      values.workLocation === 'Site' ? 'SITE' : values.workLocation === 'WFH' ? 'REMOTE' : 'OFFICE';
    try {
      const enrolled = await firstValueFrom(
        this.enrollmentApi.enroll({
          employeeCode,
          fullName: values.fullName,
          workEmail: values.workEmail.trim().toLowerCase(),
          department: values.department,
          designation: values.designation,
          employmentType: 'FULL_TIME',
          employmentStatus: 'PROBATION',
          workLocationMode,
          dateOfJoining: values.dateOfJoining,
          mobile: values.mobile,
        }),
      );
      this.lastOtpPreview.set(enrolled.devOtpPreview);
      const otpHint = enrolled.devOtpPreview
        ? ` Dev OTP (local only): ${enrolled.devOtpPreview}`
        : ' OTP emailed / logged by backend.';
      this.toast.success(
        'Employee enrolled',
        `${enrolled.employeeCode} invited at ${enrolled.workEmail}.${otpHint} They must open /activate before login.`,
      );
      await this.reloadApiDirectory();
      this.closeForm();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Enrollment failed';
      this.toast.danger('Enrollment failed', message);
    } finally {
      this.saving.set(false);
    }
  }
}
