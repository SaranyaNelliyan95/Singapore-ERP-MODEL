import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BackendHttpService } from './backend-http.service';

export type ClaimStatusApi =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAID'
  | 'CANCELLED';

export interface ClaimRequestDto {
  id: string;
  employeeId: string;
  category: string;
  claimDate: string;
  amount: number;
  currency: string;
  description: string | null;
  status: ClaimStatusApi;
  decisionNote: string | null;
}

@Injectable({ providedIn: 'root' })
export class ClaimsApiService {
  private readonly http = inject(BackendHttpService);

  myClaims(): Observable<ClaimRequestDto[]> {
    return this.http.get<ClaimRequestDto[]>('/claims/me');
  }

  create(body: {
    category: string;
    claimDate: string;
    amount: number;
    currency?: string;
    description?: string;
  }): Observable<ClaimRequestDto> {
    return this.http.post<ClaimRequestDto>('/claims', body);
  }

  submit(id: string): Observable<ClaimRequestDto> {
    return this.http.post<ClaimRequestDto>(`/claims/${id}/submit`, {});
  }

  pending(): Observable<ClaimRequestDto[]> {
    return this.http.get<ClaimRequestDto[]>('/claims/pending');
  }

  approve(id: string, note?: string): Observable<ClaimRequestDto> {
    return this.http.post<ClaimRequestDto>(`/claims/${id}/approve`, note ? { note } : {});
  }

  reject(id: string, note?: string): Observable<ClaimRequestDto> {
    return this.http.post<ClaimRequestDto>(`/claims/${id}/reject`, note ? { note } : {});
  }
}
