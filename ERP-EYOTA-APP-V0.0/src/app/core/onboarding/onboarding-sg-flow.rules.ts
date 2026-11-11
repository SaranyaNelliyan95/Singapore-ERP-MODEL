/** Mirrors backend OnboardingSgFlowRules — keep in sync for UI gating. */
export const TP_APPLICATION_EFFECTIVE_DATE = '2026-11-29';
export const MEDICAL_UNFIT_WARNING =
  'Work permit will be revoked / cannot be issued';

export type SgStepCode =
  | 'SG_SECURITY_BOND'
  | 'SG_PCP_INSURANCE'
  | 'SG_HOUSING_MOM'
  | 'SG_IPA_RECORD'
  | 'SG_ONBOARD_CENTRE'
  | 'SG_SIP'
  | 'SG_MEDICAL_EXAM'
  | 'SG_CONSTRUCTION_SAFETY'
  | 'SG_TEMPORARY_PERMIT'
  | 'WP_ISSUANCE';

export interface SgWorkerContext {
  foreignWorker: boolean;
  nationality?: string | null;
  nationalityCode?: string | null;
  gender?: string | null;
  sector?: string | null;
  workerCategory?: string | null;
  accommodationType?: string | null;
  dormCapacity?: number | null;
  workPassApplicationDate?: string | null;
  arrivalDate?: string | null;
}

export interface SgStepState {
  securityBondPurchased: boolean;
  medicalInsuranceRecorded: boolean;
  pcpRecorded: boolean;
  housingMomRegistered: boolean;
  ipaRecorded: boolean;
  onboardCentreDone: boolean;
  sipDone: boolean;
  medicalFit: boolean;
  medicalUnfit: boolean;
  medicalPending: boolean;
  constructionSafetyDone: boolean;
  temporaryPermitValid: boolean;
  workPermitIssued: boolean;
}

function norm(raw?: string | null): string {
  return (raw ?? '').trim().toUpperCase();
}

function sectorBlob(ctx: SgWorkerContext): string {
  return `${norm(ctx.sector)} ${norm(ctx.workerCategory)}`;
}

export function isMalaysian(ctx: SgWorkerContext): boolean {
  const n = norm(ctx.nationality);
  const code = norm(ctx.nationalityCode);
  return code === 'MY' || code === 'MYS' || n.includes('MALAYSIA') || n === 'MY' || n === 'MYS';
}

export function isCmpSector(ctx: SgWorkerContext): boolean {
  const s = sectorBlob(ctx);
  return s.includes('CMP') || s.includes('PROCESS') || s.includes('MARINE') || s.includes('CONSTRUCTION');
}

export function isConstructionSector(ctx: SgWorkerContext): boolean {
  const s = sectorBlob(ctx);
  return s.includes('CONSTRUCTION') || s.includes('BUILD');
}

export function isManufacturingSector(ctx: SgWorkerContext): boolean {
  const s = sectorBlob(ctx);
  return s.includes('MANUFACTUR') || s.includes('FACTORY');
}

export function isMale(ctx: SgWorkerContext): boolean {
  const g = norm(ctx.gender);
  return g === 'M' || g === 'MALE' || g.startsWith('M');
}

export function isFemale(ctx: SgWorkerContext): boolean {
  const g = norm(ctx.gender);
  return g === 'F' || g === 'FEMALE' || g.startsWith('F');
}

export function isDormSevenPlus(ctx: SgWorkerContext): boolean {
  if (ctx.dormCapacity != null && ctx.dormCapacity >= 7) return true;
  const type = norm(ctx.accommodationType);
  return type.includes('DORM') && (type.includes('7') || type.includes('LARGE'));
}

export function pcpRequired(ctx: SgWorkerContext): boolean {
  return isDormSevenPlus(ctx) || isCmpSector(ctx);
}

function appliesSip(ctx: SgWorkerContext): boolean {
  if (!ctx.foreignWorker || isMalaysian(ctx)) return false;
  if (isManufacturingSector(ctx)) return true;
  return isFemale(ctx) && isCmpSector(ctx);
}

function appliesTemporaryPermit(ctx: SgWorkerContext): boolean {
  if (!ctx.foreignWorker || !ctx.workPassApplicationDate) return false;
  return ctx.workPassApplicationDate >= TP_APPLICATION_EFFECTIVE_DATE;
}

export function applies(step: SgStepCode, ctx: SgWorkerContext): boolean {
  if (!ctx.foreignWorker && step !== 'WP_ISSUANCE') return false;
  switch (step) {
    case 'SG_SECURITY_BOND':
      return ctx.foreignWorker && !isMalaysian(ctx);
    case 'SG_PCP_INSURANCE':
    case 'SG_HOUSING_MOM':
    case 'SG_IPA_RECORD':
    case 'SG_MEDICAL_EXAM':
    case 'WP_ISSUANCE':
      return ctx.foreignWorker;
    case 'SG_ONBOARD_CENTRE':
      return ctx.foreignWorker && !isMalaysian(ctx) && isMale(ctx) && isCmpSector(ctx);
    case 'SG_SIP':
      return appliesSip(ctx);
    case 'SG_CONSTRUCTION_SAFETY':
      return ctx.foreignWorker && isConstructionSector(ctx);
    case 'SG_TEMPORARY_PERMIT':
      return appliesTemporaryPermit(ctx);
    default:
      return false;
  }
}

export function applicableSteps(ctx: SgWorkerContext): SgStepCode[] {
  const all: SgStepCode[] = [
    'SG_SECURITY_BOND',
    'SG_PCP_INSURANCE',
    'SG_HOUSING_MOM',
    'SG_IPA_RECORD',
    'SG_ONBOARD_CENTRE',
    'SG_SIP',
    'SG_MEDICAL_EXAM',
    'SG_CONSTRUCTION_SAFETY',
    'SG_TEMPORARY_PERMIT',
    'WP_ISSUANCE',
  ];
  return all.filter((s) => applies(s, ctx));
}

export function wpIssuanceBlockers(ctx: SgWorkerContext, state: SgStepState): string[] {
  const blockers: string[] = [];
  if (state.medicalUnfit) blockers.push(MEDICAL_UNFIT_WARNING);
  if (applies('SG_SECURITY_BOND', ctx) && !state.securityBondPurchased) {
    blockers.push('Security bond purchased required');
  }
  if (applies('SG_PCP_INSURANCE', ctx)) {
    if (!state.medicalInsuranceRecorded) blockers.push('Medical insurance not recorded');
    if (pcpRequired(ctx) && !state.pcpRecorded) {
      blockers.push('Primary Care Plan required (dorm 7+ or CMP sector)');
    }
  }
  if (applies('SG_MEDICAL_EXAM', ctx)) {
    if (state.medicalPending || (!state.medicalFit && !state.medicalUnfit)) {
      blockers.push('Medical exam not completed');
    } else if (!state.medicalFit) {
      blockers.push(MEDICAL_UNFIT_WARNING);
    }
  }
  if (applies('SG_ONBOARD_CENTRE', ctx) && !state.onboardCentreDone) {
    blockers.push('Onboard centre attended required');
  }
  if (applies('SG_SIP', ctx) && !state.sipDone) {
    blockers.push('SIP attended within 14 days of arrival required');
  }
  if (applies('SG_CONSTRUCTION_SAFETY', ctx) && !state.constructionSafetyDone) {
    blockers.push('Construction safety course required');
  }
  return [...new Set(blockers)];
}

export function readyToWorkBlockers(ctx: SgWorkerContext, state: SgStepState): string[] {
  const blockers = [...wpIssuanceBlockers(ctx, state)];
  if (state.medicalUnfit) blockers.push('Gate locked: medical Unfit');
  if (applies('SG_HOUSING_MOM', ctx) && !state.housingMomRegistered) {
    blockers.push('Housing + address registered with MOM pending');
  }
  if (applies('SG_IPA_RECORD', ctx) && !state.ipaRecorded) {
    blockers.push('IPA record (date / expiry / extension) pending');
  }
  if (applies('SG_TEMPORARY_PERMIT', ctx) && !state.temporaryPermitValid && !state.workPermitIssued) {
    blockers.push('Work permit issued or valid Temporary Permit required');
  } else if (!state.workPermitIssued && !state.temporaryPermitValid) {
    blockers.push('Work permit not issued');
  }
  return [...new Set(blockers)];
}

export function isReadyToWork(ctx: SgWorkerContext, state: SgStepState): boolean {
  return readyToWorkBlockers(ctx, state).length === 0;
}
