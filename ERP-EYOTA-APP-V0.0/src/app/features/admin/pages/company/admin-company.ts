import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminMockService } from '../../../../core/services/admin-mock.service';
import { ToastService } from '../../../../core/services/toast.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';

@Component({
  selector: 'app-admin-company',
  standalone: true,
  imports: [ReactiveFormsModule, LoadingSpinnerComponent],
  templateUrl: './admin-company.html',
  styleUrl: './admin-company.css',
})
export class AdminCompanyPage implements OnInit {
  private readonly admin = inject(AdminMockService);
  private readonly fb = inject(FormBuilder);
  readonly toast = inject(ToastService);
  readonly loading = signal(true);
  readonly policies = this.admin.policies;

  readonly companyForm = this.fb.nonNullable.group({
    legalName: ['', Validators.required],
    uen: ['', Validators.required],
    gstRegistered: [true],
    gstNumberMasked: [{ value: '', disabled: true }],
    address: ['', Validators.required],
    postalCode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    payDay: [28, [Validators.required, Validators.min(1), Validators.max(28)]],
  });

  readonly listsForm = this.fb.nonNullable.group({
    branches: ['', Validators.required],
    departments: ['', Validators.required],
    costCentres: ['', Validators.required],
    jobGrades: ['', Validators.required],
  });

  ngOnInit(): void {
    this.admin.bootstrap().subscribe(() => {
      this.patchFromPolicies();
      this.loading.set(false);
    });
  }

  saveCompany(): void {
    this.companyForm.markAllAsTouched();
    if (this.companyForm.invalid) {
      this.toast.warning('Company form', 'Fix highlighted fields.');
      return;
    }
    const raw = this.companyForm.getRawValue();
    this.admin.updateCompany({
      legalName: raw.legalName,
      uen: raw.uen,
      gstRegistered: raw.gstRegistered,
      gstNumberMasked: raw.gstNumberMasked,
      address: raw.address,
      postalCode: raw.postalCode,
      payDay: raw.payDay,
    });
    this.toast.success('Company saved', 'Profile synced for HR/ESS org context (demo).');
  }

  saveLists(): void {
    this.listsForm.markAllAsTouched();
    if (this.listsForm.invalid) {
      return;
    }
    const split = (value: string) =>
      value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
    const values = this.listsForm.getRawValue();
    this.admin.updateOrgLists({
      branches: split(values.branches),
      departments: split(values.departments),
      costCentres: split(values.costCentres),
      jobGrades: split(values.jobGrades),
    });
    this.toast.success('Org lists saved', 'Cost centres now appear in Employee Claims dropdown.');
  }

  private patchFromPolicies(): void {
    const p = this.policies();
    this.companyForm.patchValue(p.company);
    this.listsForm.patchValue({
      branches: p.branches.join(', '),
      departments: p.departments.join(', '),
      costCentres: p.costCentres.join(', '),
      jobGrades: p.jobGrades.join(', '),
    });
  }
}
