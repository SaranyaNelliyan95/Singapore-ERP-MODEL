import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

const TOKEN_KEY = 'eyota.hr.accessToken';

@Injectable({ providedIn: 'root' })
export class BackendHttpService {
  private readonly http = inject(HttpClient);

  get accessToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  setAccessToken(token: string | null): void {
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
    }
  }

  get<T>(path: string): Observable<T> {
    return this.http
      .get<T>(this.url(path), { headers: this.authHeaders() })
      .pipe(catchError((err) => this.mapError(err)));
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .post<T>(this.url(path), body, { headers: this.authHeaders() })
      .pipe(catchError((err) => this.mapError(err)));
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .put<T>(this.url(path), body, { headers: this.authHeaders() })
      .pipe(catchError((err) => this.mapError(err)));
  }

  delete<T>(path: string): Observable<T> {
    return this.http
      .delete<T>(this.url(path), { headers: this.authHeaders() })
      .pipe(catchError((err) => this.mapError(err)));
  }

  private url(path: string): string {
    const base = environment.apiBaseUrl.replace(/\/$/, '');
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${base}${p}`;
  }

  private authHeaders(): HttpHeaders {
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const token = this.accessToken;
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  private mapError(err: unknown): Observable<never> {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as { message?: string; error?: string } | string | null;
      const message =
        typeof body === 'string'
          ? body
          : body?.message || body?.error || err.message || `HTTP ${err.status}`;
      return throwError(() => new Error(message));
    }
    return throwError(() => err);
  }
}
