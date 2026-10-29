import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BackendHttpService } from './backend-http.service';

export interface EnrollEmployeeRequest {
  employeeCode: string;
  fullName: string;
  workEmail: string;
  department?: string | null;
  designation?: string | null;
  employmentType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';
  employmentStatus?: 'ACTIVE' | 'PROBATION' | 'NOTICE' | 'TERMINATED' | 'RESIGNED';
  workLocationMode?: 'OFFICE' | 'HYBRID' | 'REMOTE' | 'SITE';
  workplaceId?: string | null;
  managerEmployeeId?: string | null;
  dateOfJoining?: string | null;
  mobile?: string | null;
}

export interface EnrollmentResponse {
  invitationId: string;
  employeeId: string;
  employeeCode: string;
  fullName: string;
  workEmail: string;
  status: string;
  otpExpiresAt: string;
  devOtpPreview: string | null;
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
    return this.http.post<EnrollmentResponse>('/hr/enrollments', body);
  }

  resendOtp(employeeId: string): Observable<EnrollmentResponse> {
    return this.http.post<EnrollmentResponse>(`/hr/enrollments/${employeeId}/resend-otp`, {});
  }

  verifyOtp(email: string, otp: string): Observable<{ valid: boolean; message: string }> {
    return this.http.post<{ valid: boolean; message: string }>('/auth/activate/verify-otp', {
      email,
      otp,
    });
  }

  complete(body: {
    email: string;
    otp: string;
    newPassword: string;
    confirmPassword: string;
  }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/auth/activate/complete', body);
  }
}
