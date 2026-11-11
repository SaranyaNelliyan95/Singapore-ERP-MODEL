export const environment = {
  production: true,
  useBackendApi: true,
  /** Default OFF in production until ops enables ONBOARDING_SG_FLOW_V2 on API + this flag. */
  onboardingSgFlowV2: false,
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
