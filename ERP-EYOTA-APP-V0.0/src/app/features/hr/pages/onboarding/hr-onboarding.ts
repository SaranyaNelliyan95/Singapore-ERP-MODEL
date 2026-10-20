import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { EmploymentPassType } from '../../../../core/models/common.model';
import { OnboardingCandidate } from '../../../../core/models/hr.model';
import { EmployeeMockService } from '../../../../core/services/employee-mock.service';
import { HrMockService } from '../../../../core/services/hr-mock.service';
import { ToastService } from '../../../../core/services/toast.service';
import { formatSgDate } from '../../../../core/utils/singapore.utils';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge';
import { DemoNoticeComponent } from '../../../employee/shared/demo-notice';

interface ActivateOptions {
  createLogin: boolean;
  email: string;
}

@Component({
  selector: 'app-hr-onboarding',
  standalone: true,
  imports: [ReactiveFormsModule, LoadingSpinnerComponent, StatusBadgeComponent, DemoNoticeComponent],
  templateUrl: './hr-onboarding.html',
  styleUrl: './hr-onboarding.css',
})
export class HrOnboardingPage implements OnInit {
  readonly hr = inject(HrMockService);
  private readonly workforce = inject(EmployeeMockService);
  private readonly fb = inject(FormBuilder);
  readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly activateOpts = signal<Record<string, ActivateOptions>>({});

  readonly candidates = computed(() => this.hr.workforce().onboarding);

  readonly hireForm = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    department: ['Projects', Validators.required],
    role: ['', Validators.required],
    employmentType: ['Local' as EmploymentPassType, Validators.required],
    startDate: ['', Validators.required],
  });

  readonly passOptions: EmploymentPassType[] = ['Local', 'PR', 'WP', 'S Pass', 'EP'];

  ngOnInit(): void {
    this.hr.getMasterSnapshot().subscribe(() => {
      this.hireForm.patchValue({ startDate: new Date().toISOString().slice(0, 10) });
      this.loading.set(false);
    });
  }

  optsFor(candidateId: string): ActivateOptions {
    return this.activateOpts()[candidateId] ?? { createLogin: true, email: '' };
  }

  patchOpts(candidateId: string, patch: Partial<ActivateOptions>): void {
    const current = this.optsFor(candidateId);
    this.activateOpts.update((map) => ({
      ...map,
      [candidateId]: { ...current, ...patch },
    }));
  }

  stageTone(stage: OnboardingCandidate['stage']): 'success' | 'warning' | 'info' | 'neutral' {
    if (stage === 'Completed') {
      return 'success';
    }
    if (stage === 'Offer') {
      return 'neutral';
    }
    if (stage === 'Orientation') {
      return 'info';
    }
    return 'warning';
  }

  advance(row: OnboardingCandidate): void {
    if (row.stage === 'Completed') {
      this.toast.warning('Onboarding', `${row.candidateName} is already completed.`);
      return;
    }
    const updated = this.workforce.advanceOnboarding(row.id);
    if (updated) {
      this.toast.success('Stage advanced', `${row.candidateName} moved to ${updated.stage}.`);
    }
  }

  activate(row: OnboardingCandidate): void {
    const opts = this.optsFor(row.id);
    const result = this.workforce.activateOnboardingAsEmployee(row.id, {
      createLogin: opts.createLogin,
      email: opts.email.trim() || undefined,
    });
    if (!result) {
      this.toast.warning('Activation failed', 'Candidate not found in onboarding queue.');
      return;
    }
    const loginPart = result.loginEmail
      ? ` Login: ${result.loginEmail} (demo password Employee@123).`
      : '';
    this.toast.success(
      'Employee activated',
      `New ID ${result.employeeId} created in directory.${loginPart}`,
    );
  }

  submitHire(): void {
    this.hireForm.markAllAsTouched();
    if (this.hireForm.invalid) {
      this.toast.warning('New hire', 'Complete all required hire fields.');
      return;
    }
    const values = this.hireForm.getRawValue();
    const candidate = this.workforce.addNewHireDraft(values);
    this.hireForm.reset({
      fullName: '',
      department: 'Projects',
      role: '',
      employmentType: 'Local',
      startDate: new Date().toISOString().slice(0, 10),
    });
    this.toast.success('New hire drafted', `${candidate.candidateName} added to onboarding (mock).`);
  }

  formatDate(value: string): string {
    return formatSgDate(value);
  }
}
