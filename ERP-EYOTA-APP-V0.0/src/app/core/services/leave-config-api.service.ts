import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BackendHttpService } from './backend-http.service';

export interface LeaveConfigDto {
  id: string;
  code: string;
  name: string;
  annualDays: number;
  notes: string | null;
  statutoryReviewFlag: boolean;
  active: boolean;
}

export interface LeaveConfigUpdateItem {
  code: string;
  annualDays: number;
  notes?: string | null;
}

@Injectable({ providedIn: 'root' })
export class LeaveConfigApiService {
  private readonly http = inject(BackendHttpService);

  list(): Observable<LeaveConfigDto[]> {
    return this.http.get<LeaveConfigDto[]>('/admin/master-data/leave-configurations');
  }

  update(items: LeaveConfigUpdateItem[]): Observable<LeaveConfigDto[]> {
    return this.http.put<LeaveConfigDto[]>('/admin/master-data/leave-configurations', items);
  }
}
