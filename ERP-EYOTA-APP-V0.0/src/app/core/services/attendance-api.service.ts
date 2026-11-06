import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { BackendHttpService } from './backend-http.service';
import { GeoPosition } from './geolocation.service';
import { environment } from '../../../environments/environment';

export type WorkModeApi = 'OFFICE' | 'SITE' | 'WFH';

export interface ClockRequestPayload {
  latitude: number;
  longitude: number;
  accuracyMetres: number;
  clientCapturedAt: string;
  workplaceId?: string | null;
  workMode: WorkModeApi;
}

export interface AttendanceSessionDto {
  id: string;
  employeeId: string;
  workplaceId: string;
  attendanceDate: string;
  clockInAt: string | null;
  clockOutAt: string | null;
  geofenceResult: string;
  distanceMetres: number | null;
  status: string;
  workMode: WorkModeApi;
}

@Injectable({ providedIn: 'root' })
export class AttendanceApiService {
  private readonly http = inject(BackendHttpService);
  private readonly raw = inject(HttpClient);

  clockIn(position: GeoPosition, workMode: WorkModeApi): Observable<AttendanceSessionDto> {
    return this.http.post<AttendanceSessionDto>('/attendance/clock-in', this.toPayload(position, workMode));
  }

  clockOut(position: GeoPosition, workMode: WorkModeApi): Observable<AttendanceSessionDto> {
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

  private toPayload(position: GeoPosition, workMode: WorkModeApi): ClockRequestPayload {
    return {
      latitude: position.latitude,
      longitude: position.longitude,
      accuracyMetres: position.accuracyMetres,
      clientCapturedAt: position.capturedAt,
      workMode,
    };
  }
}
