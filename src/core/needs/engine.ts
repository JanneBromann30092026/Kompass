/**
 * Need engine: from the facts of a customer and the need rules per product line, a
 * suggestion "jetzt / später / nicht sinnvoll" (or "abgedeckt") with priority and reasons.
 * Pure and deterministic; texts for the reasons live in src/data/reference/needTexts.ts.
 * Echter Bedarf vor Provision: the order follows the priority, never the potential.
 */
import { PRODUCT_LINES, type LifeEventKind, type ProductLine } from '@/data/domain';
import { PRODUCT_LINE_INFO } from '@/data/reference/productLines';
import {
  meaningful,
  pastEvent,
  recentEvent,
  saysNo,
  upcomingEvent,
  type DatedEvent,
  type NeedFacts,
} from './facts';
import type { AssessmentTiming, NeedAssessment, NeedKind, NeedReason, ReasonCode } from './types';

/** Events within this many months count as "recent" (deadlines of adjustments). */
export const RECENT_MONTHS = 6;
/** Future events within this many months make a need "later". */
export const UPCOMING_MONTHS = 18;

/** Reasons that contain something to check ("prüfen"). */
const CHECK_CODES: ReadonlySet<ReasonCode> = new Set<ReasonCode>([
  'buCivilServant',
  'adjustAfterEvent',
  'parentsLikelyCover',
  'carAsk',
  'accidentRiskyHobby',
  'accidentAskHobbies',
  'ipSelfEmployed',
  'bavEmployerPays',
  'bavNoSubsidy',
  'bavAskEmployer',
  'bavCivilServant',
  'vlAskEmployer',
  'vlCivilServant',
  'householdSharedFlat',
  'householdAsk',
  'householdAdjustMove',
  'viaParents',
]);

interface Draft {
  timing: AssessmentTiming;
  kind: NeedKind;
  reasons: NeedReason[];
}

const draft = (timing: AssessmentTiming, ...reasons: NeedReason[]): Draft => ({
  timing,
  kind: 'new',
  reasons,
});

const reason = (code: ReasonCode, event?: DatedEvent): NeedReason =>
  event ? { code, event: event.kind, date: event.date } : { code };

// --- Derived facts ------------------------------------------------------------

const minorish = (f: NeedFacts) => f.minor === 'yes' || f.minor === 'maybe';

/** Training or studies still running (the phase or a planned end in the future). */
function inEducation(f: NeedFacts): boolean {
  if (f.lifePhase === 'training' || f.lifePhase === 'studies') return true;
  return f.lifePhase !== 'school' && upcomingEvent(f, ['trainingEnd'], 60) !== undefined;
}

const isStudent = (f: NeedFacts) => f.lifePhase === 'studies';
const isTrainee = (f: NeedFacts) => inEducation(f) && !isStudent(f);
const atSchool = (f: NeedFacts) => f.lifePhase === 'school';

const WORKING_PHASES = ['careerStart', 'movingOut', 'partnership', 'family', 'property'] as const;

/** Employed (also trainees); self-employed and civil servants are not. */
function isEmployee(f: NeedFacts): boolean {
  if (f.employment) return f.employment === 'employee';
  return isTrainee(f) || WORKING_PHASES.some((phase) => phase === f.lifePhase);
}

function hasIncome(f: NeedFacts): boolean {
  if ((f.netIncome ?? 0) > 0) return true;
  if (f.employment) return true;
  return isTrainee(f) || WORKING_PHASES.some((phase) => phase === f.lifePhase);
}

const parentalLeave = (f: NeedFacts) => upcomingEvent(f, ['parentalLeaveEnd'], 36);
const trainingEnd = (f: NeedFacts) => upcomingEvent(f, ['trainingEnd'], 60);
const trainingStart = (f: NeedFacts) => upcomingEvent(f, ['trainingStart'], 12);

const RISKY_HOBBIES =
  /motocross|motorrad|klettern|bouldern|reiten|kampfsport|boxen|ski|snowboard|tauchen|fallschirm|paragliding|mountainbike/i;

// --- Rules per product line --------------------------------------------------------

interface LineRule {
  /** No contract yet (open, no, not relevant). */
  assess: (f: NeedFacts) => Draft;
  /** Contract exists: adjustment needed? Otherwise covered. */
  adjust?: (f: NeedFacts) => Draft | undefined;
  /** Extra reasons for planned or offered contracts. */
  extras?: (f: NeedFacts) => NeedReason[];
  /** Events that make a declined line worth raising again. */
  recheckEvents: readonly LifeEventKind[];
  /** Declined and not worth raising again. */
  finalDecline?: (f: NeedFacts) => boolean;
}

/** BU, liability, household: increase or merge after life events (deadlines: check). */
function adjustAfter(
  f: NeedFacts,
  kinds: readonly LifeEventKind[],
  codes: { recent: ReasonCode; upcoming: ReasonCode },
): Draft | undefined {
  const recent = recentEvent(f, kinds, RECENT_MONTHS);
  if (recent) return { timing: 'now', kind: 'adjust', reasons: [reason(codes.recent, recent)] };
  const upcoming = upcomingEvent(f, kinds, UPCOMING_MONTHS);
  if (upcoming) {
    return { timing: 'later', kind: 'adjust', reasons: [reason(codes.upcoming, upcoming)] };
  }
  return undefined;
}

const BU_ADJUST_EVENTS: LifeEventKind[] = [
  'salaryIncrease',
  'marriage',
  'childBirth',
  'propertyPurchase',
  'trainingEnd',
];

const RULES: Record<ProductLine, LineRule> = {
  bu: {
    assess: (f) => {
      if (f.lifePhase === 'retirement' || (f.age ?? 0) >= 55)
        return draft('notUseful', reason('buTooOld'));
      if (atSchool(f)) {
        const start = trainingStart(f);
        return start
          ? draft('now', reason('buBeforeTraining', start))
          : draft('later', reason('buLater'));
      }
      if (!hasIncome(f) && !isStudent(f)) return draft('later', reason('buLater'));
      const reasons: NeedReason[] = [];
      if (f.employment === 'selfEmployed') reasons.push(reason('buSelfEmployed'));
      if (f.housing === 'owned') reasons.push(reason('buLoan'));
      reasons.push(reason((f.age ?? 99) < 30 ? 'buEarly' : 'buIncome'));
      if (f.employment === 'civilServant') reasons.push(reason('buCivilServant'));
      return draft('now', ...reasons);
    },
    adjust: (f) =>
      adjustAfter(f, BU_ADJUST_EVENTS, { recent: 'adjustAfterEvent', upcoming: 'adjustUpcoming' }),
    extras: (f) => (f.employment === 'civilServant' ? [reason('buCivilServant')] : []),
    recheckEvents: ['parentalLeaveEnd', 'trainingEnd', 'salaryIncrease', 'jobChange', 'childBirth'],
    finalDecline: (f) => f.lifePhase === 'retirement' || (f.age ?? 0) >= 50,
  },
  liability: {
    assess: (f) =>
      f.housing === 'parents' && (minorish(f) || inEducation(f) || atSchool(f))
        ? draft('later', reason('parentsLikelyCover'))
        : draft('now', reason('liabilityAlways')),
    adjust: (f) =>
      adjustAfter(f, ['marriage'], {
        recent: 'mergeAfterMarriage',
        upcoming: 'mergeAfterMarriage',
      }),
    recheckEvents: ['trainingEnd', 'move', 'marriage'],
  },
  car: {
    assess: (f) => {
      const upcoming = upcomingEvent(f, ['driversLicense'], UPCOMING_MONTHS);
      if (upcoming) return draft('later', reason('carLicenseUpcoming', upcoming));
      const license = pastEvent(f, 'driversLicense');
      if (license) return draft('now', reason('carLicense', license));
      if (minorish(f)) return draft('later', reason('carNotYet'));
      if (f.contracts.car === 'notRelevant' || f.contracts.car === 'no') {
        return draft('notUseful', reason('carNoCar'));
      }
      return draft('later', reason('carAsk'));
    },
    recheckEvents: ['driversLicense', 'move'],
  },
  accident: {
    assess: (f) => {
      if (meaningful(f.sport)) {
        const reasons = [reason('accidentHobbies')];
        if (RISKY_HOBBIES.test(f.sport)) reasons.push(reason('accidentRiskyHobby'));
        return draft('now', ...reasons);
      }
      return draft('later', reason('accidentAskHobbies'));
    },
    extras: (f) =>
      meaningful(f.sport) && RISKY_HOBBIES.test(f.sport) ? [reason('accidentRiskyHobby')] : [],
    recheckEvents: ['eighteenthBirthday', 'move'],
  },
  investmentPension: {
    assess: (f) => {
      if ((f.age ?? 0) >= 62) return draft('notUseful', reason('ipTooLate'));
      if (saysNo(f.reserves)) return draft('later', reason('reservesFirst'));
      if (f.employment === 'selfEmployed') return draft('now', reason('ipSelfEmployed'));
      const leave = parentalLeave(f);
      if (leave) return draft('later', reason('ipParentalLeave', leave));
      if (atSchool(f) || inEducation(f))
        return draft('later', reason('ipFirstSalary', trainingEnd(f)));
      if (f.lifePhase === 'careerStart') return draft('now', reason('ipCareerStart'));
      return draft('later', reason('ipPensionGap'));
    },
    extras: (f) => (f.employment === 'selfEmployed' ? [reason('ipSelfEmployed')] : []),
    recheckEvents: ['salaryIncrease', 'trainingEnd', 'parentalLeaveEnd', 'annualReview'],
  },
  occupationalPension: {
    assess: (f) => {
      if (f.employment === 'selfEmployed') return draft('notUseful', reason('bavSelfEmployed'));
      if (f.employment === 'civilServant') return draft('notUseful', reason('bavCivilServant'));
      if (atSchool(f) || f.lifePhase === 'retirement') {
        return draft('notUseful', reason('bavNoEmployer'));
      }
      if (inEducation(f)) return draft('later', reason('bavTakeover', trainingEnd(f)));
      const leave = parentalLeave(f);
      if (leave) return draft('later', reason('parentalLeave', leave));
      if (f.employerBav === true) return draft('now', reason('bavEmployerPays'));
      if (f.employerBav === false) return draft('later', reason('bavNoSubsidy'));
      return draft('later', reason('bavAskEmployer'));
    },
    recheckEvents: ['jobChange', 'trainingEnd', 'salaryIncrease'],
  },
  capitalFormation: {
    assess: (f) => {
      if (f.employment === 'selfEmployed') return draft('notUseful', reason('vlSelfEmployed'));
      if (f.employment === 'civilServant') return draft('notUseful', reason('vlCivilServant'));
      if (f.lifePhase === 'retirement') return draft('notUseful', reason('vlNoEmployer'));
      if (f.employerVl === false) return draft('notUseful', reason('vlNoVl'));
      if (atSchool(f)) {
        const start = trainingStart(f);
        return start
          ? draft('later', reason('vlTrainingStart', start))
          : draft('notUseful', reason('vlNoEmployer'));
      }
      if (isStudent(f)) return draft('later', reason('vlNewEmployer', trainingEnd(f)));
      if (f.employerVl === true) return draft('now', reason('vlEmployerPays'));
      return isEmployee(f) || hasIncome(f)
        ? draft('now', reason('vlAskEmployer'))
        : draft('later', reason('vlAskEmployer'));
    },
    recheckEvents: ['trainingStart', 'jobChange', 'trainingEnd'],
  },
  fundSavings: {
    assess: (f) => {
      if (saysNo(f.reserves)) return draft('later', reason('reservesFirst'));
      if (f.employerVl === true && f.contracts.capitalFormation !== 'concluded') {
        return draft('now', reason('fundWithVl'));
      }
      if (f.children > 0) return draft('now', reason('fundChildDepot'));
      if (atSchool(f)) return draft('later', reason('fundFirstSalary', trainingStart(f)));
      if (inEducation(f)) return draft('later', reason('fundFirstSalary', trainingEnd(f)));
      return draft('later', reason('fundWealth'));
    },
    recheckEvents: ['trainingStart', 'salaryIncrease', 'childBirth'],
  },
  household: {
    assess: (f) => {
      if (f.housing === 'parents') return draft('notUseful', reason('householdParents'));
      if (f.housing === 'sharedFlat') return draft('later', reason('householdSharedFlat'));
      if (f.housing === 'rent' || f.housing === 'owned') {
        const move = recentEvent(f, ['move'], RECENT_MONTHS);
        return move
          ? draft('now', reason('householdOwnFlat'), reason('recentMove', move))
          : draft('now', reason('householdOwnFlat'));
      }
      return draft('later', reason('householdAsk'));
    },
    adjust: (f) => {
      const move = recentEvent(f, ['move'], RECENT_MONTHS);
      if (move)
        return { timing: 'now', kind: 'adjust', reasons: [reason('householdAdjustMove', move)] };
      return adjustAfter(f, ['marriage'], {
        recent: 'mergeAfterMarriage',
        upcoming: 'mergeAfterMarriage',
      });
    },
    recheckEvents: ['move', 'marriage', 'propertyPurchase'],
  },
};

// --- Contract status ----------------------------------------------------------------

/** Until when the parents' contract probably covers: end of training, 18th birthday. */
function viaParents(f: NeedFacts): Draft {
  const end = trainingEnd(f);
  if (end) return draft('later', reason('viaParents', end));
  if (minorish(f)) return draft('later', { code: 'viaParents', event: 'eighteenthBirthday' });
  return draft('later', reason('viaParents'));
}

function declined(rule: LineRule, f: NeedFacts): Draft {
  if (rule.finalDecline?.(f)) return draft('notUseful', reason('declinedFinal'));
  const suggestion = rule.assess(f);
  if (suggestion.timing === 'notUseful') {
    return draft('notUseful', reason('declinedFinal'), ...suggestion.reasons);
  }
  return draft(
    'later',
    reason('declinedRecheck', upcomingEvent(f, rule.recheckEvents, UPCOMING_MONTHS)),
  );
}

function decide(line: ProductLine, f: NeedFacts): Draft {
  const rule = RULES[line];
  const status = f.contracts[line];
  switch (status) {
    case 'concluded':
      return rule.adjust?.(f) ?? draft('covered');
    case 'planned':
    case 'offered':
      return {
        timing: 'now',
        kind: 'pending',
        reasons: [reason(status), ...(rule.extras?.(f) ?? [])],
      };
    case 'declined':
      return declined(rule, f);
    case 'viaParents':
      return viaParents(f);
    case 'notRelevant': {
      // Marked as not relevant: never more than "later".
      const suggestion = rule.assess(f);
      return suggestion.timing === 'now'
        ? {
            ...suggestion,
            timing: 'later',
            reasons: [...suggestion.reasons, reason('notRelevantNow')],
          }
        : suggestion;
    }
    case 'open':
    case 'no':
      return rule.assess(f);
  }
}

function fingerprint(result: Draft): string {
  const reasons = result.reasons.map((r) => [r.code, r.event ?? '', r.date ?? ''].join(':'));
  return [result.timing, result.kind, ...reasons].join('|');
}

/** Assessment of one product line. */
export function assessLine(line: ProductLine, facts: NeedFacts): NeedAssessment {
  const result = decide(line, facts);
  // Minors: advice and contracts only with the parents' consent.
  if (result.timing === 'now' && minorish(facts)) result.reasons.push(reason('minorParents'));
  return {
    line,
    priority: PRODUCT_LINE_INFO[line].priority,
    timing: result.timing,
    kind: result.kind,
    reasons: result.reasons,
    check: result.reasons.some((r) => CHECK_CODES.has(r.code)),
    basis: fingerprint(result),
  };
}

const TIMING_ORDER: Record<AssessmentTiming, number> = {
  now: 0,
  later: 1,
  notUseful: 2,
  covered: 3,
};

/** All product lines: now before later before not useful, then by priority (never potential). */
export function assessNeeds(facts: NeedFacts): NeedAssessment[] {
  return PRODUCT_LINES.map((line) => assessLine(line, facts)).sort(
    (a, b) =>
      TIMING_ORDER[a.timing] - TIMING_ORDER[b.timing] ||
      a.priority - b.priority ||
      PRODUCT_LINES.indexOf(a.line) - PRODUCT_LINES.indexOf(b.line),
  );
}
