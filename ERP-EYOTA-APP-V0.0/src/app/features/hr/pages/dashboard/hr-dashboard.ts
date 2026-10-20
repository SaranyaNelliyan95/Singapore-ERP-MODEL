import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EmployeeMockService } from '../../../../core/services/employee-mock.service';
import { HrMockService } from '../../../../core/services/hr-mock.service';
import { ToastService } from '../../../../core/services/toast.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';
import { DemoNoticeComponent } from '../../../employee/shared/demo-notice';
import { EmploymentPassType } from '../../../../core/models/common.model';

@Component({
  selector: 'app-hr-dashboard',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, LoadingSpinnerComponent, DemoNoticeComponent],
  templateUrl: './hr-dashboard.html',
  styleUrl: './hr-dashboard.css',
})
export class HrDashboardPage implements OnInit {
  private readonly hr = inject(HrMockService);
  private readonly workforce = inject(EmployeeMockService);
  private readonly fb = inject(FormBuilder);
  readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly stats = this.hr.stats;
  readonly hireOpen = signal(false);

  readonly hireForm = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    department: ['Projects', Validators.required],
    role: ['', Validators.required],
    employmentType: ['Local' as EmploymentPassType, Validators.required],
    startDate: ['', Validators.required],
  });

  ngOnInit(): void {
    this.hr.getMasterSnapshot().subscribe(() => this.loading.set(false));
  }

  openHire(): void {
    this.hireForm.reset({
      fullName: '',
      department: 'Projects',
      role: '',
      employmentType: 'Local',
      startDate: new Date().toISOString().slice(0, 10),
    });
    this.hireOpen.set(true);
  }

  submitHire(): void {
    this.hireForm.markAllAsTouched();
    if (this.hireForm.invalid) {
      this.toast.warning('New hire', 'Complete all required hire fields.');
      return;
    }
    const values = this.hireForm.getRawValue();
    const candidate = this.workforce.addNewHireDraft(values);
    this.hireOpen.set(false);
    this.toast.success('New hire drafted', `${candidate.candidateName} added to onboarding (mock).`);
  }

}
