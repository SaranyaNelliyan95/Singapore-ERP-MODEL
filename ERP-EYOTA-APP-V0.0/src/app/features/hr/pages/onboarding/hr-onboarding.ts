import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { EmploymentPassType } from '../../../../core/models/common.model';
import { OnboardingCandidate } from '../../../../core/models/hr.model';
import { EmployeeMockService } from '../../../../core/services/employee-mock.service';
import { HrMockService } from '../../../../core/services/hr-mock.service';
import {
  OnboardingApiService,
  OnboardingCandidateDto,
  OnboardingDetailDto,
  OnboardingSummaryDto,
} from '../../../../core/services/onboarding-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { formatSgDate } from '../../../../core/utils/singapore.utils';
import { environment } from '../../../../../environments/environment';
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
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LoadingSpinnerComponent,
    StatusBadgeComponent,
    DemoNoticeComponent,
  ],
  templateUrl: './hr-onboarding.html',
  styleUrl: './hr-onboarding.css',
})
export class HrOnboardingPage implements OnInit {
  readonly hr = inject(HrMockService);
  private readonly workforce = inject(EmployeeMockService);
  private readonly onboardingApi = inject(OnboardingApiService);
  private readonly fb = inject(FormBuilder);
  readonly toast = inject(ToastService);

  readonly useBackend = environment.useBackendApi;
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly activateOpts = signal<Record<string, ActivateOptions>>({});
  readonly summary = signal<OnboardingSummaryDto | null>(null);
  readonly apiCandidates = signal<OnboardingCandidateDto[]>([]);
  readonly selectedId = signal<string | null>(null);
  readonly detail = signal<OnboardingDetailDto | null>(null);
  readonly docType = signal('PASSPORT');
  readonly uploadFile = signal<File | null>(null);

  readonly mockCandidates = computed(() => this.hr.workforce().onboarding);

  readonly candidates = computed(() =>
    this.useBackend ? this.apiCandidates() : this.mockCandidates(),
  );

  readonly hireForm = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    mobile: ['', [Validators.required, Validators.minLength(8)]],
    department: ['Projects', Validators.required],
    role: ['', Validators.required],
    employmentType: ['WP' as EmploymentPassType, Validators.required],
    startDate: ['', Validators.required],
    sendInvitation: [false],
    workerCategory: ['Construction'],
    sector: [''],
  });

  readonly momForm = this.fb.nonNullable.group({
    momReference: [''],
    applicationType: ['WORK_PASS'],
    submittedAt: [''],
    portalNotes: [''],
  });

  readonly ipaForm = this.fb.nonNullable.group({
    ipaNumber: ['', Validators.required],
    ipaIssueDate: [''],
    ipaExpiryDate: [''],
    notes: [''],
    markApproved: [true],
  });

  readonly preArrivalForm = this.fb.nonNullable.group({
    plannedArrivalDate: [''],
    flightNumber: [''],
    arrivalAirport: ['Changi'],
    accommodationAddress: [''],
    housingConfirmed: [false],
    bondArranged: [false],
    insuranceArranged: [false],
    readyForTravel: [false],
    notes: [''],
  });

  readonly arrivalForm = this.fb.nonNullable.group({
    actualArrivalDate: [''],
    flightNumber: [''],
    arrivalAirport: [''],
    accommodationAddress: [''],
    housingConfirmed: [true],
    employeeConfirmed: [false],
    notes: [''],
  });

  readonly programmeForm = this.fb.nonNullable.group({
    medicalStatus: ['PENDING'],
    sipStatus: ['PENDING'],
    onboardProgrammeStatus: ['PENDING'],
    quarantineStatus: ['NOT_APPLICABLE'],
  });

  readonly wpForm = this.fb.nonNullable.group({
    wpNumber: ['', Validators.required],
    wpIssueDate: [''],
    wpExpiryDate: [''],
    finNumber: [''],
    cardCollected: [false],
    notes: [''],
  });

  readonly passOptions: EmploymentPassType[] = ['Local', 'PR', 'WP', 'S Pass', 'EP'];
  readonly docTypes = [
    'PASSPORT',
    'WP_APPLICATION',
    'IPA_FULL_SET',
    'EMPLOYMENT_CONTRACT',
    'WP_NOTIFICATION',
    'WP_CARD',
    'MEDICAL_CONFIRMATION',
    'SIP_CONFIRMATION',
    'FLIGHT_ARRIVAL',
    'ACCOMMODATION',
    'PPE_SAFETY_TRAINING',
    'OTHER',
  ];

  ngOnInit(): void {
    this.hireForm.patchValue({ startDate: new Date().toISOString().slice(0, 10) });
    if (this.useBackend) {
      void this.reload().finally(() => this.loading.set(false));
      return;
    }
    this.hr.getMasterSnapshot().subscribe(() => this.loading.set(false));
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

  stageTone(stage: string): 'success' | 'warning' | 'info' | 'neutral' {
    if (stage.includes('Ready') || stage === 'Completed') {
      return 'success';
    }
    if (stage.includes('Hold') || stage.includes('Cancel')) {
      return 'neutral';
    }
    if (stage.includes('IPA') || stage.includes('Permit') || stage.includes('Arrived')) {
      return 'info';
    }
    return 'warning';
  }

  /** Label for the next pipeline step so HR knows what process comes after a click. */
  nextStageLabel(row: OnboardingCandidate | OnboardingCandidateDto): string {
    const mockFlow = ['Offer', 'MOM Forms', 'Medical', 'Orientation', 'Completed'] as const;
    const foreignFlow = [
      'DRAFT',
      'DOCUMENTS_PENDING',
      'APPLICATION_SUBMITTED',
      'IPA_APPROVED',
      'PRE_ARRIVAL_PENDING',
      'READY_FOR_TRAVEL',
      'ARRIVED_IN_SINGAPORE',
      'POST_ARRIVAL_PENDING',
      'WORK_PERMIT_ISSUED',
      'ONBOARDING_IN_PROGRESS',
      'READY_TO_WORK',
    ] as const;
    const localFlow = [
      'DRAFT',
      'DOCUMENTS_PENDING',
      'APPLICATION_SUBMITTED',
      'POST_ARRIVAL_PENDING',
      'ONBOARDING_IN_PROGRESS',
      'READY_TO_WORK',
    ] as const;

    const dto = row as OnboardingCandidateDto;
    const pipeline = dto.pipelineStatus;
    if (pipeline) {
      const flow: readonly string[] =
        dto.foreignWorker === false ? localFlow : foreignFlow;
      const idx = flow.indexOf(pipeline);
      const nextCode = idx >= 0 ? flow[Math.min(idx + 1, flow.length - 1)] : null;
      return nextCode ? this.friendlyPipelineLabel(nextCode) : 'Ready to Work';
    }

    const idx = mockFlow.indexOf(row.stage as (typeof mockFlow)[number]);
    if (idx < 0) {
      return 'Next stage';
    }
    return mockFlow[Math.min(idx + 1, mockFlow.length - 1)];
  }

  private friendlyPipelineLabel(code: string): string {
    switch (code) {
      case 'DRAFT':
        return 'Draft';
      case 'DOCUMENTS_PENDING':
        return 'Documents Pending';
      case 'APPLICATION_SUBMITTED':
        return 'Application Submitted';
      case 'IPA_APPROVED':
        return 'IPA Approved';
      case 'PRE_ARRIVAL_PENDING':
        return 'Pre-Arrival';
      case 'READY_FOR_TRAVEL':
        return 'Ready for Travel';
      case 'ARRIVED_IN_SINGAPORE':
        return 'Arrived';
      case 'POST_ARRIVAL_PENDING':
        return 'Post-Arrival';
      case 'WORK_PERMIT_ISSUED':
        return 'Work Permit Issued';
      case 'ONBOARDING_IN_PROGRESS':
        return 'Onboarding In Progress';
      case 'READY_TO_WORK':
        return 'Ready to Work';
      default:
        return code;
    }
  }

  async selectCandidate(row: OnboardingCandidate | OnboardingCandidateDto): Promise<void> {
    this.selectedId.set(row.id);
    if (!this.useBackend) {
      this.detail.set(null);
      return;
    }
    this.saving.set(true);
    try {
      const d = await firstValueFrom(this.onboardingApi.detail(row.id));
      this.detail.set(d);
      this.patchDetailForms(d);
    } catch (err) {
      this.toast.danger('Detail', err instanceof Error ? err.message : 'Unable to load detail');
    } finally {
      this.saving.set(false);
    }
  }

  async advance(row: OnboardingCandidate | OnboardingCandidateDto): Promise<void> {
    if (row.stage === 'Completed' || row.stage === 'Ready to Work') {
      this.toast.warning('Onboarding', `${row.candidateName} is already completed.`);
      return;
    }
    if (!this.useBackend) {
      const updated = this.workforce.advanceOnboarding(row.id);
      if (updated) {
        this.toast.success('Stage advanced', `${row.candidateName} moved to ${updated.stage}.`);
      }
      return;
    }
    this.saving.set(true);
    try {
      const updated = await firstValueFrom(this.onboardingApi.advance(row.id));
      await this.reload();
      await this.selectCandidate(updated);
      this.toast.success('Stage advanced', `${updated.candidateName} → ${updated.stage}.`);
    } catch (err) {
      this.toast.danger('Advance failed', err instanceof Error ? err.message : 'Unable to advance');
    } finally {
      this.saving.set(false);
    }
  }

  async activate(row: OnboardingCandidate | OnboardingCandidateDto): Promise<void> {
    const opts = this.optsFor(row.id);
    if (!this.useBackend) {
      const result = this.workforce.activateOnboardingAsEmployee(row.id, {
        createLogin: opts.createLogin,
        email: opts.email.trim() || undefined,
      });
      if (!result) {
        this.toast.warning('Activation failed', 'Candidate not found in onboarding queue.');
        return;
      }
      this.toast.success(
        'Employee activated',
        `New ID ${result.employeeId} created.${result.loginEmail ? ` Login: ${result.loginEmail}` : ''}`,
      );
      return;
    }

    this.saving.set(true);
    try {
      const result = await firstValueFrom(
        this.onboardingApi.activate(row.id, {
          createLogin: opts.createLogin,
          email: opts.email.trim() || (row as OnboardingCandidateDto).personalEmail || null,
        }),
      );
      await this.reload();
      this.toast.success(
        'Employee activated',
        result.loginEmail
          ? `${result.employeeCode} · invitation to ${result.loginEmail}. ${result.message}`
          : `${result.employeeCode} · ${result.message}`,
      );
    } catch (err) {
      this.toast.danger('Activation failed', err instanceof Error ? err.message : 'Unable to activate');
    } finally {
      this.saving.set(false);
    }
  }

  async sendInvite(row: OnboardingCandidateDto): Promise<void> {
    this.saving.set(true);
    try {
      const updated = await firstValueFrom(this.onboardingApi.sendInvitation(row.id));
      await this.reload();
      this.toast.success(
        'Invitation',
        `Invite status for ${updated.candidateName}: ${updated.invitationEmailStatus ?? 'sent'}.`,
      );
    } catch (err) {
      this.toast.danger('Invite failed', err instanceof Error ? err.message : 'Unable to send invitation');
    } finally {
      this.saving.set(false);
    }
  }

  async submitHire(): Promise<void> {
    this.hireForm.markAllAsTouched();
    if (this.hireForm.invalid) {
      this.toast.warning('New hire', 'Complete all required hire fields.');
      return;
    }
    const values = this.hireForm.getRawValue();

    if (!this.useBackend) {
      const candidate = this.workforce.addNewHireDraft({
        fullName: values.fullName,
        department: values.department,
        role: values.role,
        employmentType: values.employmentType,
        startDate: values.startDate,
      });
      this.resetHireForm();
      this.toast.success('New hire drafted', `${candidate.candidateName} added (mock).`);
      return;
    }

    this.saving.set(true);
    try {
      const created = await firstValueFrom(
        this.onboardingApi.createDraft({
          fullName: values.fullName,
          email: values.email,
          mobile: values.mobile,
          role: values.role,
          department: values.department,
          startDate: values.startDate,
          employmentPassType: values.employmentType,
          sendInvitation: values.sendInvitation,
          workerCategory: values.workerCategory || null,
          sector: values.sector || null,
        }),
      );
      this.resetHireForm();
      await this.reload();
      await this.selectCandidate(created);
      this.toast.success(
        'Onboarding draft created',
        `${created.employeeCode} · ${created.candidateName}` +
          (values.sendInvitation ? ` · invite ${created.invitationEmailStatus}` : ''),
      );
    } catch (err) {
      this.toast.danger('Draft failed', err instanceof Error ? err.message : 'Unable to create draft');
    } finally {
      this.saving.set(false);
    }
  }

  async saveMom(): Promise<void> {
    const id = this.selectedId();
    if (!id) return;
    this.saving.set(true);
    try {
      const v = this.momForm.getRawValue();
      const d = await firstValueFrom(
        this.onboardingApi.momApplication(id, {
          momReference: v.momReference || null,
          applicationType: v.applicationType,
          submittedAt: v.submittedAt || null,
          portalNotes: v.portalNotes || null,
        }),
      );
      this.detail.set(d);
      await this.reload();
      this.toast.success('MOM application', 'Application recorded (manual portal entry).');
    } catch (err) {
      this.toast.danger('MOM', err instanceof Error ? err.message : 'Failed');
    } finally {
      this.saving.set(false);
    }
  }

  async saveIpa(): Promise<void> {
    const id = this.selectedId();
    if (!id) return;
    this.ipaForm.markAllAsTouched();
    if (this.ipaForm.invalid) return;
    this.saving.set(true);
    try {
      const v = this.ipaForm.getRawValue();
      const d = await firstValueFrom(
        this.onboardingApi.recordIpa(id, {
          ipaNumber: v.ipaNumber,
          ipaIssueDate: v.ipaIssueDate || null,
          ipaExpiryDate: v.ipaExpiryDate || null,
          notes: v.notes || null,
          markApproved: v.markApproved,
        }),
      );
      this.detail.set(d);
      await this.reload();
      this.toast.success('IPA', 'IPA recorded. Secure package notice emailed when mail is enabled.');
    } catch (err) {
      this.toast.danger('IPA', err instanceof Error ? err.message : 'Failed');
    } finally {
      this.saving.set(false);
    }
  }

  async savePreArrival(): Promise<void> {
    const id = this.selectedId();
    if (!id) return;
    this.saving.set(true);
    try {
      const v = this.preArrivalForm.getRawValue();
      const d = await firstValueFrom(this.onboardingApi.preArrival(id, v));
      this.detail.set(d);
      await this.reload();
      this.toast.success('Pre-arrival', 'Checklist saved.');
    } catch (err) {
      this.toast.danger('Pre-arrival', err instanceof Error ? err.message : 'Failed');
    } finally {
      this.saving.set(false);
    }
  }

  async saveArrival(): Promise<void> {
    const id = this.selectedId();
    if (!id) return;
    this.saving.set(true);
    try {
      const v = this.arrivalForm.getRawValue();
      const d = await firstValueFrom(this.onboardingApi.arrival(id, v));
      this.detail.set(d);
      await this.reload();
      this.toast.success('Arrival', 'Arrival record updated.');
    } catch (err) {
      this.toast.danger('Arrival', err instanceof Error ? err.message : 'Failed');
    } finally {
      this.saving.set(false);
    }
  }

  async saveProgrammes(): Promise<void> {
    const id = this.selectedId();
    if (!id) return;
    this.saving.set(true);
    try {
      const d = await firstValueFrom(
        this.onboardingApi.programmes(id, this.programmeForm.getRawValue()),
      );
      this.detail.set(d);
      this.toast.success('Programmes', 'Medical / SIP / Onboard statuses saved (quarantine stays N/A unless set).');
    } catch (err) {
      this.toast.danger('Programmes', err instanceof Error ? err.message : 'Failed');
    } finally {
      this.saving.set(false);
    }
  }

  async saveWp(): Promise<void> {
    const id = this.selectedId();
    if (!id) return;
    this.wpForm.markAllAsTouched();
    if (this.wpForm.invalid) return;
    this.saving.set(true);
    try {
      const v = this.wpForm.getRawValue();
      const d = await firstValueFrom(
        this.onboardingApi.workPermit(id, {
          wpNumber: v.wpNumber,
          wpIssueDate: v.wpIssueDate || null,
          wpExpiryDate: v.wpExpiryDate || null,
          finNumber: v.finNumber || null,
          cardCollected: v.cardCollected,
          notes: v.notes || null,
        }),
      );
      this.detail.set(d);
      await this.reload();
      this.toast.success('Work permit', 'WP issued — employee onboarding stage started.');
    } catch (err) {
      this.toast.danger('Work permit', err instanceof Error ? err.message : 'Failed');
    } finally {
      this.saving.set(false);
    }
  }

  async issueDefaultPpe(): Promise<void> {
    const id = this.selectedId();
    if (!id) return;
    this.saving.set(true);
    try {
      const d = await firstValueFrom(
        this.onboardingApi.issuePpe(id, {
          items: [
            { itemCode: 'HELMET', itemName: 'Safety helmet', quantity: 1 },
            { itemCode: 'SHOES', itemName: 'Safety shoes', quantity: 1 },
            { itemCode: 'VEST', itemName: 'High-vis vest', quantity: 1 },
          ],
        }),
      );
      this.detail.set(d);
      this.toast.success('PPE', 'Default PPE issued — employee must confirm in portal.');
    } catch (err) {
      this.toast.danger('PPE', err instanceof Error ? err.message : 'Failed');
    } finally {
      this.saving.set(false);
    }
  }

  async completeReady(): Promise<void> {
    const id = this.selectedId();
    if (!id) return;
    const opts = this.optsFor(id);
    this.saving.set(true);
    try {
      const result = await firstValueFrom(
        this.onboardingApi.completeReady(id, {
          createLogin: opts.createLogin,
          email: opts.email || null,
          sendProgressEmail: true,
        }),
      );
      await this.reload();
      this.toast.success('Ready to Work', result.message);
    } catch (err) {
      this.toast.danger('Ready to Work', err instanceof Error ? err.message : 'Blocked');
    } finally {
      this.saving.set(false);
    }
  }

  onFilePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.uploadFile.set(input.files?.[0] ?? null);
  }

  async uploadDoc(): Promise<void> {
    const id = this.selectedId();
    const file = this.uploadFile();
    if (!id || !file) {
      this.toast.warning('Upload', 'Select a candidate and a file.');
      return;
    }
    this.saving.set(true);
    try {
      await firstValueFrom(this.onboardingApi.uploadDocument(id, file, this.docType()));
      const d = await firstValueFrom(this.onboardingApi.detail(id));
      this.detail.set(d);
      this.uploadFile.set(null);
      this.toast.success('Document vault', `${file.name} stored securely.`);
    } catch (err) {
      this.toast.danger('Upload', err instanceof Error ? err.message : 'Failed');
    } finally {
      this.saving.set(false);
    }
  }

  async downloadDoc(docId: string, fileName: string): Promise<void> {
    const id = this.selectedId();
    if (!id) return;
    try {
      const blob = await firstValueFrom(this.onboardingApi.downloadHrDocument(id, docId));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      this.toast.danger('Download', err instanceof Error ? err.message : 'Failed');
    }
  }

  formatDate(value: string | null | undefined): string {
    return value ? formatSgDate(value) : '—';
  }

  private patchDetailForms(d: OnboardingDetailDto): void {
    this.programmeForm.patchValue({
      medicalStatus: d.medicalStatus,
      sipStatus: d.sipStatus,
      onboardProgrammeStatus: d.onboardProgrammeStatus,
      quarantineStatus: d.quarantineStatus,
    });
    if (d.arrival) {
      this.preArrivalForm.patchValue({
        plannedArrivalDate: d.arrival.plannedArrivalDate ?? '',
        flightNumber: d.arrival.flightNumber ?? '',
        arrivalAirport: d.arrival.arrivalAirport ?? 'Changi',
        accommodationAddress: d.arrival.accommodationAddress ?? '',
        housingConfirmed: d.arrival.housingConfirmed,
        bondArranged: d.arrival.bondArranged,
        insuranceArranged: d.arrival.insuranceArranged,
      });
      this.arrivalForm.patchValue({
        actualArrivalDate: d.arrival.actualArrivalDate ?? '',
        flightNumber: d.arrival.flightNumber ?? '',
        arrivalAirport: d.arrival.arrivalAirport ?? '',
        accommodationAddress: d.arrival.accommodationAddress ?? '',
        housingConfirmed: d.arrival.housingConfirmed,
        employeeConfirmed: d.arrival.employeeConfirmed,
      });
    }
    if (d.workPass) {
      this.ipaForm.patchValue({
        ipaNumber: d.workPass.ipaNumber ?? '',
        ipaIssueDate: d.workPass.ipaIssueDate ?? '',
        ipaExpiryDate: d.workPass.ipaExpiryDate ?? '',
      });
      this.wpForm.patchValue({
        wpNumber: d.workPass.wpNumber ?? '',
        wpIssueDate: d.workPass.wpIssueDate ?? '',
        wpExpiryDate: d.workPass.wpExpiryDate ?? '',
        finNumber: d.workPass.finNumber ?? '',
        cardCollected: d.workPass.cardCollected,
      });
    }
    this.patchOpts(d.employeeId, {
      createLogin: d.accountStatus !== 'ACTIVE',
      email: d.personalEmail ?? '',
    });
  }

  private async reload(): Promise<void> {
    const data = await firstValueFrom(this.onboardingApi.summary());
    this.summary.set(data);
    this.apiCandidates.set(data.candidates ?? []);
    for (const row of data.candidates ?? []) {
      if (!this.activateOpts()[row.id]) {
        this.patchOpts(row.id, {
          createLogin: row.accountStatus !== 'ACTIVE',
          email: row.personalEmail ?? '',
        });
      }
    }
    const sel = this.selectedId();
    if (sel && data.candidates?.some((c) => c.id === sel)) {
      const d = await firstValueFrom(this.onboardingApi.detail(sel));
      this.detail.set(d);
      this.patchDetailForms(d);
    }
  }

  private resetHireForm(): void {
    this.hireForm.reset({
      fullName: '',
      email: '',
      mobile: '',
      department: 'Projects',
      role: '',
      employmentType: 'WP',
      startDate: new Date().toISOString().slice(0, 10),
      sendInvitation: false,
      workerCategory: 'Construction',
      sector: '',
    });
  }
}
