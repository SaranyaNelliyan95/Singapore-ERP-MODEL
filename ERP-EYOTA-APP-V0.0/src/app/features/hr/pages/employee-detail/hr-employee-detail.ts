import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StaffDirectoryRow } from '../../../../core/models/hr.model';
import { EmployeeMockService } from '../../../../core/services/employee-mock.service';
import { HrMockService } from '../../../../core/services/hr-mock.service';
import { ToastService } from '../../../../core/services/toast.service';
import { formatSgDate, formatSgPhone, maskNricOrFin } from '../../../../core/utils/singapore.utils';
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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly employeeId = signal('');
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
    });
  }

  projectLabel(projectId: string | null | undefined): string {
    if (!projectId) {
      return 'Unassigned';
    }
    return this.hr.workforce().projects.find((p) => p.id === projectId)?.name ?? projectId;
  }

  openEdit(): void {
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

  saveEdit(): void {
    this.editForm.markAllAsTouched();
    if (this.editForm.invalid) {
      this.toast.warning('Validation', 'Fix required fields before saving.');
      return;
    }
    const v = this.editForm.getRawValue();
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
    const status = this.statusForm.getRawValue().status;
    const ok = this.workforce.setEmployeeLifecycleStatus(this.employeeId(), status);
    if (ok) {
      this.toast.success('Status updated', `${this.employeeId()} → ${status}`);
    } else {
      this.toast.danger('Status', 'Unable to update lifecycle status.');
    }
  }
}
