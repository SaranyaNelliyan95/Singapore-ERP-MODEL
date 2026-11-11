/**
 * Playwright-oriented scenario specs for SG onboarding flow.
 * These exercise the shared rules module (same logic as UI).
 * Run via: npx ng test --include=**/onboarding-sg-flow.rules.spec.ts --watch=false
 *
 * Full browser e2e (when Playwright is installed against localhost:4200):
 *   npx playwright test e2e/onboarding-sg-flow.pw.ts
 */
import { describe, expect, it } from 'vitest';
import {
  applicableSteps,
  applies,
  isReadyToWork,
  readyToWorkBlockers,
  wpIssuanceBlockers,
  MEDICAL_UNFIT_WARNING,
  type SgStepState,
  type SgWorkerContext,
} from '../src/app/core/onboarding/onboarding-sg-flow.rules';

const done = (o: Partial<SgStepState> = {}): SgStepState => ({
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
  ...o,
});

describe('e2e scenarios · onboarding SG flow', () => {
  it('scenario matrix covers MOM conditional steps', () => {
    const maleConstruction: SgWorkerContext = {
      foreignWorker: true,
      nationality: 'Bangladesh',
      gender: 'Male',
      sector: 'Construction',
      dormCapacity: 8,
      workPassApplicationDate: '2026-12-01',
    };
    expect(applicableSteps(maleConstruction)).toEqual(
      expect.arrayContaining([
        'SG_ONBOARD_CENTRE',
        'SG_CONSTRUCTION_SAFETY',
        'SG_SECURITY_BOND',
        'SG_PCP_INSURANCE',
      ]),
    );
    expect(applies('SG_SIP', maleConstruction)).toBe(false);

    expect(applies('SG_SIP', { ...maleConstruction, gender: 'Female', sector: 'CMP' })).toBe(true);
    expect(applies('SG_ONBOARD_CENTRE', { ...maleConstruction, gender: 'Female', sector: 'CMP' })).toBe(
      false,
    );
    expect(applies('SG_SIP', { ...maleConstruction, sector: 'Manufacturing' })).toBe(true);
    expect(applies('SG_SECURITY_BOND', { ...maleConstruction, nationality: 'Malaysia' })).toBe(false);

    const unfit = done({ medicalFit: false, medicalUnfit: true, workPermitIssued: false });
    expect(wpIssuanceBlockers(maleConstruction, unfit)).toContain(MEDICAL_UNFIT_WARNING);
    expect(isReadyToWork(maleConstruction, unfit)).toBe(false);

    expect(applies('SG_TEMPORARY_PERMIT', { ...maleConstruction, workPassApplicationDate: '2026-11-28' })).toBe(
      false,
    );
    expect(applies('SG_TEMPORARY_PERMIT', { ...maleConstruction, workPassApplicationDate: '2026-11-29' })).toBe(
      true,
    );

    expect(readyToWorkBlockers(maleConstruction, done({ onboardCentreDone: false })).length).toBeGreaterThan(0);
    expect(isReadyToWork(maleConstruction, done())).toBe(true);
  });
});
