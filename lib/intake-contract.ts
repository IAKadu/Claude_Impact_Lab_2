export type IntakeCluster = 'V0' | 'V1' | 'V2' | 'V3';

export type IntakePreference = {
  rank: number;
  unitCode: string;
  unitName: string;
  cre: string;
  bairro: string;
  distanceKm: number;
};

export type IntakeAnswer = {
  criterionId: string;
  value: 'yes' | 'no';
  points: number;
};

export type IntakeCase = {
  schemaVersion: '1.0';
  intakeId: string;
  applicantRef: string;
  createdAt: string;
  ruleYear: 2025;
  ruleVersion: 'historical-2025';
  source: 'dashboard-creche';
  sourceNotice: 'historical-anonymized-data';
  selection: {
    group: string;
    shift: string;
    locationsCount: number;
    preferences: IntakePreference[];
  };
  assessment: {
    nature: 'self_declared_simulation';
    declaredScore: number;
    cluster: IntakeCluster;
    criteriaCount: number;
    positiveCriteriaCount: number;
    answersIncluded: false;
    authoritative: false;
    validationStatus: 'pending';
  };
  constraints: {
    mayChangeOfficialRanking: false;
    mayStartOffer: false;
    requiresOfficialQueueMatch: true;
    requiresHumanReview: true;
  };
};

const STORAGE_PREFIX = 'fila-viva:intake:';

export function intakeStorageKey(intakeId: string) {
  return `${STORAGE_PREFIX}${intakeId}`;
}

export function saveIntakeCase(intake: IntakeCase) {
  window.sessionStorage.setItem(
    intakeStorageKey(intake.intakeId),
    JSON.stringify(intake),
  );
}

export function readIntakeCase(intakeId: string): IntakeCase | null {
  if (!/^INT-[A-Z0-9-]{6,40}$/.test(intakeId)) return null;

  try {
    const raw = window.sessionStorage.getItem(intakeStorageKey(intakeId));
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    return isIntakeCase(value) ? value : null;
  } catch {
    return null;
  }
}

export function isIntakeCase(value: unknown): value is IntakeCase {
  if (!value || typeof value !== 'object') return false;
  const intake = value as Partial<IntakeCase>;

  return (
    intake.schemaVersion === '1.0' &&
    intake.source === 'dashboard-creche' &&
    intake.ruleYear === 2025 &&
    intake.ruleVersion === 'historical-2025' &&
    intake.assessment?.validationStatus === 'pending' &&
    typeof intake.intakeId === 'string' &&
    typeof intake.applicantRef === 'string' &&
    typeof intake.createdAt === 'string' &&
    typeof intake.selection?.group === 'string' &&
    typeof intake.selection?.shift === 'string' &&
    Array.isArray(intake.selection?.preferences) &&
    intake.selection.preferences.length > 0 &&
    intake.selection.preferences.length <= 5 &&
    intake.assessment?.nature === 'self_declared_simulation' &&
    intake.assessment?.answersIncluded === false &&
    intake.assessment?.authoritative === false &&
    typeof intake.assessment?.declaredScore === 'number' &&
    ['V0', 'V1', 'V2', 'V3'].includes(intake.assessment?.cluster ?? '') &&
    intake.constraints?.mayChangeOfficialRanking === false &&
    intake.constraints?.mayStartOffer === false &&
    intake.constraints?.requiresHumanReview === true
  );
}
