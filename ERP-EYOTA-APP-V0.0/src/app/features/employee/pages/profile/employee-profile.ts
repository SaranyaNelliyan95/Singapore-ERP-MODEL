import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { EmployeeMockService } from '../../../../core/services/employee-mock.service';
import { EmployeeApiService, EmployeeDto } from '../../../../core/services/employee-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { maskBankAccount } from '../../../../core/utils/singapore.utils';
import { environment } from '../../../../../environments/environment';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge';
import { DemoNoticeComponent } from '../../shared/demo-notice';
import { MaskNricPipe } from '../../../../shared/pipes/mask-nric.pipe';
import { PhoneSgPipe } from '../../../../shared/pipes/phone-sg.pipe';
import { SgDatePipe } from '../../../../shared/pipes/sg-date.pipe';

@Component({
  selector: 'app-employee-profile',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    LoadingSpinnerComponent,
    StatusBadgeComponent,
    DemoNoticeComponent,
    MaskNricPipe,
    PhoneSgPipe,
    SgDatePipe,
  ],
  templateUrl: './employee-profile.html',
  styleUrl: './employee-profile.css',
})
export class EmployeeProfilePage implements OnInit {
  private readonly employeeService = inject(EmployeeMockService);
  private readonly employeeApi = inject(EmployeeApiService);
  private readonly fb = inject(FormBuilder);
  readonly toast = inject(ToastService);

  readonly useBackend = environment.useBackendApi;
  readonly loading = signal(true);
  readonly editing = signal(false);
  readonly bankModalOpen = signal(false);
  readonly apiProfile = signal<EmployeeDto | null>(null);
  readonly ws = this.employeeService.workspace;

  readonly contactForm = this.fb.nonNullable.group({
    personalEmail: ['', [Validators.email]],
    mobile: ['', [Validators.required, Validators.pattern(/^[89]\d{7}$/)]],
    residentialAddress: ['', [Validators.required, Validators.minLength(8)]],
    dateOfBirth: [''],
    gender: [''],
    nationality: [''],
    alternativeContact: [''],
    passportNumber: [''],
    passportExpiry: [''],
    emergencyContactName: [''],
    emergencyContactPhone: [''],
    emergencyContactRelation: [''],
  });

  readonly bankForm = this.fb.nonNullable.group({
    bankName: ['', [Validators.required, Validators.minLength(2)]],
    bankAccountNumber: ['', [Validators.required, Validators.pattern(/^\d{6,12}$/)]],
    note: ['', [Validators.required, Validators.minLength(8)]],
  });

  ngOnInit(): void {
    if (this.useBackend) {
      void this.loadApiProfile();
      return;
    }
    this.employeeService.getWorkspace().subscribe((data) => {
      this.patchContact(data.profile);
      this.loading.set(false);
    });
  }

  private async loadApiProfile(): Promise<void> {
    this.loading.set(true);
    try {
      const me = await firstValueFrom(this.employeeApi.me());
      this.apiProfile.set(me);
      this.patchFromApi(me);
    } catch (err) {
      this.toast.danger('Profile', err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      this.loading.set(false);
    }
  }

  maskedBank(value: string): string {
    return maskBankAccount(value);
  }

  startEdit(): void {
    if (this.useBackend) {
      const me = this.apiProfile();
      if (me) {
        this.patchFromApi(me);
      }
    } else {
      this.patchContact(this.ws().profile);
    }
    this.editing.set(true);
  }

  cancelEdit(): void {
    if (this.useBackend) {
      const me = this.apiProfile();
      if (me) {
        this.patchFromApi(me);
      }
    } else {
      this.patchContact(this.ws().profile);
    }
    this.editing.set(false);
  }

  async saveContact(): Promise<void> {
    this.contactForm.markAllAsTouched();
    if (this.useBackend) {
      if (this.contactForm.controls.mobile.invalid || this.contactForm.controls.residentialAddress.invalid) {
        this.toast.warning('Validation', 'Fix mobile and address before saving.');
        return;
      }
      const v = this.contactForm.getRawValue();
      try {
        const updated = await firstValueFrom(
          this.employeeApi.updateMyProfile({
            dateOfBirth: v.dateOfBirth || null,
            gender: v.gender || null,
            nationality: v.nationality || null,
            residentialAddress: v.residentialAddress,
            mobile: v.mobile,
            alternativeContact: v.alternativeContact || null,
            passportNumber: v.passportNumber || null,
            passportExpiry: v.passportExpiry || null,
          }),
        );
        this.apiProfile.set(updated);
        this.patchFromApi(updated);
        this.editing.set(false);
        this.toast.success('Profile saved', 'Personal details updated in PostgreSQL.');
      } catch (err) {
        this.toast.danger('Save failed', err instanceof Error ? err.message : 'Update failed');
      }
      return;
    }

    if (this.contactForm.invalid) {
      this.toast.warning('Validation', 'Fix highlighted contact fields before saving.');
      return;
    }
    const request = this.employeeService.submitProfileUpdate(
      {
        personalEmail: this.contactForm.value.personalEmail ?? '',
        mobile: this.contactForm.value.mobile ?? '',
        residentialAddress: this.contactForm.value.residentialAddress ?? '',
        emergencyContactName: this.contactForm.value.emergencyContactName ?? '',
        emergencyContactPhone: this.contactForm.value.emergencyContactPhone ?? '',
        emergencyContactRelation: this.contactForm.value.emergencyContactRelation ?? '',
      },
      'Employee-requested contact update',
    );
    this.editing.set(false);
    this.patchContact(this.ws().profile);
    this.toast.success(
      'Update requested',
      `${request.id} queued for HR verification — profile unchanged until approved.`,
    );
  }

  openBankRequest(): void {
    this.bankForm.reset({
      bankName: this.useBackend ? (this.apiProfile()?.bankName ?? '') : this.ws().profile.bankName,
      bankAccountNumber: '',
      note: '',
    });
    this.bankModalOpen.set(true);
  }

  confirmBankRequest(): void {
    if (this.useBackend) {
      this.toast.warning(
        'Bank updates',
        'Bank details are HR-managed via employee master. Contact HR for payment changes.',
      );
      this.bankModalOpen.set(false);
      return;
    }
    this.bankForm.markAllAsTouched();
    if (this.bankForm.invalid) {
      this.toast.warning('Bank form', 'Provide bank name, 6–12 digit account, and reason.');
      return;
    }
    const values = this.bankForm.getRawValue();
    this.employeeService.submitBankUpdate(values.bankName, values.bankAccountNumber, values.note);
    this.bankModalOpen.set(false);
    this.toast.success(
      'Bank update requested',
      'Sandboxed request queued for HR authorization — account remains unchanged until approved.',
    );
  }

  cancelBankRequest(): void {
    this.bankModalOpen.set(false);
  }

  invalidContact(name: keyof typeof this.contactForm.controls): boolean {
    const c = this.contactForm.controls[name];
    return c.invalid && c.touched;
  }

  invalidBank(name: keyof typeof this.bankForm.controls): boolean {
    const c = this.bankForm.controls[name];
    return c.invalid && c.touched;
  }

  displayName(): string {
    return this.useBackend
      ? (this.apiProfile()?.fullName ?? 'Employee')
      : this.ws().profile.fullName;
  }

  private patchFromApi(me: EmployeeDto): void {
    this.contactForm.patchValue({
      personalEmail: me.personalEmail ?? '',
      mobile: me.mobile ?? '',
      residentialAddress: me.residentialAddress ?? '',
      dateOfBirth: me.dateOfBirth ?? '',
      gender: me.gender ?? '',
      nationality: me.nationality ?? '',
      alternativeContact: me.alternativeContact ?? '',
      passportNumber: me.passportNumber ?? '',
      passportExpiry: me.passportExpiry ?? '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      emergencyContactRelation: '',
    });
  }

  private patchContact(profile: {
    personalEmail: string;
    mobile: string;
    residentialAddress: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    emergencyContactRelation: string;
  }): void {
    this.contactForm.patchValue(profile);
  }
}
