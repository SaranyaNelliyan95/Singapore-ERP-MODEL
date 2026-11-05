import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BackendHttpService } from './backend-http.service';

export interface OnboardingCandidateDto {
  id: string;
  employeeCode: string;
  candidateName: string;
  role: string | null;
  department: string | null;
  startDate: string | null;
  stage: string;
  employmentType: string | null;
  workPassType: string | null;
  checklistProgress: number;
  personalEmail: string | null;
  mobile: string | null;
  employmentStatus: string | null;
  invitationEmailStatus: string | null;
  accountStatus: string | null;
  pipelineStatus?: string | null;
  foreignWorker?: boolean;
  workerCategory?: string | null;
}

export interface OnboardingSummaryDto {
  totalActive: number;
  offerCount: number;
  momFormsCount: number;
  medicalCount: number;
  orientationCount: number;
  candidates: OnboardingCandidateDto[];
}

export interface CreateOnboardingDraftRequest {
  fullName: string;
  email: string;
  mobile: string;
  role: string;
  department: string;
  startDate: string;
  employmentPassType: string;
  sendInvitation: boolean;
  workerCategory?: string | null;
  sector?: string | null;
  nationalityCode?: string | null;
}

export interface OnboardingActivateResponse {
  employeeId: string;
  employeeCode: string;
  loginEmail: string | null;
  invitationEmailStatus: string | null;
  message: string;
}

export interface OnboardingDocumentDto {
  id: string;
  docType: string;
  fileName: string;
  contentType: string | null;
  sizeBytes: number | null;
  issueDate: string | null;
  expiryDate: string | null;
  approvalStatus: string;
  versionNo: number;
  visibility: string;
  viewedByEmployee: boolean;
  downloadedByEmployee: boolean;
  uploadedAt: string | null;
}

export interface OnboardingTaskDto {
  id: string;
  taskCode: string;
  title: string;
  stageGate: string | null;
  status: string;
  mandatory: boolean;
  dueDate: string | null;
  completedAt: string | null;
  notes: string | null;
  sortOrder: number;
}

export interface OnboardingDetailDto {
  employeeId: string;
  onboardingId: string;
  employeeCode: string;
  candidateName: string;
  personalEmail: string | null;
  mobile: string | null;
  role: string | null;
  department: string | null;
  workPassType: string | null;
  foreignWorker: boolean;
  workerCategory: string | null;
  sector: string | null;
  pipelineStatus: string;
  legacyStage: string;
  checklistProgress: number;
  employmentStatus: string | null;
  invitationEmailStatus: string | null;
  accountStatus: string | null;
  medicalStatus: string;
  sipStatus: string;
  onboardProgrammeStatus: string;
  quarantineStatus: string;
  contractAckRequired: boolean;
  ppeRequired: boolean;
  inductionRequired: boolean;
  readyBlockedReason: string | null;
  overrideReason: string | null;
  notes: string | null;
  arrival: {
    plannedArrivalDate: string | null;
    actualArrivalDate: string | null;
    flightNumber: string | null;
    arrivalAirport: string | null;
    accommodationAddress: string | null;
    housingConfirmed: boolean;
    bondArranged: boolean;
    insuranceArranged: boolean;
    employeeConfirmed: boolean;
    notes: string | null;
  } | null;
  workPass: {
    ipaNumber: string | null;
    ipaIssueDate: string | null;
    ipaExpiryDate: string | null;
    wpNumber: string | null;
    wpIssueDate: string | null;
    wpExpiryDate: string | null;
    finNumber: string | null;
    cardCollected: boolean;
    notes: string | null;
  } | null;
  tasks: OnboardingTaskDto[];
  documents: OnboardingDocumentDto[];
  ppeItems: {
    id: string;
    itemCode: string;
    itemName: string;
    quantity: number;
    issuedAt: string | null;
    employeeConfirmed: boolean;
    confirmedAt: string | null;
  }[];
  acknowledgements: { ackType: string; acknowledged: boolean; acknowledgedAt: string | null }[];
  appointments: {
    id: string;
    appointmentType: string;
    scheduledAt: string | null;
    location: string | null;
    outcome: string;
    notes: string | null;
  }[];
  auditLogs: {
    createdAt: string;
    action: string;
    fromStatus: string | null;
    toStatus: string | null;
    details: string | null;
  }[];
  readinessGates: string[];
}

@Injectable({ providedIn: 'root' })
export class OnboardingApiService {
  private readonly http = inject(BackendHttpService);

  summary(): Observable<OnboardingSummaryDto> {
    return this.http.get<OnboardingSummaryDto>('/hr/onboarding');
  }

  adminSummary(): Observable<OnboardingSummaryDto> {
    return this.http.get<OnboardingSummaryDto>('/admin/onboarding');
  }

  detail(employeeId: string): Observable<OnboardingDetailDto> {
    return this.http.get<OnboardingDetailDto>(`/hr/onboarding/${employeeId}`);
  }

  adminDetail(employeeId: string): Observable<OnboardingDetailDto> {
    return this.http.get<OnboardingDetailDto>(`/admin/onboarding/${employeeId}`);
  }

  myOnboarding(): Observable<OnboardingDetailDto> {
    return this.http.get<OnboardingDetailDto>('/employee/onboarding/me');
  }

  createDraft(body: CreateOnboardingDraftRequest): Observable<OnboardingCandidateDto> {
    return this.http.post<OnboardingCandidateDto>('/hr/onboarding/drafts', body);
  }

  advance(employeeId: string): Observable<OnboardingCandidateDto> {
    return this.http.post<OnboardingCandidateDto>(`/hr/onboarding/${employeeId}/advance`, {});
  }

  activate(
    employeeId: string,
    body: { createLogin: boolean; email?: string | null },
  ): Observable<OnboardingActivateResponse> {
    return this.http.post<OnboardingActivateResponse>(`/hr/onboarding/${employeeId}/activate`, body);
  }

  sendInvitation(employeeId: string): Observable<OnboardingCandidateDto> {
    return this.http.post<OnboardingCandidateDto>(`/hr/onboarding/${employeeId}/send-invitation`, {});
  }

  setStatus(employeeId: string, body: { status: string; reason?: string; forceOverride?: boolean }) {
    return this.http.post<OnboardingDetailDto>(`/hr/onboarding/${employeeId}/status`, body);
  }

  momApplication(employeeId: string, body: Record<string, unknown>) {
    return this.http.post<OnboardingDetailDto>(`/hr/onboarding/${employeeId}/mom-application`, body);
  }

  recordIpa(employeeId: string, body: Record<string, unknown>) {
    return this.http.post<OnboardingDetailDto>(`/hr/onboarding/${employeeId}/ipa`, body);
  }

  preArrival(employeeId: string, body: Record<string, unknown>) {
    return this.http.put<OnboardingDetailDto>(`/hr/onboarding/${employeeId}/pre-arrival`, body);
  }

  arrival(employeeId: string, body: Record<string, unknown>) {
    return this.http.put<OnboardingDetailDto>(`/hr/onboarding/${employeeId}/arrival`, body);
  }

  programmes(employeeId: string, body: Record<string, unknown>) {
    return this.http.put<OnboardingDetailDto>(`/hr/onboarding/${employeeId}/programmes`, body);
  }

  workPermit(employeeId: string, body: Record<string, unknown>) {
    return this.http.post<OnboardingDetailDto>(`/hr/onboarding/${employeeId}/work-permit`, body);
  }

  issuePpe(employeeId: string, body: { items: { itemCode: string; itemName: string; quantity: number }[] }) {
    return this.http.post<OnboardingDetailDto>(`/hr/onboarding/${employeeId}/ppe`, body);
  }

  completeReady(
    employeeId: string,
    body: { createLogin: boolean; email?: string | null; sendProgressEmail?: boolean },
  ) {
    return this.http.post<OnboardingActivateResponse>(`/hr/onboarding/${employeeId}/complete-ready`, body);
  }

  uploadDocument(
    employeeId: string,
    file: File,
    docType: string,
    opts?: { issueDate?: string; expiryDate?: string; visibility?: string },
  ): Observable<OnboardingDocumentDto> {
    const form = new FormData();
    form.append('file', file);
    const params = new URLSearchParams({ docType });
    if (opts?.issueDate) params.set('issueDate', opts.issueDate);
    if (opts?.expiryDate) params.set('expiryDate', opts.expiryDate);
    if (opts?.visibility) params.set('visibility', opts.visibility);
    return this.http.postFormData<OnboardingDocumentDto>(
      `/hr/onboarding/${employeeId}/documents?${params.toString()}`,
      form,
    );
  }

  downloadHrDocument(employeeId: string, documentId: string): Observable<Blob> {
    return this.http.getBlob(`/hr/onboarding/${employeeId}/documents/${documentId}/download`);
  }

  downloadMyDocument(documentId: string): Observable<Blob> {
    return this.http.getBlob(`/employee/onboarding/documents/${documentId}/download`);
  }

  confirmArrival(): Observable<OnboardingDetailDto> {
    return this.http.post<OnboardingDetailDto>('/employee/onboarding/confirm-arrival', {});
  }

  ackContract(): Observable<OnboardingDetailDto> {
    return this.http.post<OnboardingDetailDto>('/employee/onboarding/ack-contract', {});
  }

  confirmPpe(): Observable<OnboardingDetailDto> {
    return this.http.post<OnboardingDetailDto>('/employee/onboarding/confirm-ppe', {});
  }
}
