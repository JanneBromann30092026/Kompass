import { describe, expect, it } from 'vitest';
import { buildDemoCustomer } from '@/data/demo/buildDemo';
import { DEMO_CUSTOMERS, DEMO_REFERENCE_DATE } from '@/data/demo/demoCustomers';
import type { LifeEventKind } from '@/data/domain';
import {
  customerSchema,
  lifeEventSchema,
  reminderSchema,
  type Conversation,
  type Customer,
  type CustomerInput,
  type LifeEvent,
  type Reminder,
} from '@/data/schemas';
import { calendarEvents, type CalendarLabels } from './calendar';
import { deriveReminders, type ReminderCandidate, type ReminderFacts } from './derive';
import { buildIcs, escapeText, foldLine } from './ics';
import {
  byDueDate,
  isDue,
  nextReminders,
  postponedDate,
  reminderBucket,
  type ReminderBucket,
} from './schedule';
import { planReminderSync } from './sync';

const TODAY = '2026-10-01';
const CUSTOMER_ID = '00000000-0000-4000-8000-000000000001';
let counter = 0;
const uuid = () => `00000000-0000-4000-8000-${String((counter += 1)).padStart(12, '0')}`;

function customer(input: Partial<CustomerInput> = {}): Customer {
  return customerSchema.parse({
    firstName: 'Mia',
    ...input,
    id: CUSTOMER_ID,
    number: 'K-0001',
    createdAt: '2026-01-10T09:00:00.000Z',
    updatedAt: '2026-01-10T09:00:00.000Z',
  });
}

function event(kind: LifeEventKind, date?: string, createdAt = '2026-09-01T09:00:00.000Z') {
  return lifeEventSchema.parse({
    id: uuid(),
    customerId: CUSTOMER_ID,
    kind,
    date,
    createdAt,
    updatedAt: createdAt,
  });
}

function conversation(date: string): Conversation {
  return {
    id: uuid(),
    customerId: CUSTOMER_ID,
    date,
    notes: '',
    createdAt: `${date}T10:00:00.000Z`,
    updatedAt: `${date}T10:00:00.000Z`,
  };
}

function derive(facts: Partial<ReminderFacts> & { customer: Customer }, today = TODAY) {
  return deriveReminders({ lifeEvents: [], conversations: [], reminders: [], ...facts }, today);
}

const ofKind = (candidates: ReminderCandidate[], kind: string) =>
  candidates.filter((candidate) => candidate.kind === kind);

/** Stores candidates as the repository would (open, with key). */
function store(candidates: ReminderCandidate[], createdAt = '2026-10-01T08:00:00.000Z') {
  return candidates.map((candidate) =>
    reminderSchema.parse({
      id: uuid(),
      customerId: CUSTOMER_ID,
      dueDate: candidate.dueDate,
      kind: candidate.kind,
      event: candidate.event,
      title: candidate.title,
      todo: candidate.todo,
      dateToCheck: candidate.dateToCheck,
      ruleKey: candidate.ruleKey,
      createdAt,
      updatedAt: createdAt,
    }),
  );
}

describe('deriveReminders', () => {
  it('end of training: 3 months before, on the 1st of the month', () => {
    const [field] = ofKind(
      derive({ customer: customer({ trainingEnd: '2027-01' }) }),
      'trainingEnd',
    );
    expect(field).toMatchObject({
      dueDate: '2026-10-01',
      title: 'Ausbildungsende',
      creatable: true,
    });
    // An exact date mid-month also lands on the 1st.
    const [exact] = ofKind(
      derive({ customer: customer(), lifeEvents: [event('trainingEnd', '2027-01-20')] }),
      'trainingEnd',
    );
    expect(exact?.dueDate).toBe('2026-10-01');
    // Studies: "Studienende".
    const [studies] = ofKind(
      derive({ customer: customer({ trainingEnd: '2027-03', lifePhase: 'studies' }) }),
      'trainingEnd',
    );
    expect(studies).toMatchObject({ dueDate: '2026-12-01', title: 'Studienende' });
  });

  it('the training field wins over the same recorded event', () => {
    const candidates = derive({
      customer: customer({ trainingEnd: '2027-01' }),
      lifeEvents: [event('trainingEnd', '2027-01'), event('trainingEnd', '2027-06')],
    });
    expect(ofKind(candidates, 'trainingEnd').map((c) => c.dueDate)).toEqual([
      '2026-10-01',
      '2027-03-01',
    ]);
  });

  it('18th birthday on the birthday, 29 February, birth year only', () => {
    const exact = ofKind(
      derive({ customer: customer({ birthDate: '2010-03-14' }) }),
      'eighteenthBirthday',
    );
    expect(exact).toMatchObject([{ dueDate: '2028-03-14', dateToCheck: false, creatable: true }]);
    const leap = ofKind(
      derive({ customer: customer({ birthDate: '2008-02-29' }) }),
      'eighteenthBirthday',
    );
    expect(leap[0]?.dueDate).toBe('2026-02-28');
    const yearOnly = ofKind(
      derive({ customer: customer({ birthYear: 2009 }) }),
      'eighteenthBirthday',
    );
    expect(yearOnly).toMatchObject([{ dueDate: '2027-01-01', dateToCheck: true }]);
    // Adults: the rule still yields its key, but nothing is created any more.
    const adult = ofKind(
      derive({ customer: customer({ birthDate: '1990-05-01' }) }),
      'eighteenthBirthday',
    );
    expect(adult[0]?.creatable).toBe(false);
    // A recorded 18th birthday does not duplicate the rule.
    const recorded = derive({
      customer: customer({ birthDate: '2010-03-14' }),
      lifeEvents: [event('eighteenthBirthday', '2028-03-14')],
    });
    expect(recorded.filter((c) => c.title === '18. Geburtstag')).toHaveLength(1);
  });

  it('annual review 12 months after the last contact', () => {
    const first = ofKind(derive({ customer: customer() }), 'annualReview');
    expect(first[0]?.dueDate).toBe('2027-01-10'); // first contact = created
    const talked = ofKind(
      derive({
        customer: customer(),
        conversations: [conversation('2026-03-31'), conversation('2026-05-31')],
      }),
      'annualReview',
    );
    expect(talked[0]?.dueDate).toBe('2027-05-31');
    // A completed annual review counts as contact.
    const [open] = store(talked);
    const done = { ...open, done: true, doneAt: '2026-09-15T12:00:00.000Z' } as Reminder;
    const after = ofKind(
      derive({
        customer: customer(),
        conversations: [conversation('2026-05-31')],
        reminders: [done],
      }),
      'annualReview',
    );
    expect(after[0]?.dueDate).toBe('2027-09-15');
    expect(after[0]?.creatable).toBe(true);
  });

  it('events by their rule: before, on the date, immediately, month end', () => {
    const candidates = derive({
      customer: customer(),
      lifeEvents: [
        event('marriage', '2027-05-31'), // 3 months before, clamped to the month end
        event('move', '2026-11'), // on the date (1st of the month)
        event('jobChange', '2026-12-15'), // 1 month before
        event('salaryIncrease', undefined, '2026-09-20T10:00:00.000Z'), // immediately
        event('salaryIncrease', '2027-02-01'), // in the future: on the date
      ],
    });
    const due = (kind: LifeEventKind) =>
      candidates.filter((c) => c.event === kind).map((c) => c.dueDate);
    expect(due('marriage')).toEqual(['2027-02-28']);
    expect(due('move')).toEqual(['2026-11-01']);
    expect(due('jobChange')).toEqual(['2026-11-15']);
    expect(due('salaryIncrease')).toEqual(['2026-09-20', '2027-02-01']);
    expect(candidates.find((c) => c.event === 'move')).toMatchObject({
      kind: 'lifeEvent',
      title: 'Umzug',
    });
  });

  it('old events create nothing new', () => {
    const candidates = derive({
      customer: customer({ trainingStart: '2026-08' }),
      lifeEvents: [
        event('childBirth', '2025-05'), // more than 6 months ago
        event('move', '2026-07'), // already happened: no reminder (the need engine has it)
        event('parentalLeaveEnd', '2026-09'), // passed: preparing makes no sense
        event('jobChange', '2026-10'), // this month: still ahead
        event('childBirth', '2026-09-30'), // yesterday
      ],
    });
    const creatable = (kind: LifeEventKind) => candidates.find((c) => c.event === kind)?.creatable;
    expect(creatable('childBirth')).toBe(false);
    expect(creatable('move')).toBe(false);
    expect(creatable('parentalLeaveEnd')).toBe(false);
    expect(creatable('jobChange')).toBe(true);
    expect(candidates.filter((c) => c.event === 'childBirth').map((c) => c.creatable)).toEqual([
      false,
      false,
    ]);
    expect(creatable('trainingStart')).toBe(false);
  });

  it('events without a date only for "immediately" rules', () => {
    const candidates = derive({
      customer: customer(),
      lifeEvents: [event('marriage'), event('move')],
    });
    expect(candidates.filter((c) => c.kind === 'lifeEvent')).toEqual([]);
  });

  it('archived customers and records of other customers', () => {
    expect(derive({ customer: customer({ archived: true, trainingEnd: '2027-01' }) })).toEqual([]);
    const other: LifeEvent = { ...event('move', '2026-11'), customerId: uuid() };
    expect(derive({ customer: customer(), lifeEvents: [other] }).some((c) => c.event)).toBe(false);
  });
});

describe('planReminderSync', () => {
  const base = () =>
    derive({ customer: customer({ trainingEnd: '2027-01', birthDate: '2010-03-14' }) });

  it('creates once and then nothing (no duplicates)', () => {
    const candidates = base();
    const first = planReminderSync(candidates, []);
    expect(first.create.map((c) => c.kind).sort()).toEqual([
      'annualReview',
      'eighteenthBirthday',
      'trainingEnd',
    ]);
    const stored = store(first.create);
    expect(planReminderSync(candidates, stored)).toEqual({ create: [], remove: [] });
  });

  it('a fact change replaces the open reminder, completed ones stay', () => {
    const stored = store(base().filter((c) => c.creatable));
    const doneBirthday = stored.map((r) =>
      r.kind === 'eighteenthBirthday'
        ? { ...r, done: true, doneAt: '2026-10-01T10:00:00.000Z' }
        : r,
    );
    // Training ends later, birth date corrected.
    const changed = derive({
      customer: customer({ trainingEnd: '2027-06', birthDate: '2010-04-14' }),
    });
    const plan = planReminderSync(changed, doneBirthday);
    expect(plan.remove.map((r) => r.kind)).toEqual(['trainingEnd']);
    expect(plan.create.map((c) => `${c.kind} ${c.dueDate}`).sort()).toEqual([
      'eighteenthBirthday 2028-04-14',
      'trainingEnd 2027-03-01',
    ]);
  });

  it('keeps postponed and manual reminders, removes duplicates', () => {
    const candidates = base();
    const stored = store(candidates.filter((c) => c.creatable));
    const postponed = stored.map((r) =>
      r.kind === 'trainingEnd' ? { ...r, dueDate: '2026-11-15' } : r,
    );
    const manual = reminderSchema.parse({
      id: uuid(),
      customerId: CUSTOMER_ID,
      dueDate: '2026-10-05',
      kind: 'manual',
      title: 'Anrufen',
      createdAt: '2026-10-01T08:00:00.000Z',
      updatedAt: '2026-10-01T08:00:00.000Z',
    });
    // The same annual review created twice (two tabs at once).
    const [duplicate] = store(ofKind(candidates, 'annualReview'), '2026-10-01T09:00:00.000Z');
    const plan = planReminderSync(candidates, [...postponed, manual, duplicate as Reminder]);
    expect(plan.create).toEqual([]);
    expect(plan.remove).toEqual([duplicate]);
  });

  it('never removes a completed duplicate', () => {
    const candidates = base();
    const [a] = store(ofKind(candidates, 'annualReview'));
    const [b] = store(ofKind(candidates, 'annualReview'), '2026-10-01T09:00:00.000Z');
    const done = { ...(b as Reminder), done: true };
    expect(planReminderSync(candidates, [a as Reminder, done]).remove).toEqual([a]);
  });
});

describe('demo customers', () => {
  const builds = DEMO_CUSTOMERS.map((source, index) =>
    buildDemoCustomer(source, {
      today: DEMO_REFERENCE_DATE,
      now: `${DEMO_REFERENCE_DATE}T12:00:00.000Z`,
      number: `K-${String(index + 1).padStart(4, '0')}`,
    }),
  );

  it('match the rules: the sync has nothing to do', () => {
    for (const build of builds) {
      const candidates = deriveReminders(build, DEMO_REFERENCE_DATE);
      expect(planReminderSync(candidates, build.reminders), build.customer.firstName).toEqual({
        create: [],
        remove: [],
      });
    }
  });

  it('expected reminders of the test customers', () => {
    const summary = Object.fromEntries(
      builds.map((build) => [
        build.customer.firstName,
        build.reminders
          .filter((r) => r.kind !== 'annualReview')
          .map((r) => `${r.title} ${r.dueDate}${r.dateToCheck ? ' ?' : ''}`)
          .sort(),
      ]),
    );
    expect(summary).toEqual({
      Leon: ['18. Geburtstag 2028-03-14', 'Ausbildungsende 2029-05-01'],
      Ben: ['Ausbildungsende 2026-10-01', 'Führerschein 2026-11-15'],
      Clara: ['Studienende 2027-06-01'],
      David: ['Gehaltssprung 2026-10-05', 'Heirat 2027-03-01'],
      Emma: ['Elternzeit-Ende 2027-01-01'],
      Finn: [
        '18. Geburtstag 2027-01-01 ?',
        'Ausbildungsbeginn 2027-06-01',
        'Ausbildungsende 2030-11-01',
      ],
      Greta: ['Gesprächstermin 2026-10-20'],
      Hannes: ['Ausbildungsende 2026-11-01'],
      Ilka: [],
      Jonas: ['Studienende 2026-12-01'],
      Kaya: ['Heirat 2027-02-01'],
      Lars: ['Jahresende 2026-11-30'],
    });
    // Every test customer has exactly one open annual review.
    for (const build of builds) {
      expect(build.reminders.filter((r) => r.kind === 'annualReview' && !r.done)).toHaveLength(1);
    }
  });
});

describe('schedule', () => {
  it('buckets', () => {
    const cases: [string, ReminderBucket][] = [
      ['2026-09-30', 'overdue'],
      ['2026-10-01', 'today'],
      ['2026-10-02', 'next30'],
      ['2026-10-31', 'next30'],
      ['2026-11-01', 'next90'],
      ['2026-12-30', 'next90'],
      ['2026-12-31', 'later'],
    ];
    for (const [date, bucket] of cases) expect(reminderBucket(date, TODAY), date).toBe(bucket);
  });

  it('postponing', () => {
    expect(postponedDate('2026-10-10', 'week', TODAY)).toBe('2026-10-17');
    expect(postponedDate('2026-09-01', 'week', TODAY)).toBe('2026-10-08'); // overdue: from today
    expect(postponedDate('2027-01-31', 'month', TODAY)).toBe('2027-02-28');
  });

  it('due and next reminder per customer', () => {
    const [a, b, c] = store(base());
    function base() {
      return derive({ customer: customer({ trainingEnd: '2027-01', birthDate: '2010-03-14' }) });
    }
    const reminders = [a, b, c] as Reminder[];
    expect(reminders.filter((r) => isDue(r, TODAY)).map((r) => r.kind)).toEqual(['trainingEnd']);
    expect(nextReminders(reminders).get(CUSTOMER_ID)?.kind).toBe('trainingEnd');
    const done = reminders.map((r) => (r.kind === 'trainingEnd' ? { ...r, done: true } : r));
    expect(nextReminders(done).get(CUSTOMER_ID)?.kind).toBe('annualReview');
    expect([...reminders].sort(byDueDate).map((r) => r.dueDate)).toEqual([
      '2026-10-01',
      '2027-01-10',
      '2028-03-14',
    ]);
  });
});

describe('calendar export', () => {
  const labels: CalendarLabels = {
    kinds: {
      trainingEnd: 'Ausbildungsende',
      eighteenthBirthday: 'Verträge umstellen',
      annualReview: 'Jahresgespräch',
      manual: 'Wiedervorlage',
    },
    events: {
      trainingStart: 'Ausbildungsbeginn',
      trainingEnd: 'Ausbildungsende',
      eighteenthBirthday: '18. Geburtstag',
      driversLicense: 'Führerschein',
      salaryIncrease: 'Gehaltssprung',
      jobChange: 'Jobwechsel',
      move: 'Umzug',
      marriage: 'Heirat',
      childBirth: 'Geburt eines Kindes',
      parentalLeaveEnd: 'Elternzeit-Ende',
      propertyPurchase: 'Immobilienkauf',
      annualReview: 'Jahresgespräch',
    },
    description: (number) => `Kompass-Wiedervorlage ${number}`,
  };

  it('escapes and folds lines (75 octets, UTF-8 safe)', () => {
    expect(escapeText('a,b;c\\d\ne')).toBe('a\\,b\\;c\\\\d\\ne');
    const folded = foldLine(`SUMMARY:${'ä'.repeat(60)}`);
    for (const line of folded.split('\r\n')) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    expect(folded.replace(/\r\n /g, '')).toBe(`SUMMARY:${'ä'.repeat(60)}`);
  });

  it('pseudonymised all-day events with an alarm the day before', () => {
    const person = customer({
      lastName: 'Musterfrau',
      phone: '+49 151 2345678',
      email: 'mia@example.com',
      birthDate: '2010-03-14',
      trainingEnd: '2027-01',
    });
    const reminders = store(derive({ customer: person }).filter((c) => c.creatable)).map((r) =>
      r.kind === 'trainingEnd' ? { ...r, todo: 'Mia Musterfrau anrufen' } : r,
    );
    const ics = buildIcs(
      calendarEvents(reminders, { [person.id]: person }, labels),
      new Date('2026-10-01T08:30:00.000Z'),
      { alarm: 'Kompass-Wiedervorlage morgen' },
    );
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('SUMMARY:K-0001 · Ausbildungsende');
    expect(ics).toContain('DTSTART;VALUE=DATE:20261001\r\nDTEND;VALUE=DATE:20261002');
    expect(ics).toContain('TRIGGER:-PT15H');
    expect(ics).toContain('DTSTAMP:20261001T083000Z');
    // 18th birthday: neutral occasion, so the date does not reveal the birthday.
    expect(ics).toContain('SUMMARY:K-0001 · Verträge umstellen');
    for (const secret of [
      'Mia',
      'Musterfrau',
      '2345678',
      'example.com',
      'Geburtstag',
      '20100314',
    ]) {
      expect(ics).not.toContain(secret);
    }
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(3);
  });

  it('end date across the year end', () => {
    const ics = buildIcs(
      [{ uid: 'x', date: '2026-12-31', summary: 'K-0001 · Jahresgespräch' }],
      new Date(),
      {
        alarm: 'morgen',
      },
    );
    expect(ics).toContain('DTEND;VALUE=DATE:20270101');
  });
});
