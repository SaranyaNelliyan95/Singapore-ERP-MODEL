import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { StaffDirectoryRow } from '../../../../core/models/hr.model';
import {
  EmployeeApiService,
  EmployeeDto,
  PayrollReadinessResponse,
} from '../../../../core/services/employee-api.service';
import { EnrollmentApiService } from '../../../../core/services/enrollment-api.service';
import { EmployeeMockService } from '../../../../core/services/employee-mock.service';
import { HrMockService } from '../../../../core/services/hr-mock.service';
import { ToastService } from '../../../../core/services/toast.service';
import { formatSgDate, formatSgPhone, maskNricOrFin } from '../../../../core/utils/singapore.utils';
import { environment } from '../../../../../environments/environment';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge';
import { DemoNoticeComponent } from '../../../employee/shared/demo-notice';
import { SgdCurrencyPipe } from '../../../../shared/pipes/sgd-currency.pipe';

@Component({
  selector: 'app-hr-employee-detail',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    LoadingSpinnerComponent,
    StatusBadgeComponent,
    DemoNoticeComponent,
    SgdCurrencyPipe,
  ],
  templateUrl: './hr-employee-detail.html',
  styleUrl: './hr-employee-detail.css',
})
export class HrEmployeeDetailPage implements OnInit {
  readonly hr = inject(HrMockService);
  private readonly workforce = inject(EmployeeMockService);
  private readonly employeeApi = inject(EmployeeApiService);
  private readonly enrollmentApi = inject(EnrollmentApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  readonly toast = inject(ToastService);

  readonly useBackend = environment.useBackendApi;
  readonly loading = signal(true);
  readonly pdfBusy = signal(false);
  readonly pdfMode = signal<'COMPLETE' | 'EMPLOYEE_COPY' | null>(null);
  readonly employeeId = signal('');
  readonly apiEmployee = signal<EmployeeDto | null>(null);
  readonly payrollReadiness = signal<PayrollReadinessResponse | null>(null);
  readonly editOpen = signal(false);
  readonly tab = signal<'overview' | 'docs' | 'history' | 'checklist' | 'related'>('overview');

  readonly row = computed(
    () => this.hr.workforce().directory.find((r) => r.employeeId === this.employeeId()) ?? null,
  );
  readonly profile = computed(() => this.hr.workforce().profiles[this.employeeId()] ?? null);
  readonly documents = computed(() =>
    this.hr.workforce().documents.filter((d) => d.employeeId === this.employeeId()),
  );
  readonly compliance = computed(() =>
    this.hr.workforce().compliance.filter((c) => c.employeeId === this.employeeId()),
  );
  readonly leaves = computed(() =>
    this.hr.workforce().leaveRequests.filter((l) => l.employeeId === this.employeeId()),
  );
  readonly claims = computed(() =>
    this.hr.workforce().claims.filter((c) => c.employeeId === this.employeeId()),
  );
  readonly payslips = computed(() =>
    this.hr.workforce().payslips.filter((p) => p.employeeId === this.employeeId()),
  );
  readonly allocations = computed(() =>
    this.hr.workforce().allocations.filter((a) => a.employeeId === this.employeeId()),
  );
  readonly onboarding = computed(() =>
    this.hr
      .workforce()
      .onboarding.filter(
        (o) =>
          o.candidateName === this.profile()?.fullName ||
          this.row()?.status === 'Probation',
      )
      .slice(0, 1),
  );

  readonly statusForm = this.fb.nonNullable.group({
    status: ['Active' as StaffDirectoryRow['status'], Validators.required],
  });

  readonly editForm = this.fb.nonNullable.group({
    department: ['', Validators.required],
    designation: ['', Validators.required],
    workLocation: ['Office', Validators.required],
    branch: [''],
    mobile: ['', [Validators.required, Validators.pattern(/^[89]\d{7}$/)]],
    projectId: [''],
  });

  readonly statusOptions: StaffDirectoryRow['status'][] = [
    'Pending',
    'Active',
    'Probation',
    'On Leave',
    'Notice',
    'Resigned',
  ];

  readonly formatSgDate = formatSgDate;
  readonly formatSgPhone = formatSgPhone;
  readonly maskNricOrFin = maskNricOrFin;

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id') ?? '';
      this.employeeId.set(id);
      if (this.useBackend) {
        void this.loadFromApi(id);
      } else {
        this.hr.getMasterSnapshot().subscribe(() => {
          const row = this.row();
          if (!row) {
            this.toast.warning('Employee', 'Record not found — returning to directory.');
            void this.router.navigate(['/hr/master/directory']);
            return;
          }
          this.statusForm.patchValue({ status: row.status });
          this.loading.set(false);
        });
      }
    });
  }

  private async loadFromApi(id: string): Promise<void> {
    this.loading.set(true);
    try {
      const emp = await firstValueFrom(this.employeeApi.get(id));
      this.apiEmployee.set(emp);
      try {
        const ready = await firstValueFrom(this.employeeApi.payrollReadiness(id));
        this.payrollReadiness.set(ready);
      } catch {
        this.payrollReadiness.set(null);
      }
    } catch (err) {
      this.toast.danger('Employee', err instanceof Error ? err.message : 'Not found');
      void this.router.navigate(['/hr/master/directory']);
    } finally {
      this.loading.set(false);
    }
  }

  async exportDossier(mode: 'COMPLETE' | 'EMPLOYEE_COPY'): Promise<void> {
    const emp = this.apiEmployee();
    if (!emp) {
      return;
    }
    this.pdfBusy.set(true);
    this.pdfMode.set(mode);
    try {
      const blob = await firstValueFrom(this.employeeApi.exportDossier(emp.id, mode));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const tag = mode === 'COMPLETE' ? 'COMPLETE' : 'COPY';
      a.href = url;
      a.download = `EYOTA_${emp.employeeCode}_Master_Dossier_${tag}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      this.toast.success(
        'Dossier ready',
        mode === 'COMPLETE'
          ? `${emp.employeeCode} Complete Employee Dossier downloaded.`
          : `${emp.employeeCode} Employee Record Copy downloaded.`,
      );
    } catch (err) {
      this.toast.danger('Dossier export', err instanceof Error ? err.message : 'Failed to generate PDF');
    } finally {
      this.pdfBusy.set(false);
      this.pdfMode.set(null);
    }
  }

  async resendInvite(): Promise<void> {
    const emp = this.apiEmployee();
    if (!emp) {
      return;
    }
    try {
      const res = await firstValueFrom(this.enrollmentApi.resendInvitation(emp.id));
      if (res.invitationEmailStatus === 'FAILED') {
        this.toast.warning(
          'Invitation not delivered',
          `${emp.employeeCode}: ${res.message}`,
        );
      } else {
        this.toast.success(
          'Invitation sent',
          res.debugOtpPreview
            ? `Dev OTP: ${res.debugOtpPreview}`
            : `${emp.employeeCode}: ${res.message}`,
        );
      }
      await this.loadFromApi(emp.id);
    } catch (err) {
      this.toast.danger('Resend failed', err instanceof Error ? err.message : 'Failed');
    }
  }

  projectLabel(projectId: string | null | undefined): string {
    if (!projectId) {
      return 'Unassigned';
    }
    return this.hr.workforce().projects.find((p) => p.id === projectId)?.name ?? projectId;
  }

  openEdit(): void {
    if (this.useBackend) {
      const emp = this.apiEmployee();
      if (!emp) {
        return;
      }
      this.editForm.reset({
        department: emp.department ?? '',
        designation: emp.designation ?? '',
        workLocation: 'Office',
        branch: '',
        mobile: emp.mobile ?? '',
        projectId: '',
      });
      this.editOpen.set(true);
      return;
    }
    const row = this.row();
    if (!row) {
      return;
    }
    this.editForm.reset({
      department: row.department,
      designation: row.designation,
      workLocation: row.workLocation,
      branch: row.branch ?? '',
      mobile: row.mobile,
      projectId: row.projectId ?? '',
    });
    this.editOpen.set(true);
  }

  async saveEdit(): Promise<void> {
    this.editForm.markAllAsTouched();
    if (this.editForm.invalid) {
      this.toast.warning('Validation', 'Fix required fields before saving.');
      return;
    }
    const v = this.editForm.getRawValue();
    if (this.useBackend) {
      const emp = this.apiEmployee();
      if (!emp) {
        return;
      }
      try {
        const updated = await firstValueFrom(
          this.employeeApi.update(emp.id, {
            employeeCode: emp.employeeCode,
            fullName: emp.fullName,
            department: v.department,
            designation: v.designation,
            mobile: v.mobile,
            employmentType: emp.employmentType,
            employmentStatus: emp.employmentStatus,
            workLocationMode: emp.workLocationMode,
            dateOfJoining: emp.dateOfJoining,
            personalEmail: emp.personalEmail,
            active: emp.active,
          }),
        );
        this.apiEmployee.set(updated);
        this.editOpen.set(false);
        this.toast.success('Saved', 'Employee master updated in PostgreSQL.');
      } catch (err) {
        this.toast.danger('Save failed', err instanceof Error ? err.message : 'Failed');
      }
      return;
    }
    const ok = this.workforce.updateEmployee(this.employeeId(), {
      department: v.department,
      designation: v.designation,
      workLocation: v.workLocation as StaffDirectoryRow['workLocation'],
      branch: v.branch,
      mobile: v.mobile,
      projectId: v.projectId || null,
    });
    if (ok) {
      this.toast.success('Saved', 'Employee master updated.');
      this.editOpen.set(false);
    } else {
      this.toast.danger('Save failed', 'Could not update employee in shared store.');
    }
  }

  saveStatus(): void {
    if (this.useBackend) {
      this.toast.warning(
        'Status',
        'Employment status changes via HR edit API — use Edit to update designation/contact for now.',
      );
      return;
    }
    const status = this.statusForm.getRawValue().status;
    const ok = this.workforce.setEmployeeLifecycleStatus(this.employeeId(), status);
    if (ok) {
      this.toast.success('Status updated', `${this.employeeId()} → ${status}`);
    } else {
      this.toast.danger('Status', 'Unable to update lifecycle status.');
    }
  }
}
