import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BackendHttpService } from './backend-http.service';
import { EmployeeDto } from './employee-api.service';

export type EmploymentTypeEnroll =
  | 'FULL_TIME'
  | 'PART_TIME'
  | 'CONTRACT'
  | 'TEMPORARY';

export type EmploymentStatusEnroll =
  | 'PENDING'
  | 'ACTIVE'
  | 'ON_LEAVE'
  | 'RESIGNED'
  | 'TERMINATED'
  | 'PROBATION'
  | 'NOTICE';

export interface EnrollEmployeeRequest {
  fullName: string;
  email: string;
  mobile: string;
  designation: string;
  employmentType: EmploymentTypeEnroll;
  dateOfJoining: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  residentialAddress: string;
  finNumber: string;
  department?: string | null;
  alternativeContact?: string | null;
  employmentStatus?: EmploymentStatusEnroll | null;
  probationEnd?: string | null;
  managerEmployeeId?: string | null;
  workPassType?: string | null;
  workPassNumber?: string | null;
  workPassExpiry?: string | null;
  passportNumber?: string | null;
  passportExpiry?: string | null;
  paymentMode?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  basicPay: number;
  overtimeRate?: number | null;
  salaryPeriod?: string | null;
  allowancesTotal?: number | null;
  payrollStartDate?: string | null;
}

export type HrEmployeeUpdateRequest = EnrollEmployeeRequest;

export interface EnrollmentResponse {
  invitationId: string;
  employeeId: string;
  employeeCode: string;
  fullName: string;
  workEmail: string;
  employmentStatus: string;
  accountStatus: string;
  invitationEmailStatus: string;
  otpExpiresAt: string;
  debugOtpPreview: string | null;
  message: string;
}

export interface ValidateInvitationResponse {
  valid: boolean;
  maskedEmail: string;
  employeeName: string;
  employeeCode: string;
  message: string;
}

export interface SendActivationOtpResponse {
  accepted: boolean;
  maskedEmail: string;
  otpExpiresAt: string;
  resendCooldownSeconds: number;
  message: string;
  debugOtpPreview: string | null;
}

export interface VerifyOtpResponse {
  valid: boolean;
  activationToken: string;
  message: string;
}

export interface InvitationStatusResponse {
  employeeId: string;
  employeeCode: string;
  email: string;
  employmentStatus: string;
  invitationStatus: string;
  accountStatus: string;
  emailDeliveryStatus: string;
  invitationExpiresAt: string | null;
  lastSentAt: string | null;
  message: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresInMinutes: number;
  user: {
    email: string;
    role: 'ADMIN' | 'HR' | 'EMPLOYEE';
    employeeId: string | null;
    employeeCode: string | null;
    displayName: string;
  };
}

@Injectable({ providedIn: 'root' })
export class EnrollmentApiService {
  private readonly http = inject(BackendHttpService);

  enroll(body: EnrollEmployeeRequest): Observable<EnrollmentResponse> {
    return this.http.post<EnrollmentResponse>('/hr/employees', body);
  }

  update(employeeId: string, body: HrEmployeeUpdateRequest): Observable<EmployeeDto> {
    return this.http.put<EmployeeDto>(`/hr/employees/${employeeId}`, body);
  }

  resendInvitation(employeeId: string): Observable<EnrollmentResponse> {
    return this.http.post<EnrollmentResponse>(`/hr/employees/${employeeId}/invitation`, {});
  }

  invitationStatus(employeeId: string): Observable<InvitationStatusResponse> {
    return this.http.get<InvitationStatusResponse>(`/hr/employees/${employeeId}/invitation-status`);
  }

  validateInvitation(token: string): Observable<ValidateInvitationResponse> {
    return this.http.post<ValidateInvitationResponse>(
      '/auth/employee-activation/validate-invitation',
      { token },
    );
  }

  sendActivationOtp(token: string): Observable<SendActivationOtpResponse> {
    return this.http.post<SendActivationOtpResponse>('/auth/employee-activation/send-otp', {
      token,
    });
  }

  verifyActivationOtp(token: string, otp: string): Observable<VerifyOtpResponse> {
    return this.http.post<VerifyOtpResponse>('/auth/employee-activation/verify-otp', {
      token,
      otp,
    });
  }

  complete(body: {
    activationToken: string;
    newPassword: string;
    confirmPassword: string;
  }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/auth/employee-activation/create-password', body);
  }

  /** Combined OTP verify + password set (keeps step-by-step APIs available). */
  completeCombined(body: {
    token: string;
    otp: string;
    newPassword: string;
    confirmPassword: string;
  }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/auth/employee-activation/complete', body);
  }
}
