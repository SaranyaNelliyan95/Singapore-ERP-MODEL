export const environment = {
  production: false,
  /**
   * Set true when Spring Boot is running (see ../backend/README.md).
   * When true: login + GPS clock-in/out use real APIs (no mock success).
   * When false: existing localStorage demo auth/attendance remains.
   */
  useBackendApi: true,
  /** Singapore MOM onboarding checklist / gate v2 (local default ON). */
  onboardingSgFlowV2: true,
  apiBaseUrl: 'http://localhost:8080/api/v1',
  gps: {
    enableHighAccuracy: true,
    timeoutMs: 20000,
    maximumAgeMs: 0,
    /**
     * Browser Wi‑Fi / indoor fixes are often 80–150 m. Server uses GPS_MAX_ACCURACY_METRES
     * (default 150). Client retries briefly for a better fix before rejecting.
     */
    maxAccuracyMetres: 150,
    retryAttempts: 3,
    retryDelayMs: 1500,
  },
};
