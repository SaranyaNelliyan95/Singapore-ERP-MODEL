import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  EnrollEmployeeRequest,
  EnrollmentApiService,
} from '../../../../core/services/enrollment-api.service';
import { EmployeeApiService, EmployeeDto } from '../../../../core/services/employee-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { environment } from '../../../../../environments/environment';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';
import { DemoNoticeComponent } from '../../../employee/shared/demo-notice';

const SG_MOBILE = /^[89]\d{7}$/;
const FIN_PATTERN = /^[FGMST]\d{7}[A-Z]$/i;

@Component({
  selector: 'app-hr-employee-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, LoadingSpinnerComponent, DemoNoticeComponent],
  templateUrl: './hr-employee-form.html',
  styleUrl: './hr-employee-form.css',
})
export class HrEmployeeFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly enrollmentApi = inject(EnrollmentApiService);
  private readonly employeeApi = inject(EmployeeApiService);
  private readonly toast = inject(ToastService);

  readonly useBackend = environment.useBackendApi;
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly editId = signal<string | null>(null);
  readonly employeeCode = signal<string | null>(null);
  readonly managers = signal<EmployeeDto[]>([]);
  readonly dirtyGuard = signal(false);

  readonly isEdit = computed(() => !!this.editId());

  readonly employmentTypes = [
    { value: 'FULL_TIME', label: 'Full-time' },
    { value: 'PART_TIME', label: 'Part-time' },
    { value: 'CONTRACT', label: 'Contract' },
    { value: 'TEMPORARY', label: 'Temporary' },
  ] as const;

  readonly employmentStatuses = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'ON_LEAVE', label: 'On Leave' },
    { value: 'RESIGNED', label: 'Resigned' },
    { value: 'TERMINATED', label: 'Terminated' },
  ] as const;

  readonly genders = [
    { value: 'MALE', label: 'Male' },
    { value: 'FEMALE', label: 'Female' },
    { value: 'OTHER', label: 'Other' },
  ];

  readonly salaryPeriods = [
    { value: 'HOURLY', label: 'Hourly' },
    { value: 'DAILY', label: 'Daily' },
    { value: 'WEEKLY', label: 'Weekly' },
    { value: 'FORTNIGHTLY', label: 'Fortnightly' },
    { value: 'MONTHLY', label: 'Monthly' },
  ];

  /** Practical nationality list for Singapore HR — not a statutory catalogue. */
  readonly nationalities = [
    'Singaporean',
    'Malaysian',
    'Indonesian',
    'Indian',
    'Chinese',
    'Filipino',
    'Bangladeshi',
    'Thai',
    'Vietnamese',
    'Myanmar',
    'Sri Lankan',
    'Australian',
    'British',
    'American',
    'Other',
  ];

  readonly form = this.fb.nonNullable.group(
    {
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      mobile: ['', [Validators.required, Validators.pattern(SG_MOBILE)]],
      alternativeContact: [''],
      dateOfBirth: ['', Validators.required],
      gender: ['', Validators.required],
      nationality: ['', Validators.required],
      residentialAddress: ['', [Validators.required, Validators.minLength(8)]],
      designation: ['', Validators.required],
      employmentType: ['FULL_TIME', Validators.required],
      dateOfJoining: ['', Validators.required],
      employmentStatus: ['PENDING', Validators.required],
      probationEnd: [''],
      managerEmployeeId: [''],
      department: [''],
      finNumber: ['', [Validators.required, Validators.pattern(FIN_PATTERN)]],
      workPassType: [''],
      workPassNumber: [''],
      workPassExpiry: [''],
      passportNumber: [''],
      passportExpiry: [''],
      paymentMode: ['BANKING', Validators.required],
      bankName: [''],
      bankAccountNumber: [''],
      basicPay: [0, [Validators.required, Validators.min(0)]],
      overtimeRate: [null as number | null],
      salaryPeriod: ['MONTHLY', Validators.required],
      allowancesTotal: [0],
      payrollStartDate: [''],
    },
    { validators: [(group) => this.bankingValidator(group)] },
  );

  private bankingValidator(group: AbstractControl): ValidationErrors | null {
    const mode = group.get('paymentMode')?.value;
    if (mode !== 'BANKING') {
      return null;
    }
    const bankName = group.get('bankName')?.value;
    const account = group.get('bankAccountNumber')?.value;
    const errors: ValidationErrors = {};
    if (!bankName || String(bankName).trim() === '') {
      errors['bankNameRequired'] = true;
    }
    if (!this.editId() && (!account || String(account).trim() === '')) {
      errors['bankAccountRequired'] = true;
    }
    return Object.keys(errors).length ? errors : null;
  }

  readonly bankingSelected = computed(() => this.form.controls.paymentMode.value === 'BANKING');

  ngOnInit(): void {
    this.form.controls.paymentMode.valueChanges.subscribe(() => {
      this.form.updateValueAndValidity({ emitEvent: false });
    });
    void this.bootstrap();
  }

  private async bootstrap(): Promise<void> {
    this.loading.set(true);
    try {
      if (this.useBackend) {
        const list = await firstValueFrom(this.employeeApi.list());
        this.managers.set(list);
      }
      const id = this.route.snapshot.paramMap.get('id');
      if (id && id !== 'new') {
        this.editId.set(id);
        if (!this.useBackend) {
          this.toast.warning('API required', 'Enable useBackendApi to edit employees.');
          void this.router.navigateByUrl('/hr/master/directory');
          return;
        }
        const emp = await firstValueFrom(this.employeeApi.get(id));
        this.patchFromEmployee(emp);
      } else {
        this.form.patchValue({
          dateOfJoining: new Date().toISOString().slice(0, 10),
          paymentMode: 'BANKING',
          salaryPeriod: 'MONTHLY',
          employmentStatus: 'PENDING',
          basicPay: 0,
          allowancesTotal: 0,
        });
      }
    } catch (err) {
      this.toast.danger('Load failed', err instanceof Error ? err.message : 'Could not load form');
      void this.router.navigateByUrl('/hr/master/directory');
    } finally {
      this.loading.set(false);
    }
  }

  private patchFromEmployee(emp: EmployeeDto): void {
    this.employeeCode.set(emp.employeeCode);
    this.form.patchValue({
      fullName: emp.fullName,
      email: emp.personalEmail ?? '',
      mobile: emp.mobile ?? '',
      alternativeContact: emp.alternativeContact ?? '',
      dateOfBirth: emp.dateOfBirth ?? '',
      gender: emp.gender ?? '',
      nationality: emp.nationality ?? '',
      residentialAddress: emp.residentialAddress ?? '',
      designation: emp.designation ?? '',
      employmentType: emp.employmentType === 'INTERN' ? 'FULL_TIME' : emp.employmentType,
      dateOfJoining: emp.dateOfJoining ?? '',
      employmentStatus: ['PENDING', 'ACTIVE', 'ON_LEAVE', 'RESIGNED', 'TERMINATED'].includes(
        emp.employmentStatus,
      )
        ? emp.employmentStatus
        : 'PENDING',
      probationEnd: emp.probationEnd ?? '',
      managerEmployeeId: emp.managerEmployeeId ?? '',
      department: emp.department ?? '',
      finNumber: emp.finNumber ?? '',
      workPassType: emp.workPassType ?? '',
      workPassNumber: emp.workPassNumber ?? '',
      workPassExpiry: emp.workPassExpiry ?? '',
      passportNumber: emp.passportNumber ?? '',
      passportExpiry: emp.passportExpiry ?? '',
      paymentMode: emp.paymentMode === 'IN_HAND' ? 'IN_HAND' : 'BANKING',
      bankName: emp.bankName ?? '',
      bankAccountNumber: '',
      basicPay: emp.basicPay ?? 0,
      overtimeRate: emp.overtimeRate,
      salaryPeriod: emp.salaryPeriod ?? 'MONTHLY',
      allowancesTotal: emp.allowancesTotal ?? 0,
      payrollStartDate: emp.payrollStartDate ?? '',
    });
  }

  invalid(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  bankError(key: 'bankNameRequired' | 'bankAccountRequired'): boolean {
    return !!(this.form.errors?.[key] && this.form.touched);
  }

  cancel(): void {
    if (this.form.dirty && !confirm('Discard unsaved changes?')) {
      return;
    }
    void this.router.navigateByUrl('/hr/master/directory');
  }

  async save(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.toast.warning('Form incomplete', 'Fix highlighted fields before saving.');
      return;
    }
    if (!this.useBackend) {
      this.toast.danger('API required', 'Turn on environment.useBackendApi and start Spring Boot.');
      return;
    }
    const v = this.form.getRawValue();
    const body: EnrollEmployeeRequest = {
      fullName: v.fullName.trim(),
      email: v.email.trim().toLowerCase(),
      mobile: v.mobile.trim(),
      alternativeContact: v.alternativeContact || null,
      dateOfBirth: v.dateOfBirth,
      gender: v.gender,
      nationality: v.nationality,
      residentialAddress: v.residentialAddress.trim(),
      designation: v.designation.trim(),
      employmentType: v.employmentType as EnrollEmployeeRequest['employmentType'],
      dateOfJoining: v.dateOfJoining,
      employmentStatus: v.employmentStatus as EnrollEmployeeRequest['employmentStatus'],
      probationEnd: v.probationEnd || null,
      managerEmployeeId: v.managerEmployeeId || null,
      department: v.department || null,
      finNumber: v.finNumber.trim().toUpperCase(),
      workPassType: v.workPassType || null,
      workPassNumber: v.workPassNumber || null,
      workPassExpiry: v.workPassExpiry || null,
      passportNumber: v.passportNumber || null,
      passportExpiry: v.passportExpiry || null,
      paymentMode: v.paymentMode,
      bankName: v.paymentMode === 'BANKING' ? v.bankName : null,
      bankAccountNumber: v.paymentMode === 'BANKING' ? v.bankAccountNumber : null,
      basicPay: Number(v.basicPay),
      overtimeRate: v.overtimeRate != null && v.overtimeRate !== ('' as unknown) ? Number(v.overtimeRate) : null,
      salaryPeriod: v.salaryPeriod,
      allowancesTotal: Number(v.allowancesTotal ?? 0),
      payrollStartDate: v.payrollStartDate || null,
    };

    this.saving.set(true);
    try {
      const editId = this.editId();
      if (editId) {
        const updated = await firstValueFrom(this.enrollmentApi.update(editId, body));
        this.toast.success('Employee updated', `${updated.employeeCode} saved to PostgreSQL.`);
        void this.router.navigate(['/hr/master/directory', updated.id]);
      } else {
        const enrolled = await firstValueFrom(this.enrollmentApi.enroll(body));
        if (enrolled.invitationEmailStatus === 'FAILED') {
          this.toast.warning(
            'Employee created',
            `${enrolled.employeeCode} saved, but the invitation email could not be sent. Resend from Employee Management.`,
          );
        } else {
          this.toast.success(
            'Employee enrolled',
            `${enrolled.employeeCode} · invitation ${enrolled.invitationEmailStatus}. ${enrolled.message}`,
          );
        }
        void this.router.navigate(['/hr/master/directory'], {
          queryParams: { highlight: enrolled.employeeCode },
        });
      }
    } catch (err) {
      this.toast.danger('Save failed', err instanceof Error ? err.message : 'Request failed');
    } finally {
      this.saving.set(false);
    }
  }
}
