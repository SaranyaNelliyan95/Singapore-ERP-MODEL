import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BackendHttpService } from './backend-http.service';

/** Matches backend `EmployeeEntity` enums (not SG pass types — see PHASE1 mapping gap). */
export type EmploymentTypeApi = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';
export type EmploymentStatusApi =
  | 'ACTIVE'
  | 'PROBATION'
  | 'NOTICE'
  | 'TERMINATED'
  | 'RESIGNED';
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
  mobile: string | null;
  personalEmail: string | null;
  active: boolean;
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

@Injectable({ providedIn: 'root' })
export class EmployeeApiService {
  private readonly http = inject(BackendHttpService);

  list(): Observable<EmployeeDto[]> {
    return this.http.get<EmployeeDto[]>('/employees');
  }

  me(): Observable<EmployeeDto> {
    return this.http.get<EmployeeDto>('/employees/me');
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
}
