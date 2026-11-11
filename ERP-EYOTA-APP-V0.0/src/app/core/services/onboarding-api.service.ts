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
  /** ISO timestamp when Ready to Work was first reached. */
  readyToWorkAt?: string | null;
  /** True when pipeline is READY_TO_WORK (shown in Active list for 7 days). */
  onboardingCompleted?: boolean;
}

export interface OnboardingSummaryDto {
  totalActive: number;
  offerCount: number;
  momFormsCount: number;
  medicalCount: number;
  orientationCount: number;
  candidates: OnboardingCandidateDto[];
}

export interface OnboardingLatestRequestDto {
  requestType: string;
  title: string;
  summary: string;
  employeeId: string;
  employeeCode: string;
  candidateName: string;
  documentId: string | null;
  fileName: string | null;
  contentType: string | null;
  createdAt: string | null;
  actionLabel: string;
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
  applies?: boolean;
  warningText?: string | null;
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
    accommodationType?: string | null;
    dormCapacity?: number | null;
    momAddressRegistered?: boolean | null;
    pcpRecorded?: boolean | null;
    medicalInsuranceRecorded?: boolean | null;
    securityBondPurchased?: boolean | null;
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
    ipaExtensionRequested?: boolean | null;
    tpNumber?: string | null;
    tpIssueDate?: string | null;
    tpExpiryDate?: string | null;
    tpValid?: boolean;
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
  ppePhoto?: {
    documentId: string;
    fileName: string;
    contentType: string | null;
    uploadedAt: string | null;
    hrVerified: boolean;
    hrVerifiedAt: string | null;
  } | null;
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
  /** Present when API onboardingSgFlowV2 / sg-flow-v2 is enabled. */
  sgFlow?: OnboardingSgFlowDto | null;
}

export interface OnboardingSgFlowDto {
  enabled: boolean;
  readyToWork: boolean;
  readyGateLocked: boolean;
  wpIssuanceBlocked: boolean;
  medicalUnfitWarning: string | null;
  wpIssuanceBlockers: string[];
  readyToWorkBlockers: string[];
  deadlineWarnings: string[];
  applicableStepCodes: string[];
  worker: {
    nationality: string | null;
    nationalityCode: string | null;
    gender: string | null;
    sector: string | null;
    workerCategory: string | null;
    accommodationType: string | null;
    dormCapacity: number | null;
    workPassApplicationDate: string | null;
    arrivalDate: string | null;
    malaysian: boolean;
    cmpSector: boolean;
    constructionSector: boolean;
    manufacturingSector: boolean;
    pcpRequired: boolean;
  };
  compliance: {
    securityBondPurchased: boolean | null;
    medicalInsuranceRecorded: boolean | null;
    pcpRecorded: boolean | null;
    momAddressRegistered: boolean | null;
    ipaExtensionRequested: boolean | null;
    constructionSafetyStatus: string | null;
    tpNumber: string | null;
    tpIssueDate: string | null;
    tpExpiryDate: string | null;
    tpValid: boolean;
    finNumberMasked: string | null;
    passportNumberMasked: string | null;
  };
  /** Shared with Still required — READY only when every applicable step is COMPLETED. */
  gateLabel?: string;
  gateProgressPercent?: number;
}

@Injectable({ providedIn: 'root' })
export class OnboardingApiService {
  private readonly http = inject(BackendHttpService);

  summary(): Observable<OnboardingSummaryDto> {
    return this.http.get<OnboardingSummaryDto>('/hr/onboarding');
  }

  latestRequests(): Observable<OnboardingLatestRequestDto[]> {
    return this.http.get<OnboardingLatestRequestDto[]>('/hr/onboarding/latest-requests');
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

  /** Confirmation emails also appear here (CONTRACT / PPE) — mail/WhatsApp unchanged. */
  myLatestRequests(): Observable<OnboardingLatestRequestDto[]> {
    return this.http.get<OnboardingLatestRequestDto[]>('/employee/onboarding/latest-requests');
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

  temporaryPermit(employeeId: string, body: Record<string, unknown>) {
    return this.http.post<OnboardingDetailDto>(`/hr/onboarding/${employeeId}/temporary-permit`, body);
  }

  markInduction(employeeId: string, body: { trainerName: string; inductionDate?: string | null }) {
    return this.http.post<OnboardingDetailDto>(`/hr/onboarding/${employeeId}/induction`, body);
  }

  notificationOutbox() {
    return this.http.get<
      {
        id: string;
        channel: string;
        destinationMasked: string;
        subject: string;
        bodyPreview: string;
        status: string;
        createdAt: string;
      }[]
    >('/hr/onboarding/notification-outbox');
  }

  issuePpe(employeeId: string, body: { items: { itemCode: string; itemName: string; quantity: number }[] }) {
    return this.http.post<OnboardingDetailDto>(`/hr/onboarding/${employeeId}/ppe`, body);
  }

  verifyPpePhoto(employeeId: string) {
    return this.http.post<OnboardingDetailDto>(`/hr/onboarding/${employeeId}/ppe-photo/verify`, {});
  }

  confirmPpePhoto(file: File, token?: string | null) {
    const form = new FormData();
    form.append('file', file);
    const qs = token ? `?t=${encodeURIComponent(token)}` : '';
    return this.http.postFormData<OnboardingDetailDto>(`/employee/onboarding/confirm-ppe-photo${qs}`, form);
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

  /** HR: email + WhatsApp secure confirmation links (ARRIVAL / CONTRACT / PPE). */
  sendConfirmationLinks(employeeId: string) {
    return this.http.post<{ actionType: string; path: string; emailQueued: boolean; whatsappQueued: boolean }[]>(
      `/hr/onboarding/${employeeId}/send-confirmation-links`,
      {},
    );
  }

  /** HR: send one secure confirmation link (e.g. CONTRACT for employee acknowledgement). */
  sendConfirmationLink(employeeId: string, actionType: 'ARRIVAL' | 'CONTRACT' | 'PPE') {
    return this.http.post<{
      actionType: string;
      path: string;
      emailQueued: boolean;
      whatsappQueued: boolean;
    }>(`/hr/onboarding/${employeeId}/send-confirmation-link/${actionType}`, {});
  }
}
