import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracyMetres: number;
  capturedAt: string;
}

export type GeoFailureCode =
  | 'UNSUPPORTED'
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT'
  | 'INACCURATE'
  | 'UNKNOWN';

export class GeoLocationError extends Error {
  constructor(
    readonly code: GeoFailureCode,
    message: string,
  ) {
    super(message);
    this.name = 'GeoLocationError';
  }
}

/**
 * Real browser Geolocation API — no simulated coordinates.
 * Requires a secure context (HTTPS or localhost). Cannot enable device GPS remotely.
 */
@Injectable({ providedIn: 'root' })
export class GeolocationService {
  isSupported(): boolean {
    return typeof navigator !== 'undefined' && !!navigator.geolocation;
  }

  async queryPermission(): Promise<PermissionState | 'unsupported'> {
    if (!navigator.permissions?.query) {
      return 'unsupported';
    }
    try {
      const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      return status.state;
    } catch {
      return 'unsupported';
    }
  }

  getCurrentPosition(): Promise<GeoPosition> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        reject(
          new GeoLocationError(
            'UNSUPPORTED',
            'This browser does not support geolocation. Use a modern browser on HTTPS or localhost.',
          ),
        );
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const accuracy = pos.coords.accuracy;
          if (
            accuracy != null &&
            accuracy > environment.gps.maxAccuracyMetres
          ) {
            reject(
              new GeoLocationError(
                'INACCURATE',
                `Location accuracy is ±${Math.round(accuracy)} m (max ${environment.gps.maxAccuracyMetres} m). Move outdoors or wait for a better GPS fix, then retry.`,
              ),
            );
            return;
          }
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracyMetres: accuracy ?? 999,
            capturedAt: new Date(pos.timestamp).toISOString(),
          });
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            reject(
              new GeoLocationError(
                'PERMISSION_DENIED',
                'Location permission was denied. Enable location for this site in your browser settings, turn on device location services, then retry. The app cannot turn GPS on for you.',
              ),
            );
            return;
          }
          if (err.code === err.POSITION_UNAVAILABLE) {
            reject(
              new GeoLocationError(
                'POSITION_UNAVAILABLE',
                'Location is unavailable. Check that device location services are on and try again.',
              ),
            );
            return;
          }
          if (err.code === err.TIMEOUT) {
            reject(
              new GeoLocationError(
                'TIMEOUT',
                'Timed out while waiting for GPS. Move to an open area and retry.',
              ),
            );
            return;
          }
          reject(new GeoLocationError('UNKNOWN', err.message || 'Unable to read location.'));
        },
        {
          enableHighAccuracy: environment.gps.enableHighAccuracy,
          timeout: environment.gps.timeoutMs,
          maximumAge: environment.gps.maximumAgeMs,
        },
      );
    });
  }
}
