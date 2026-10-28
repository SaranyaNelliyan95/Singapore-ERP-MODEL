export const environment = {
  production: false,
  /**
   * Set true when Spring Boot is running (see ../backend/README.md).
   * When true: login + GPS clock-in/out use real APIs (no mock success).
   * When false: existing localStorage demo auth/attendance remains.
   */
  useBackendApi: true,
  apiBaseUrl: '/api/v1',
  gps: {
    enableHighAccuracy: true,
    timeoutMs: 15000,
    maximumAgeMs: 0,
    /** Soft client hint; server enforces GPS_MAX_ACCURACY_METRES */
    maxAccuracyMetres: 50,
  },
};
