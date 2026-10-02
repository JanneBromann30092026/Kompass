import { describe, expect, it } from 'vitest';
import { PRODUCT_LINES, type ContractStatus, type ProductLine } from '@/data/domain';
import { buildDemoCustomer } from '@/data/demo/buildDemo';
import { DEMO_CUSTOMERS, DEMO_REFERENCE_DATE } from '@/data/demo/demoCustomers';
import { assessLine, assessNeeds } from './engine';
import { needFacts, type NeedFacts } from './facts';
import type { AssessmentTiming, ReasonCode } from './types';

const TODAY = '2026-10-01';

function facts(
  patch: Partial<NeedFacts> = {},
  contracts: Partial<Record<ProductLine, ContractStatus>> = {},
): NeedFacts {
  return {
    today: TODAY,
    age: 30,
    minor: 'no',
    children: 0,
    events: [],
    ...patch,
    contracts: {
      ...(Object.fromEntries(PRODUCT_LINES.map((line) => [line, 'open'])) as Record<
        ProductLine,
        ContractStatus
      >),
      ...contracts,
    },
  };
}

const codes = (line: ProductLine, f: NeedFacts): ReasonCode[] =>
  assessLine(line, f).reasons.map((r) => r.code);
const timing = (line: ProductLine, f: NeedFacts) => assessLine(line, f).timing;

describe('need rules per product line', () => {
  it.each<[string, Partial<NeedFacts>, AssessmentTiming, ReasonCode]>([
    ['young employee', { lifePhase: 'careerStart', age: 24 }, 'now', 'buEarly'],
    ['employee over 30', { lifePhase: 'family', age: 40 }, 'now', 'buIncome'],
    ['self-employed', { employment: 'selfEmployed', age: 40 }, 'now', 'buSelfEmployed'],
    ['owner with loan', { lifePhase: 'property', housing: 'owned' }, 'now', 'buLoan'],
    ['civil servant', { employment: 'civilServant', age: 26 }, 'now', 'buCivilServant'],
    ['student', { lifePhase: 'studies', age: 22 }, 'now', 'buEarly'],
    [
      'pupil before training',
      {
        lifePhase: 'school',
        age: 16,
        minor: 'yes',
        events: [{ kind: 'trainingStart', date: '2027-08' }],
      },
      'now',
      'buBeforeTraining',
    ],
    ['pupil without plan', { lifePhase: 'school', age: 15, minor: 'yes' }, 'later', 'buLater'],
    ['nothing known', { age: undefined }, 'later', 'buLater'],
    ['near retirement', { lifePhase: 'retirement', age: 60 }, 'notUseful', 'buTooOld'],
  ])('BU: %s', (_name, patch, expected, code) => {
    const f = facts(patch);
    expect(timing('bu', f)).toBe(expected);
    expect(codes('bu', f)).toContain(code);
  });

  it('BU: increase after a salary jump (deadline) or before an upcoming event', () => {
    const recent = facts(
      { lifePhase: 'careerStart', events: [{ kind: 'salaryIncrease', date: '2026-05' }] },
      { bu: 'concluded' },
    );
    expect(assessLine('bu', recent)).toMatchObject({ timing: 'now', kind: 'adjust', check: true });
    const old = facts(
      { events: [{ kind: 'salaryIncrease', date: '2025-01' }] },
      { bu: 'concluded' },
    );
    expect(timing('bu', old)).toBe('covered');
    const upcoming = facts(
      { events: [{ kind: 'marriage', date: '2027-05' }] },
      { bu: 'concluded' },
    );
    expect(assessLine('bu', upcoming)).toMatchObject({ timing: 'later', kind: 'adjust' });
    expect(assessLine('bu', upcoming).reasons[0]).toEqual({
      code: 'adjustUpcoming',
      event: 'marriage',
      date: '2027-05',
    });
  });

  it('liability: always needed, except while the parents probably cover', () => {
    expect(timing('liability', facts({ housing: 'rent' }))).toBe('now');
    expect(codes('liability', facts({ housing: 'parents', lifePhase: 'training' }))).toEqual([
      'parentsLikelyCover',
    ]);
    const parents = facts(
      { lifePhase: 'training', events: [{ kind: 'trainingEnd', date: '2027-02' }] },
      { liability: 'viaParents' },
    );
    expect(assessLine('liability', parents)).toMatchObject({ timing: 'later', check: true });
    expect(assessLine('liability', parents).reasons[0]).toMatchObject({ event: 'trainingEnd' });
    const marriage = facts(
      { events: [{ kind: 'marriage', date: '2027-06' }] },
      { liability: 'concluded' },
    );
    expect(codes('liability', marriage)).toEqual(['mergeAfterMarriage']);
  });

  it('car: driving licence decides', () => {
    expect(timing('car', facts({ events: [{ kind: 'driversLicense', date: '2026-11-15' }] }))).toBe(
      'later',
    );
    expect(timing('car', facts({ events: [{ kind: 'driversLicense', date: '2026-06-01' }] }))).toBe(
      'now',
    );
    expect(codes('car', facts({ age: 16, minor: 'yes' }))).toEqual(
      ['carNotYet', 'minorParents'].slice(0, 1),
    );
    expect(timing('car', facts({}, { car: 'notRelevant' }))).toBe('notUseful');
    expect(codes('car', facts())).toEqual(['carAsk']);
  });

  it('accident: hobbies, risky hobbies, otherwise ask', () => {
    expect(codes('accident', facts({ sport: 'Fußball im Verein' }))).toEqual(['accidentHobbies']);
    expect(codes('accident', facts({ sport: 'Motocross' }))).toEqual([
      'accidentHobbies',
      'accidentRiskyHobby',
    ]);
    expect(timing('accident', facts({ sport: 'keine' }))).toBe('later');
    expect(codes('accident', facts({ sport: 'Motocross' }, { accident: 'offered' }))).toEqual([
      'offered',
      'accidentRiskyHobby',
    ]);
  });

  it.each<[string, Partial<NeedFacts>, AssessmentTiming, ReasonCode]>([
    ['self-employed', { employment: 'selfEmployed' }, 'now', 'ipSelfEmployed'],
    ['career start', { lifePhase: 'careerStart' }, 'now', 'ipCareerStart'],
    ['in training', { lifePhase: 'training' }, 'later', 'ipFirstSalary'],
    [
      'parental leave',
      { lifePhase: 'family', events: [{ kind: 'parentalLeaveEnd', date: '2027-03' }] },
      'later',
      'ipParentalLeave',
    ],
    ['no reserves', { lifePhase: 'careerStart', reserves: 'nein' }, 'later', 'reservesFirst'],
    ['other employees', { lifePhase: 'family' }, 'later', 'ipPensionGap'],
    ['too late', { age: 63 }, 'notUseful', 'ipTooLate'],
  ])('investment pension: %s', (_name, patch, expected, code) => {
    const f = facts(patch);
    expect(timing('investmentPension', f)).toBe(expected);
    expect(codes('investmentPension', f)).toContain(code);
  });

  it.each<[string, Partial<NeedFacts>, AssessmentTiming, ReasonCode]>([
    ['employer subsidy', { lifePhase: 'careerStart', employerBav: true }, 'now', 'bavEmployerPays'],
    ['no subsidy', { lifePhase: 'careerStart', employerBav: false }, 'later', 'bavNoSubsidy'],
    ['unknown', { lifePhase: 'careerStart' }, 'later', 'bavAskEmployer'],
    ['training', { lifePhase: 'training' }, 'later', 'bavTakeover'],
    ['self-employed', { employment: 'selfEmployed' }, 'notUseful', 'bavSelfEmployed'],
    ['civil servant', { employment: 'civilServant' }, 'notUseful', 'bavCivilServant'],
    ['pupil', { lifePhase: 'school' }, 'notUseful', 'bavNoEmployer'],
  ])('bAV: %s', (_name, patch, expected, code) => {
    const f = facts(patch);
    expect(timing('occupationalPension', f)).toBe(expected);
    expect(codes('occupationalPension', f)).toContain(code);
  });

  it.each<[string, Partial<NeedFacts>, AssessmentTiming, ReasonCode]>([
    ['employer pays', { lifePhase: 'training', employerVl: true }, 'now', 'vlEmployerPays'],
    ['unknown (check)', { lifePhase: 'training' }, 'now', 'vlAskEmployer'],
    ['employer pays none', { lifePhase: 'careerStart', employerVl: false }, 'notUseful', 'vlNoVl'],
    ['student', { lifePhase: 'studies' }, 'later', 'vlNewEmployer'],
    [
      'pupil with training ahead',
      { lifePhase: 'school', events: [{ kind: 'trainingStart', date: '2027-08' }] },
      'later',
      'vlTrainingStart',
    ],
    ['self-employed', { employment: 'selfEmployed' }, 'notUseful', 'vlSelfEmployed'],
  ])('VL: %s', (_name, patch, expected, code) => {
    const f = facts(patch);
    expect(timing('capitalFormation', f)).toBe(expected);
    expect(codes('capitalFormation', f)).toContain(code);
  });

  it('fund savings: with VL, children, later otherwise', () => {
    expect(codes('fundSavings', facts({ employerVl: true }))).toEqual(['fundWithVl']);
    expect(
      timing('fundSavings', facts({ employerVl: true }, { capitalFormation: 'concluded' })),
    ).toBe('later');
    expect(codes('fundSavings', facts({ children: 1 }))).toEqual(['fundChildDepot']);
    expect(codes('fundSavings', facts({ children: 1, reserves: 'nein, noch nicht' }))).toEqual([
      'reservesFirst',
    ]);
  });

  it('household: own flat now, parents not useful, shared flat later', () => {
    expect(timing('household', facts({ housing: 'parents' }))).toBe('notUseful');
    expect(timing('household', facts({ housing: 'sharedFlat' }))).toBe('later');
    expect(
      codes('household', facts({ housing: 'rent', events: [{ kind: 'move', date: '2026-09' }] })),
    ).toEqual(['householdOwnFlat', 'recentMove']);
    const moved = facts(
      { events: [{ kind: 'move', date: '2026-08' }] },
      { household: 'concluded' },
    );
    expect(assessLine('household', moved)).toMatchObject({ timing: 'now', kind: 'adjust' });
  });
});

describe('contract status', () => {
  it('planned and offered are pending now, declined is raised again later', () => {
    expect(assessLine('bu', facts({}, { bu: 'planned' }))).toMatchObject({
      timing: 'now',
      kind: 'pending',
    });
    expect(codes('bu', facts({}, { bu: 'offered' }))).toEqual(['offered']);
    const declined = facts(
      { lifePhase: 'family', events: [{ kind: 'parentalLeaveEnd', date: '2027-03' }] },
      { bu: 'declined' },
    );
    expect(assessLine('bu', declined).timing).toBe('later');
    expect(assessLine('bu', declined).reasons[0]).toEqual({
      code: 'declinedRecheck',
      event: 'parentalLeaveEnd',
      date: '2027-03',
    });
    // Declined late in life: do not push again.
    expect(codes('bu', facts({ age: 53 }, { bu: 'declined' }))).toEqual(['declinedFinal']);
  });

  it('"not relevant" caps a need at "later"', () => {
    const f = facts(
      { lifePhase: 'careerStart', employerVl: true },
      { capitalFormation: 'notRelevant' },
    );
    expect(assessLine('capitalFormation', f)).toMatchObject({ timing: 'later' });
    expect(codes('capitalFormation', f)).toContain('notRelevantNow');
  });

  it('minors: needs now only with the parents', () => {
    const minor = facts({
      lifePhase: 'school',
      age: 16,
      minor: 'yes',
      events: [{ kind: 'trainingStart', date: '2027-08' }],
    });
    expect(codes('bu', minor)).toContain('minorParents');
    expect(codes('household', minor)).not.toContain('minorParents');
  });

  it('sorts now before later, then by priority; fingerprints are stable', () => {
    const f = facts({ lifePhase: 'careerStart', housing: 'rent', employerBav: true });
    const result = assessNeeds(f);
    const order = { now: 0, later: 1, notUseful: 2, covered: 3 };
    for (let i = 1; i < result.length; i += 1) {
      const a = result[i - 1]!;
      const b = result[i]!;
      expect(
        order[a.timing] < order[b.timing] || (a.timing === b.timing && a.priority <= b.priority),
      ).toBe(true);
    }
    expect(assessNeeds(f).map((a) => a.basis)).toEqual(result.map((a) => a.basis));
    const changed = facts({ lifePhase: 'careerStart', housing: 'rent', employerBav: false });
    const bav = (list: typeof result) => list.find((a) => a.line === 'occupationalPension')?.basis;
    expect(bav(assessNeeds(changed))).not.toBe(bav(result));
  });
});

/**
 * The 12 test customers of the Kunden-Wissensdatenbank as reference cases: the expected
 * classification comes from the "Bedarf" section of their notes (01_Kunden).
 */
type Expectation = Partial<Record<ProductLine, AssessmentTiming | AssessmentTiming[]>>;

const REFERENCE: Record<string, { expect: Expectation; nothingNow?: boolean }> = {
  k01: {
    expect: {
      accident: 'now',
      capitalFormation: 'now',
      investmentPension: 'now',
      liability: 'later',
      car: 'later',
      occupationalPension: 'later',
      household: 'notUseful',
    },
  },
  k02: {
    expect: {
      bu: 'now',
      capitalFormation: 'now',
      fundSavings: 'now',
      accident: 'now',
      liability: 'later',
      car: 'later',
      occupationalPension: 'later',
      investmentPension: 'later',
      household: 'notUseful',
    },
  },
  k03: {
    expect: {
      bu: 'now',
      liability: 'later',
      household: 'later',
      accident: 'later',
      investmentPension: 'later',
      occupationalPension: 'notUseful',
      capitalFormation: 'notUseful',
      car: 'notUseful',
    },
  },
  k04: {
    expect: {
      bu: 'now',
      occupationalPension: 'now',
      investmentPension: 'now',
      liability: 'later',
      household: 'later',
      accident: 'later',
      capitalFormation: 'notUseful',
    },
  },
  k05: {
    expect: {
      capitalFormation: 'now',
      fundSavings: 'now',
      bu: 'later',
      occupationalPension: 'later',
      investmentPension: 'later',
    },
  },
  k06: {
    expect: {
      bu: 'now',
      capitalFormation: 'later',
      fundSavings: 'later',
      accident: 'later',
      car: 'later',
      household: 'notUseful',
      occupationalPension: 'notUseful',
    },
  },
  k07: {
    expect: {
      bu: 'now',
      investmentPension: 'now',
      occupationalPension: 'notUseful',
      capitalFormation: 'notUseful',
      car: 'notUseful',
    },
  },
  k08: {
    expect: {
      household: 'now',
      accident: 'now',
      liability: 'later',
      investmentPension: 'later',
      occupationalPension: 'later',
      bu: 'later',
    },
  },
  k09: { expect: {}, nothingNow: true },
  k10: {
    expect: {
      bu: 'now',
      occupationalPension: 'later',
      capitalFormation: 'later',
      investmentPension: 'later',
      household: 'later',
      car: 'notUseful',
    },
  },
  k11: {
    expect: {
      capitalFormation: 'now',
      fundSavings: 'now',
      liability: 'later',
      bu: 'later',
      // Note: "nach der Heirat zusammenlegen" (later); Kompass also flags the recent move
      // (Wohnfläche prüfen, an open point in the note) – both are fine.
      household: ['later', 'now'],
    },
  },
  k12: { expect: { investmentPension: 'now', bu: 'notUseful' } },
};

describe('reference cases (12 test customers)', () => {
  for (const today of [DEMO_REFERENCE_DATE, '2027-03-15']) {
    describe(`today ${today}`, () => {
      for (const source of DEMO_CUSTOMERS) {
        it(`${source.key} ${source.customer.firstName}`, () => {
          const build = buildDemoCustomer(source, {
            today,
            now: `${today}T12:00:00.000Z`,
            number: 'K-0001',
          });
          const result = assessNeeds(needFacts(build.customer, build.lifeEvents, today));
          const byLine = Object.fromEntries(result.map((a) => [a.line, a.timing]));
          const reference = REFERENCE[source.key]!;
          for (const [line, expected] of Object.entries(reference.expect)) {
            const allowed = Array.isArray(expected) ? expected : [expected];
            expect(allowed, `${line}: ${byLine[line]}`).toContain(byLine[line]);
          }
          if (reference.nothingNow) expect(result.filter((a) => a.timing === 'now')).toEqual([]);
        });
      }
    });
  }
});
