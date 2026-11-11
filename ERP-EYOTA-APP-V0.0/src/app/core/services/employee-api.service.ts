import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BackendHttpService } from './backend-http.service';

/** Matches backend EmployeeEntity enums. */
export type EmploymentTypeApi =
  | 'FULL_TIME'
  | 'PART_TIME'
  | 'CONTRACT'
  | 'INTERN'
  | 'TEMPORARY';
export type EmploymentStatusApi =
  | 'PENDING'
  | 'ACTIVE'
  | 'PROBATION'
  | 'NOTICE'
  | 'TERMINATED'
  | 'RESIGNED'
  | 'ON_LEAVE';
export type WorkLocationModeApi = 'OFFICE' | 'HYBRID' | 'REMOTE' | 'SITE';

export interface EmployeeDto {
  id: string;
  employeeCode: string;
  fullName: string;
  department: string | null;
  designation: string | null;
  employmentType: EmploymentTypeApi;
  employmentStatus: EmploymentStatusApi;
  workLocationMode: WorkLocationModeApi;
  workplaceId: string | null;
  managerEmployeeId: string | null;
  dateOfJoining: string | null;
  probationEnd: string | null;
  mobile: string | null;
  personalEmail: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  nationality: string | null;
  residentialAddress: string | null;
  alternativeContact: string | null;
  workPassType: string | null;
  workPassNumber: string | null;
  workPassExpiry: string | null;
  finNumber: string | null;
  passportNumber: string | null;
  passportExpiry: string | null;
  paymentMode: string | null;
  bankName: string | null;
  bankAccountMasked: string | null;
  basicPay: number | null;
  overtimeRate: number | null;
  salaryPeriod: string | null;
  allowancesTotal: number | null;
  payrollStartDate: string | null;
  currency: string | null;
  invitationEmailStatus: string | null;
  accountStatus: string | null;
  active: boolean;
}

export interface EmployeeProfileUpdateRequest {
  dateOfBirth?: string | null;
  gender?: string | null;
  nationality?: string | null;
  residentialAddress?: string | null;
  mobile?: string | null;
  alternativeContact?: string | null;
  passportNumber?: string | null;
  passportExpiry?: string | null;
}

export interface EmployeeUpsertRequest {
  employeeCode: string;
  fullName: string;
  department?: string | null;
  designation?: string | null;
  employmentType?: EmploymentTypeApi;
  employmentStatus?: EmploymentStatusApi;
  workLocationMode?: WorkLocationModeApi;
  workplaceId?: string | null;
  managerEmployeeId?: string | null;
  dateOfJoining?: string | null;
  mobile?: string | null;
  personalEmail?: string | null;
  active?: boolean;
}

export interface PayrollReadinessResponse {
  employeeId: string;
  employeeCode: string;
  ready: boolean;
  missingFields: string[];
  message: string;
}

@Injectable({ providedIn: 'root' })
export class EmployeeApiService {
  private readonly http = inject(BackendHttpService);

  list(): Observable<EmployeeDto[]> {
    return this.http.get<EmployeeDto[]>('/employees');
  }

  me(): Observable<EmployeeDto> {
    return this.http.get<EmployeeDto>('/employees/me');
  }

  updateMyProfile(body: EmployeeProfileUpdateRequest): Observable<EmployeeDto> {
    return this.http.put<EmployeeDto>('/employees/me/profile', body);
  }

  get(id: string): Observable<EmployeeDto> {
    return this.http.get<EmployeeDto>(`/employees/${id}`);
  }

  create(body: EmployeeUpsertRequest): Observable<EmployeeDto> {
    return this.http.post<EmployeeDto>('/employees', body);
  }

  update(id: string, body: EmployeeUpsertRequest): Observable<EmployeeDto> {
    return this.http.put<EmployeeDto>(`/employees/${id}`, body);
  }

  setStatus(id: string, active: boolean): Observable<EmployeeDto> {
    return this.http.put<EmployeeDto>(`/employees/${id}/status`, { active });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`/employees/${id}`);
  }

  payrollReadiness(id: string): Observable<PayrollReadinessResponse> {
    return this.http.get<PayrollReadinessResponse>(`/hr/employees/${id}/payroll-readiness`);
  }

  /** Premium Employee Master Dossier PDF (COMPLETE | EMPLOYEE_COPY). */
  exportDossier(id: string, mode: 'COMPLETE' | 'EMPLOYEE_COPY' = 'COMPLETE'): Observable<Blob> {
    return this.http.getBlob(`/employees/${id}/export/dossier?mode=${mode}`);
  }
}
