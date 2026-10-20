import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { EmployeeMockService } from '../../../../core/services/employee-mock.service';
import { ToastService } from '../../../../core/services/toast.service';
import { maskBankAccount } from '../../../../core/utils/singapore.utils';
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
  private readonly fb = inject(FormBuilder);
  readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly editing = signal(false);
  readonly bankModalOpen = signal(false);
  readonly ws = this.employeeService.workspace;

  readonly contactForm = this.fb.nonNullable.group({
    personalEmail: ['', [Validators.required, Validators.email]],
    mobile: ['', [Validators.required, Validators.pattern(/^[89]\d{7}$/)]],
    residentialAddress: ['', [Validators.required, Validators.minLength(12)]],
    emergencyContactName: ['', Validators.required],
    emergencyContactPhone: ['', [Validators.required, Validators.pattern(/^[89]\d{7}$/)]],
    emergencyContactRelation: ['', Validators.required],
  });

  readonly bankForm = this.fb.nonNullable.group({
    bankName: ['', [Validators.required, Validators.minLength(2)]],
    bankAccountNumber: ['', [Validators.required, Validators.pattern(/^\d{6,12}$/)]],
    note: ['', [Validators.required, Validators.minLength(8)]],
  });

  ngOnInit(): void {
    this.employeeService.getWorkspace().subscribe((data) => {
      this.patchContact(data.profile);
      this.loading.set(false);
    });
  }

  maskedBank(value: string): string {
    return maskBankAccount(value);
  }

  startEdit(): void {
    this.patchContact(this.ws().profile);
    this.editing.set(true);
  }

  cancelEdit(): void {
    this.patchContact(this.ws().profile);
    this.editing.set(false);
  }

  saveContact(): void {
    this.contactForm.markAllAsTouched();
    if (this.contactForm.invalid) {
      this.toast.warning('Validation', 'Fix highlighted contact fields before saving.');
      return;
    }
    const request = this.employeeService.submitProfileUpdate(
      this.contactForm.getRawValue(),
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
      bankName: this.ws().profile.bankName,
      bankAccountNumber: '',
      note: '',
    });
    this.bankModalOpen.set(true);
  }

  confirmBankRequest(): void {
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
