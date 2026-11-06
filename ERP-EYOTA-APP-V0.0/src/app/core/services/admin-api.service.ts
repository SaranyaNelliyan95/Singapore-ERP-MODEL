import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BackendHttpService } from './backend-http.service';

export interface AdminUserDto {
  id: string;
  email: string;
  displayName: string;
  role: 'ADMIN' | 'HR' | 'EMPLOYEE';
  employeeId: string | null;
  employeeCode: string | null;
  active: boolean;
  status: 'Active' | 'Inactive' | string;
}

export interface RoleSummaryDto {
  role: 'ADMIN' | 'HR' | 'EMPLOYEE';
  count: number;
  activeCount: number;
}

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(BackendHttpService);

  listUsers(): Observable<AdminUserDto[]> {
    return this.http.get<AdminUserDto[]>('/admin/users');
  }

  listRoles(): Observable<RoleSummaryDto[]> {
    return this.http.get<RoleSummaryDto[]>('/admin/roles');
  }

  setUserStatus(userId: string, active: boolean): Observable<AdminUserDto> {
    return this.http.put<AdminUserDto>(`/admin/users/${userId}/status`, { active });
  }
}
