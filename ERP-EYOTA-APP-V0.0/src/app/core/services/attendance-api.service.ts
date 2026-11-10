import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { BackendHttpService } from './backend-http.service';
import { GeoPosition } from './geolocation.service';
import { environment } from '../../../environments/environment';

export type WorkModeApi = 'OFFICE' | 'SITE' | 'WFH';

export interface ClockRequestPayload {
  latitude?: number | null;
  longitude?: number | null;
  accuracyMetres?: number | null;
  clientCapturedAt?: string | null;
  workplaceId?: string | null;
  workMode: WorkModeApi;
}

export interface AttendanceSessionDto {
  id: string;
  employeeId: string;
  employeeName?: string | null;
  employeeCode?: string | null;
  workplaceId: string;
  attendanceDate: string;
  clockInAt: string | null;
  clockOutAt: string | null;
  clockInLat?: number | null;
  clockInLng?: number | null;
  clockInAccuracy?: number | null;
  clockOutLat?: number | null;
  clockOutLng?: number | null;
  clockOutAccuracy?: number | null;
  geofenceResult: string;
  distanceMetres: number | null;
  status: string;
  workMode: WorkModeApi;
}

export interface AttendanceGpsPolicyDto {
  gpsMandatory: boolean;
  updatedAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class AttendanceApiService {
  private readonly http = inject(BackendHttpService);
  private readonly raw = inject(HttpClient);

  getGpsPolicy(): Observable<AttendanceGpsPolicyDto> {
    return this.http.get<AttendanceGpsPolicyDto>('/attendance/gps-policy');
  }

  getAdminGpsPolicy(): Observable<AttendanceGpsPolicyDto> {
    return this.http.get<AttendanceGpsPolicyDto>('/admin/attendance/gps-policy');
  }

  setAdminGpsPolicy(gpsMandatory: boolean): Observable<AttendanceGpsPolicyDto> {
    return this.http.put<AttendanceGpsPolicyDto>('/admin/attendance/gps-policy', { gpsMandatory });
  }

  clockIn(position: GeoPosition | null, workMode: WorkModeApi): Observable<AttendanceSessionDto> {
    return this.http.post<AttendanceSessionDto>('/attendance/clock-in', this.toPayload(position, workMode));
  }

  clockOut(position: GeoPosition | null, workMode: WorkModeApi): Observable<AttendanceSessionDto> {
    return this.http.post<AttendanceSessionDto>('/attendance/clock-out', this.toPayload(position, workMode));
  }

  today(): Observable<AttendanceSessionDto | null> {
    const base = environment.apiBaseUrl.replace(/\/$/, '');
    const token = this.http.accessToken;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return this.raw
      .get<AttendanceSessionDto>(`${base}/attendance/me/today`, {
        headers,
        observe: 'response',
      })
      .pipe(
        map((res) => (res.status === 204 ? null : (res.body ?? null))),
        catchError((err: unknown) => {
          if (err instanceof HttpErrorResponse && err.status === 204) {
            return of(null);
          }
          const message =
            err instanceof HttpErrorResponse
              ? (err.error as { message?: string })?.message || err.message
              : 'Failed to load today attendance';
          return throwError(() => new Error(message));
        }),
      );
  }

  history(): Observable<AttendanceSessionDto[]> {
    return this.http.get<AttendanceSessionDto[]>('/attendance/me/history');
  }

  hrList(from?: string, to?: string): Observable<AttendanceSessionDto[]> {
    return this.http.get<AttendanceSessionDto[]>(this.withRange('/hr/attendance', from, to));
  }

  adminList(from?: string, to?: string): Observable<AttendanceSessionDto[]> {
    return this.http.get<AttendanceSessionDto[]>(this.withRange('/admin/attendance', from, to));
  }

  private withRange(path: string, from?: string, to?: string): string {
    const qs = new URLSearchParams();
    if (from) {
      qs.set('from', from);
    }
    if (to) {
      qs.set('to', to);
    }
    const q = qs.toString();
    return q ? `${path}?${q}` : path;
  }

  private toPayload(position: GeoPosition | null, workMode: WorkModeApi): ClockRequestPayload {
    if (!position) {
      return { workMode, latitude: null, longitude: null, accuracyMetres: null, clientCapturedAt: null };
    }
    return {
      latitude: position.latitude,
      longitude: position.longitude,
      accuracyMetres: position.accuracyMetres,
      clientCapturedAt: position.capturedAt,
      workMode,
    };
  }
}
