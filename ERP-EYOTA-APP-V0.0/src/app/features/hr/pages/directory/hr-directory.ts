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
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal/confirm-modal';
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
    ConfirmModalComponent,
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
  readonly pdfBusyId = signal<string | null>(null);
  readonly apiRows = signal<StaffDirectoryRow[]>([]);
  readonly lastOtpPreview = signal<string | null>(null);
  readonly statusTarget = signal<StaffDirectoryRow | null>(null);
  readonly deleteTarget = signal<StaffDirectoryRow | null>(null);
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
    department: [''],
    designation: ['', Validators.required],
    apiEmploymentType: ['FULL_TIME' as 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'TEMPORARY', Validators.required],
    employmentType: ['Local' as EmploymentPassType, Validators.required],
    workLocation: ['Office' as WorkLocation, Validators.required],
    branch: ['HQ — Paya Lebar', Validators.required],
    projectId: [''],
    dateOfJoining: ['', Validators.required],
    mobile: ['', [Validators.required, Validators.pattern(/^[89]\d{7}$/)]],
    nricOrFin: [''],
    status: ['Active' as StaffDirectoryRow['status'], Validators.required],
  });

  readonly apiEmploymentTypes = [
    { value: 'FULL_TIME', label: 'Full-time' },
    { value: 'PART_TIME', label: 'Part-time' },
    { value: 'CONTRACT', label: 'Contract' },
    { value: 'TEMPORARY', label: 'Temporary' },
  ] as const;

  readonly columns: DataTableColumn<StaffDirectoryRow>[] = [
    {
      key: 'detailsExport',
      label: 'Import',
      width: '88px',
      align: 'center',
      format: () => '',
      actions: (row) => [
        {
          id: 'download-pdf',
          label: '⬇ Dossier',
          tone: 'primary',
          disabled:
            this.saving() ||
            this.pdfBusyId() === (row.apiId ?? row.employeeId) ||
            (this.useBackend && !row.apiId),
        },
      ],
    },
    { key: 'employeeId', label: 'Employee ID', sortable: true },
    { key: 'fullName', label: 'Full name', sortable: true },
    { key: 'designation', label: 'Designation', sortable: true },
    {
      key: 'workEmail',
      label: 'Email',
      format: (row) => row.workEmail ?? '—',
      sortable: true,
    },
    {
      key: 'dateOfJoining',
      label: 'Joined',
      format: (row) => formatSgDate(row.dateOfJoining ?? null),
      sortable: true,
    },
    { key: 'department', label: 'Department', sortable: true },
    {
      key: 'employmentTypeLabel',
      label: 'Employment type',
      format: (row) => row.employmentTypeLabel ?? row.employmentType,
      sortable: true,
    },
    {
      key: 'mobile',
      label: 'Mobile',
      format: (row) => formatSgPhone(row.mobile),
    },
    {
      key: 'status',
      label: 'Employment',
      badge: (row) => ({
        label: row.status,
        tone:
          row.status === 'Active'
            ? 'success'
            : row.status === 'On Leave' || row.status === 'Probation' || row.status === 'Pending'
              ? 'warning'
              : row.status === 'Notice'
                ? 'info'
                : 'neutral',
      }),
    },
    {
      key: 'invitationEmailStatus',
      label: 'Invitation',
      format: (row) => this.invitationLabel(row),
      badge: (row) => {
        const label = this.invitationLabel(row);
        const tone =
          label === 'Account Activated' || label === 'Accepted' || label === 'Sent'
            ? 'success'
            : label === 'Failed'
              ? 'danger'
              : 'warning';
        return { label, tone };
      },
    },
    {
      key: 'accountStatus',
      label: 'Account',
      format: (row) => this.accountLabel(row),
    },
    {
      key: 'loginActive',
      label: 'Actions',
      width: '88px',
      align: 'center',
      format: () => '',
      actionsAsMenu: true,
      actions: (row) => this.rowMenuActions(row),
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
    'Pending',
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
      PENDING: 'Pending',
      ACTIVE: 'Active',
      PROBATION: 'Probation',
      NOTICE: 'Notice',
      ON_LEAVE: 'On Leave',
      RESIGNED: 'Resigned',
      TERMINATED: 'Resigned',
    };
    const typeLabel: Record<string, string> = {
      FULL_TIME: 'Full-time',
      PART_TIME: 'Part-time',
      CONTRACT: 'Contract',
      TEMPORARY: 'Temporary',
      INTERN: 'Intern',
    };
    const locMap: Record<string, WorkLocation> = {
      OFFICE: 'Office',
      HYBRID: 'Office',
      REMOTE: 'WFH',
      SITE: 'Site',
    };
    return {
      employeeId: e.employeeCode,
      apiId: e.id,
      fullName: e.fullName,
      designation: e.designation ?? '—',
      department: e.department ?? '—',
      branch: '—',
      nricOrFin: e.finNumber ?? '—',
      employmentType: 'Local',
      employmentTypeLabel: typeLabel[e.employmentType] ?? e.employmentType,
      workLocation: locMap[e.workLocationMode] ?? 'Office',
      mobile: e.mobile ?? '',
      passExpiry: e.workPassExpiry,
      contractExpiry: null,
      passportExpiry: e.passportExpiry,
      medicalClearance: 'Missing',
      status: statusMap[e.employmentStatus] ?? 'Pending',
      dateOfJoining: e.dateOfJoining ?? '',
      projectId: null,
      workEmail: e.personalEmail ?? undefined,
      invitationEmailStatus: e.invitationEmailStatus,
      accountStatus: e.accountStatus,
      loginActive: e.active,
      detailsExport: 'PDF',
    };
  }

  accountLabel(row: StaffDirectoryRow): string {
    const s = (row.accountStatus ?? '').toUpperCase();
    if (s === 'ACTIVE') {
      return 'Activated';
    }
    if (s === 'INACTIVE') {
      return 'Inactive';
    }
    return 'Pending activation';
  }

  invitationLabel(row: StaffDirectoryRow): string {
    if (row.accountStatus === 'ACTIVE') {
      return 'Account Activated';
    }
    const s = (row.invitationEmailStatus ?? 'NOT_SENT').toUpperCase();
    switch (s) {
      case 'SENT':
        return 'Sent';
      case 'FAILED':
        return 'Failed';
      case 'SENDING':
        return 'Sending';
      case 'ACCEPTED':
        return 'Accepted';
      case 'EXPIRED':
        return 'Expired';
      default:
        return 'Not Sent';
    }
  }

  canResendInvitation(row: StaffDirectoryRow): boolean {
    // Pending employment + account not yet activated — HR can (re)send the invitation email.
    return (
      this.useBackend &&
      !!row.apiId &&
      row.status === 'Pending' &&
      row.accountStatus !== 'ACTIVE' &&
      row.invitationEmailStatus !== 'ACCEPTED'
    );
  }

  rowMenuActions(row: StaffDirectoryRow) {
    const actions: Array<{
      id: string;
      label: string;
      tone?: 'primary' | 'ghost' | 'danger';
      disabled?: boolean;
    }> = [
      { id: 'view-detail', label: `View ${row.employeeId}` },
      { id: 'edit-employee', label: 'Edit' },
      {
        id: 'download-pdf',
        label: 'Export Dossier',
        tone: 'primary',
        disabled:
          this.saving() ||
          this.pdfBusyId() === (row.apiId ?? row.employeeId) ||
          (this.useBackend && !row.apiId),
      },
    ];

    if (this.canResendInvitation(row)) {
      actions.push({
        id: 'resend-invitation',
        label: this.invitationActionLabel(row),
        tone: 'primary',
        disabled: this.saving(),
      });
    }

    if (this.useBackend && row.apiId) {
      actions.push(
        {
          id: 'toggle-status',
          label: row.loginActive ? 'Set Inactive' : 'Set Active',
          tone: row.loginActive ? 'danger' : 'primary',
          disabled: this.saving(),
        },
        {
          id: 'delete-employee',
          label: 'Delete',
          tone: 'danger',
          disabled: this.saving(),
        },
      );
    }

    return actions;
  }

  onDirectoryCellAction(event: { actionId: string; row: StaffDirectoryRow }): void {
    if (event.actionId === 'view-detail') {
      this.openDetail(event.row);
    } else if (event.actionId === 'edit-employee') {
      this.openEdit(event.row);
    } else if (event.actionId === 'resend-invitation') {
      void this.resendInvitation(event.row);
    } else if (event.actionId === 'toggle-status') {
      this.statusTarget.set(event.row);
    } else if (event.actionId === 'delete-employee') {
      this.deleteTarget.set(event.row);
    } else if (event.actionId === 'download-pdf') {
      void this.downloadProfilePdf(event.row);
    }
  }

  async downloadProfilePdf(row: StaffDirectoryRow): Promise<void> {
    const id = row.apiId;
    if (!this.useBackend || !id) {
      this.toast.warning('PDF export', 'Enable API mode and reload the directory to export profiles.');
      return;
    }
    this.pdfBusyId.set(id);
    try {
      const blob = await firstValueFrom(this.employeeApi.exportDossier(id, 'COMPLETE'));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `EYOTA_${row.employeeId}_Master_Dossier_COMPLETE.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      this.toast.success('Dossier ready', `${row.employeeId} Employee Master Dossier downloaded.`);
    } catch (err) {
      this.toast.danger('Dossier export', err instanceof Error ? err.message : 'Failed to generate PDF');
    } finally {
      this.pdfBusyId.set(null);
    }
  }

  confirmStatusToggle(): void {
    const row = this.statusTarget();
    this.statusTarget.set(null);
    if (!row?.apiId) {
      return;
    }
    void this.toggleLoginStatus(row);
  }

  confirmDelete(): void {
    const row = this.deleteTarget();
    this.deleteTarget.set(null);
    if (!row?.apiId) {
      return;
    }
    void this.deleteEmployee(row);
  }

  private async toggleLoginStatus(row: StaffDirectoryRow): Promise<void> {
    this.saving.set(true);
    try {
      const updated = await firstValueFrom(
        this.employeeApi.setStatus(row.apiId!, !row.loginActive),
      );
      this.apiRows.update((rows) =>
        rows.map((r) => (r.apiId === row.apiId ? this.mapEmployeeDto(updated) : r)),
      );
      this.toast.success(
        'Status updated',
        `${updated.employeeCode} is now ${updated.active ? 'Active' : 'Inactive'}.`,
      );
    } catch (err) {
      this.toast.danger('Status update', err instanceof Error ? err.message : 'Failed');
    } finally {
      this.saving.set(false);
    }
  }

  private async deleteEmployee(row: StaffDirectoryRow): Promise<void> {
    this.saving.set(true);
    try {
      await firstValueFrom(this.employeeApi.delete(row.apiId!));
      this.apiRows.update((rows) => rows.filter((r) => r.apiId !== row.apiId));
      this.toast.success(
        'Employee deleted',
        `${row.employeeId} and related records were removed. You can re-enrol to retest OTP.`,
      );
    } catch (err) {
      this.toast.danger('Delete failed', err instanceof Error ? err.message : 'Failed');
    } finally {
      this.saving.set(false);
    }
  }

  invitationActionLabel(row: StaffDirectoryRow): string {
    const status = (row.invitationEmailStatus ?? 'NOT_SENT').toUpperCase();
    if (
      !row.invitationEmailStatus ||
      status === 'NOT_SENT' ||
      status === 'PENDING' ||
      status === 'FAILED'
    ) {
      return 'Send invitation';
    }
    return 'Resend invitation';
  }

  projectName(projectId: string | null | undefined): string {
    if (!projectId) {
      return 'Unassigned';
    }
    return this.hr.workforce().projects.find((p) => p.id === projectId)?.name ?? projectId;
  }

  openCreate(): void {
    if (this.useBackend) {
      void this.router.navigateByUrl('/hr/master/employees/new');
      return;
    }
    this.editId.set(null);
    this.lastOtpPreview.set(null);
    const depts = this.hr.workforce().policies.departments;
    const branches = this.hr.workforce().policies.branches;
    this.form.reset({
      fullName: '',
      workEmail: '',
      department: depts[0] ?? '',
      designation: '',
      apiEmploymentType: 'FULL_TIME',
      employmentType: 'Local',
      workLocation: 'Office',
      branch: branches[0] ?? 'HQ — Paya Lebar',
      projectId: '',
      dateOfJoining: new Date().toISOString().slice(0, 10),
      mobile: '',
      nricOrFin: '',
      status: 'Pending',
    });
    this.formOpen.set(true);
  }

  openEdit(row: StaffDirectoryRow): void {
    if (this.useBackend && row.apiId) {
      void this.router.navigate(['/hr/master/employees', row.apiId, 'edit']);
      return;
    }
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
    const id = row.apiId ?? row.employeeId;
    void this.router.navigate(['/hr/master/directory', id]);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editId.set(null);
  }

  saveEmployee(): void {
    this.form.markAllAsTouched();
    const values = this.form.getRawValue();
    const editId = this.editId();
    if (this.useBackend && !editId) {
      void this.router.navigateByUrl('/hr/master/employees/new');
      return;
    }
    if (this.form.invalid) {
      this.toast.warning('Employee form', 'Complete required fields with valid SG mobile.');
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

  async resendInvitation(row: StaffDirectoryRow): Promise<void> {
    if (!row.apiId) {
      this.toast.warning('Resend', 'API employee id missing — reload the directory.');
      return;
    }
    this.saving.set(true);
    try {
      const enrolled = await firstValueFrom(this.enrollmentApi.resendInvitation(row.apiId));
      if (enrolled.invitationEmailStatus === 'FAILED') {
        this.toast.warning(
          'Invitation not delivered',
          `${enrolled.employeeCode}: ${enrolled.message}`,
        );
      } else {
        this.toast.success(
          'Invitation sent',
          `${enrolled.employeeCode}: ${enrolled.message}`,
        );
      }
      await this.reloadApiDirectory();
    } catch (err) {
      this.toast.danger('Resend failed', err instanceof Error ? err.message : 'Failed');
    } finally {
      this.saving.set(false);
    }
  }

}
