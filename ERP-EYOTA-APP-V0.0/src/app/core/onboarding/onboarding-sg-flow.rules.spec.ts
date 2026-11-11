import {
  applies,
  applicableSteps,
  isReadyToWork,
  readyToWorkBlockers,
  wpIssuanceBlockers,
  MEDICAL_UNFIT_WARNING,
  type SgStepState,
  type SgWorkerContext,
} from './onboarding-sg-flow.rules';

function worker(partial: Partial<SgWorkerContext>): SgWorkerContext {
  return {
    foreignWorker: true,
    nationality: 'India',
    gender: 'Male',
    sector: 'Construction',
    ...partial,
  };
}

function done(overrides: Partial<SgStepState> = {}): SgStepState {
  return {
    securityBondPurchased: true,
    medicalInsuranceRecorded: true,
    pcpRecorded: true,
    housingMomRegistered: true,
    ipaRecorded: true,
    onboardCentreDone: true,
    sipDone: true,
    medicalFit: true,
    medicalUnfit: false,
    medicalPending: false,
    constructionSafetyDone: true,
    temporaryPermitValid: false,
    workPermitIssued: true,
    ...overrides,
  };
}

describe('onboardingSgFlowV2 rules', () => {
  it('1. Non-Malaysian male construction → Onboard + safety + bond + PCP; SIP hidden', () => {
    const ctx = worker({
      nationality: 'Bangladesh',
      gender: 'Male',
      sector: 'Construction',
      dormCapacity: 8,
      workPassApplicationDate: '2026-12-01',
    });
    const steps = applicableSteps(ctx);
    expect(steps).toContain('SG_ONBOARD_CENTRE');
    expect(steps).toContain('SG_CONSTRUCTION_SAFETY');
    expect(steps).toContain('SG_SECURITY_BOND');
    expect(steps).toContain('SG_PCP_INSURANCE');
    expect(steps).not.toContain('SG_SIP');
  });

  it('2. Female CMP → SIP shown, Onboard hidden', () => {
    const ctx = worker({ gender: 'Female', sector: 'CMP' });
    expect(applies('SG_SIP', ctx)).toBe(true);
    expect(applies('SG_ONBOARD_CENTRE', ctx)).toBe(false);
  });

  it('3. Manufacturing non-Malaysian → SIP shown', () => {
    const ctx = worker({ sector: 'Manufacturing', nationality: 'China' });
    expect(applies('SG_SIP', ctx)).toBe(true);
  });

  it('4. Malaysian → bond and Onboard hidden', () => {
    const ctx = worker({ nationality: 'Malaysia', sector: 'Construction', dormCapacity: 10 });
    expect(applies('SG_SECURITY_BOND', ctx)).toBe(false);
    expect(applies('SG_ONBOARD_CENTRE', ctx)).toBe(false);
  });

  it('5. Medical Unfit → issuance blocked, gate locked', () => {
    const ctx = worker({});
    const state = done({ medicalFit: false, medicalUnfit: true, workPermitIssued: false });
    expect(wpIssuanceBlockers(ctx, state)).toContain(MEDICAL_UNFIT_WARNING);
    expect(readyToWorkBlockers(ctx, state).join(' ')).toMatch(/Unfit|revoked/i);
    expect(isReadyToWork(ctx, state)).toBe(false);
  });

  it('6. Application date 2026-11-28 vs 2026-11-29 → TP hidden vs shown', () => {
    expect(
      applies('SG_TEMPORARY_PERMIT', worker({ workPassApplicationDate: '2026-11-28' })),
    ).toBe(false);
    expect(
      applies('SG_TEMPORARY_PERMIT', worker({ workPassApplicationDate: '2026-11-29' })),
    ).toBe(true);
  });

  it('7. Existing record with only old fields → rules still evaluate (no throw)', () => {
    const ctx = worker({
      nationality: null,
      gender: null,
      sector: null,
      dormCapacity: null,
      workPassApplicationDate: null,
      arrivalDate: null,
    });
    expect(() => applicableSteps(ctx)).not.toThrow();
    expect(applicableSteps(ctx).length).toBeGreaterThan(0);
  });

  it('8. Account activation path untouched by gate helpers (smoke)', () => {
    // Gate helpers must not reference OTP/password — pure checklist only
    const src = readyToWorkBlockers.toString() + wpIssuanceBlockers.toString();
    expect(src.toLowerCase()).not.toContain('otp');
    expect(src.toLowerCase()).not.toContain('password');
  });

  it('9. Gate READY only after all applicable steps done', () => {
    const ctx = worker({ sector: 'Manufacturing', workPassApplicationDate: '2026-10-01' });
    expect(isReadyToWork(ctx, done({ sipDone: false }))).toBe(false);
    expect(isReadyToWork(ctx, done({ sipDone: true }))).toBe(true);
  });

  it('10. Header badge never READY while gate pending (contract/PPE still open)', () => {
    const ctx = worker({ sector: 'Manufacturing', workPassApplicationDate: '2026-10-01' });
    // Pass prerequisites ok but WP missing → not ready
    const blockers = readyToWorkBlockers(ctx, done({ workPermitIssued: false, temporaryPermitValid: false }));
    expect(blockers.length).toBeGreaterThan(0);
    expect(isReadyToWork(ctx, done({ workPermitIssued: false }))).toBe(false);
  });
});
