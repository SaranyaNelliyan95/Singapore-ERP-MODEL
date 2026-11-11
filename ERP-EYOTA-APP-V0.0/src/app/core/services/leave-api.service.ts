import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BackendHttpService } from './backend-http.service';

export type LeaveRequestStatusApi = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface LeaveTypeDto {
  id: string;
  code: string;
  name: string;
  paid: boolean;
  active: boolean;
}

export interface LeaveRequestDto {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string | null;
  status: LeaveRequestStatusApi;
  decisionNote: string | null;
}

export interface LeaveBalanceDto {
  leaveTypeId: string;
  year: number;
  entitled: number;
  used: number;
  pending: number;
  balance: number;
}

@Injectable({ providedIn: 'root' })
export class LeaveApiService {
  private readonly http = inject(BackendHttpService);

  types(): Observable<LeaveTypeDto[]> {
    return this.http.get<LeaveTypeDto[]>('/leave/types');
  }

  myRequests(): Observable<LeaveRequestDto[]> {
    return this.http.get<LeaveRequestDto[]>('/leave/requests/me');
  }

  myBalances(): Observable<LeaveBalanceDto[]> {
    return this.http.get<LeaveBalanceDto[]>('/leave/balances/me');
  }

  create(body: {
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    days: number;
    reason: string;
  }): Observable<LeaveRequestDto> {
    return this.http.post<LeaveRequestDto>('/leave/requests', body);
  }

  submit(id: string): Observable<LeaveRequestDto> {
    return this.http.post<LeaveRequestDto>(`/leave/requests/${id}/submit`, {});
  }

  pending(): Observable<LeaveRequestDto[]> {
    return this.http.get<LeaveRequestDto[]>('/leave/requests/pending');
  }

  approve(id: string, note?: string): Observable<LeaveRequestDto> {
    return this.http.post<LeaveRequestDto>(`/leave/requests/${id}/approve`, note ? { note } : {});
  }

  reject(id: string, note?: string): Observable<LeaveRequestDto> {
    return this.http.post<LeaveRequestDto>(`/leave/requests/${id}/reject`, note ? { note } : {});
  }
}
