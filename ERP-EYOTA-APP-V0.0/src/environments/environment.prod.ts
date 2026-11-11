export const environment = {
  production: true,
  useBackendApi: true,
  apiBaseUrl: '/api/v1',
  gps: {
    enableHighAccuracy: true,
    timeoutMs: 20000,
    maximumAgeMs: 0,
    maxAccuracyMetres: 150,
    retryAttempts: 3,
    retryDelayMs: 1500,
  },
};
