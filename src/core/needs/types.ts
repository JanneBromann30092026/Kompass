/** Types of the need engine (pure logic, see engine.ts). */
import type { LifeEventKind, NeedTiming, Priority, ProductLine } from '@/data/domain';

/** Engine result per product line; "covered": contract exists, nothing to do. */
export type AssessmentTiming = NeedTiming | 'covered';

/** new: no contract yet · adjust: existing contract needs a change · pending: planned/offered. */
export type NeedKind = 'new' | 'adjust' | 'pending';

export const REASON_CODES = [
  // Contract status
  'planned',
  'offered',
  'declinedRecheck',
  'declinedFinal',
  'viaParents',
  'notRelevantNow',
  'minorParents',
  // BU
  'buEarly',
  'buIncome',
  'buSelfEmployed',
  'buCivilServant',
  'buLoan',
  'buBeforeTraining',
  'buLater',
  'buTooOld',
  'adjustAfterEvent',
  'adjustUpcoming',
  // Liability
  'liabilityAlways',
  'parentsLikelyCover',
  'mergeAfterMarriage',
  // Car
  'carLicenseUpcoming',
  'carLicense',
  'carNotYet',
  'carNoCar',
  'carAsk',
  // Accident
  'accidentHobbies',
  'accidentRiskyHobby',
  'accidentAskHobbies',
  // Investment pension
  'ipSelfEmployed',
  'ipFirstSalary',
  'ipParentalLeave',
  'ipCareerStart',
  'ipPensionGap',
  'ipTooLate',
  'reservesFirst',
  // bAV
  'bavEmployerPays',
  'bavNoSubsidy',
  'bavAskEmployer',
  'bavTakeover',
  'bavSelfEmployed',
  'bavCivilServant',
  'bavNoEmployer',
  'parentalLeave',
  // VL
  'vlEmployerPays',
  'vlAskEmployer',
  'vlNoVl',
  'vlSelfEmployed',
  'vlCivilServant',
  'vlTrainingStart',
  'vlNewEmployer',
  'vlNoEmployer',
  // Fund savings
  'fundWithVl',
  'fundChildDepot',
  'fundFirstSalary',
  'fundWealth',
  // Household
  'householdParents',
  'householdSharedFlat',
  'householdOwnFlat',
  'householdAsk',
  'householdAdjustMove',
  'recentMove',
] as const;
export type ReasonCode = (typeof REASON_CODES)[number];

/** A building block of the reasoning; the text lives in src/data (needTexts). */
export interface NeedReason {
  code: ReasonCode;
  /** The event the reason refers to, with its date ("JJJJ-MM" or "JJJJ-MM-TT"). */
  event?: LifeEventKind;
  date?: string;
}

export interface NeedAssessment {
  line: ProductLine;
  priority: Priority;
  timing: AssessmentTiming;
  kind: NeedKind;
  reasons: NeedReason[];
  /** Contains something to check ("prüfen") – never advice as a fact. */
  check: boolean;
  /** Fingerprint of the suggestion; a decision with another basis needs re-checking. */
  basis: string;
}
