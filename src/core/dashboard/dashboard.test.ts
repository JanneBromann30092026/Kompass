import { describe, expect, it } from 'vitest';
import { addDays } from '@/core/dates';
import { buildDemoCustomer } from '@/data/demo/buildDemo';
import { DEMO_CUSTOMERS, DEMO_REFERENCE_DATE } from '@/data/demo/demoCustomers';
import { PRODUCT_LINES, type ProductLine } from '@/data/domain';
import { PRODUCT_LINE_INFO } from '@/data/reference';
import type { Customer, Need, Reminder } from '@/data/schemas';
import { buildDashboard, upcomingBirthdays, type DashboardInput } from './dashboard';

const TODAY = DEMO_REFERENCE_DATE;

function demoInput(today = TODAY): DashboardInput {
  const builds = DEMO_CUSTOMERS.map((source, index) =>
    buildDemoCustomer(source, {
      today,
      now: `${today}T12:00:00.000Z`,
      number: `K-${String(index + 1).padStart(4, '0')}`,
    }),
  );
  return {
    customers: builds.map((b) => b.customer),
    lifeEvents: builds.flatMap((b) => b.lifeEvents),
    reminders: builds.flatMap((b) => b.reminders),
    needs: [],
    today,
  };
}

const name = (customer: Customer) => customer.firstName;
const lineName = (line: ProductLine) => PRODUCT_LINE_INFO[line].name;

/**
 * Reference values: 00_Dashboard of the knowledge base (Stand 2026-10-01). K-0001 is called
 * "Leon" here (invented name in the public repository).
 */
describe('dashboard of the test customers (reference date)', () => {
  const dashboard = buildDashboard(demoInput());

  it('key figures', () => {
    expect(dashboard.metrics).toEqual({
      customers: 12,
      demo: 12,
      invitable: 9,
      minors: 2,
      overdue: 1,
      dueToday: 1,
      dueSoon: 3,
    });
    expect(dashboard.due.map((r) => r.dueDate)).toEqual(['2026-09-20', '2026-10-01']);
  });

  it('product coverage per line', () => {
    const table = Object.fromEntries(
      dashboard.coverage.map((row) => [
        lineName(row.line),
        [
          row.concluded,
          row.pipeline,
          row.viaParents,
          row.needWithoutContract,
          row.quote === undefined ? undefined : Math.round(row.quote * 100),
        ],
      ]),
    );
    expect(table).toEqual({
      BU: [5, 2, 0, 5, 42],
      Haftpflicht: [7, 0, 5, 0, 100],
      Kfz: [5, 0, 1, 0, 83],
      Unfall: [4, 2, 1, 3, 36],
      Investmentrente: [1, 4, 0, 4, 9],
      bAV: [2, 0, 0, 1, 29],
      VL: [2, 1, 0, 4, 33],
      Fondssparplan: [6, 0, 0, 3, 50],
      Hausrat: [6, 0, 1, 1, 75],
    });
  });

  it('open needs: priority first, potential only on a tie', () => {
    expect(
      dashboard.openNeeds.map(
        (entry) =>
          `${name(entry.customer)} ${entry.priority}: ${entry.lines
            .map((l) => lineName(l.line) + (l.adjust ? ' (Anpassung)' : ''))
            .join(', ')}`,
      ),
    ).toEqual([
      'Ben 1: BU, Unfall, VL, Fondssparplan',
      'David 1: BU (Anpassung), Investmentrente, bAV',
      'Greta 1: BU, Investmentrente',
      'Clara 1: BU',
      'Finn 1: BU',
      'Jonas 1: BU',
      'Lars 2: Investmentrente',
      'Leon 2: Unfall, Investmentrente, VL',
      // Deviation (engine.test.ts): after her move Kaya's household insurance needs an
      // adjustment, so she has three needs and moves ahead of Emma; Hannes is 11th.
      'Kaya 2: VL, Fondssparplan, Hausrat (Anpassung)',
      'Emma 2: VL, Fondssparplan',
    ]);
    expect(dashboard.openNeedsCustomers).toBe(11);
    const total = dashboard.coverage.reduce((sum, row) => sum + row.needWithoutContract, 0);
    expect(dashboard.needsByPriority[1] + dashboard.needsByPriority[2]).toBeGreaterThanOrEqual(
      total,
    );
  });

  it('pipeline: planned and offered per line, with the next reminder', () => {
    const rows = dashboard.pipeline.flatMap((group) =>
      group.entries.map(
        (entry) =>
          `${lineName(entry.line)} ${name(entry.customer)} ${entry.status} ${entry.nextReminder?.dueDate ?? '–'}`,
      ),
    );
    expect(rows).toEqual([
      'BU Ben offered 2026-10-01',
      'BU Clara planned 2027-03-10',
      'Unfall Leon planned 2027-09-15',
      'Unfall Hannes offered 2026-11-01',
      'Investmentrente Leon planned 2027-09-15',
      'Investmentrente David offered 2026-10-05',
      'Investmentrente Greta planned 2026-10-20',
      'Investmentrente Lars offered 2026-11-30',
      'VL Kaya offered 2027-02-01',
    ]);
    expect(dashboard.pipeline.map((g) => [lineName(g.line), g.planned, g.offered])).toEqual([
      ['BU', 1, 1],
      ['Unfall', 1, 1],
      ['Investmentrente', 2, 2],
      ['VL', 0, 1],
    ]);
  });

  it('birthdays in the next 7 days: Ilka, Ben, Emma', () => {
    const { today, week, month } = dashboard.birthdays;
    expect(today).toEqual([]);
    expect(week.map((b) => name(b.customer)).sort()).toEqual(['Ben', 'Emma', 'Ilka']);
    for (const entry of [...week, ...month]) {
      expect(entry.days).toBeGreaterThan(0);
      expect(entry.date > TODAY).toBe(true);
    }
  });
});

describe('dashboard rules', () => {
  const input = demoInput();
  const ben = input.customers.find((c) => c.firstName === 'Ben')!;

  it('archived customers and their reminders do not count', () => {
    const archived = input.customers.map((c) => (c.id === ben.id ? { ...c, archived: true } : c));
    const dashboard = buildDashboard({ ...input, customers: archived });
    expect(dashboard.metrics.customers).toBe(11);
    expect(dashboard.metrics.dueToday).toBe(0);
    expect(dashboard.openNeeds.some((e) => e.customer.id === ben.id)).toBe(false);
    expect(dashboard.pipeline.flatMap((g) => g.entries).some((e) => e.customer.id === ben.id)).toBe(
      false,
    );
  });

  it('done reminders do not count', () => {
    const reminders = input.reminders.map((r): Reminder => ({ ...r, done: true }));
    const { metrics, due } = buildDashboard({ ...input, reminders });
    expect([metrics.overdue, metrics.dueSoon, due.length]).toEqual([0, 0, 0]);
  });

  it('decisions count: a dismissed need is no open need', () => {
    const dismissed: Need = {
      id: 'n1',
      customerId: ben.id,
      productLine: 'bu',
      status: 'dismissed',
      source: 'rule',
      timing: 'now',
      priority: 1,
      createdAt: `${TODAY}T08:00:00.000Z`,
      updatedAt: `${TODAY}T08:00:00.000Z`,
    };
    const dashboard = buildDashboard({ ...input, needs: [dismissed] });
    const entry = dashboard.openNeeds.find((e) => e.customer.id === ben.id);
    expect(entry?.lines.map((l) => l.line)).not.toContain('bu');
    expect(dashboard.coverage.find((row) => row.line === 'bu')?.needWithoutContract).toBe(4);
  });

  it('quote without relevant customers is undefined', () => {
    const notRelevant = input.customers.map((c) => ({
      ...c,
      contracts: { ...c.contracts, household: 'notRelevant' as const },
    }));
    const row = buildDashboard({ ...input, customers: notRelevant }).coverage.find(
      (r) => r.line === 'household',
    );
    expect(row?.quote).toBeUndefined();
    expect(PRODUCT_LINES).toHaveLength(9);
  });

  it('birthdays: today, week, month; new age; greetings only with marketing consent', () => {
    const base = { ...ben, archived: false, birthYear: undefined };
    const at = (birthDate: string, id: string, consent: boolean): Customer => ({
      ...base,
      id,
      number: `K-01${id}`,
      birthDate,
      consents: {
        ...base.consents,
        marketing: { granted: consent, date: '2026-01-01' },
      },
      parentalConsent: undefined,
    });
    const today = '2026-03-01';
    const birthdays = upcomingBirthdays(
      [
        at('1990-03-01', '01', true),
        at('1990-03-08', '02', false),
        at('1990-03-31', '03', true),
        at('1990-04-01', '04', true),
        at('2010-03-05', '05', true),
      ],
      today,
    );
    expect(birthdays.today.map((b) => [b.customer.id, b.age, b.canGreet])).toEqual([
      ['01', 36, true],
    ]);
    // A minor with marketing consent but without the parents' consent: no greeting.
    expect(birthdays.week.map((b) => [b.customer.id, b.days, b.age, b.canGreet])).toEqual([
      ['05', 4, 16, false],
      ['02', 7, 36, false],
    ]);
    expect(birthdays.month.map((b) => [b.customer.id, b.date])).toEqual([['03', '2026-03-31']]);
    expect(addDays(today, 30)).toBe('2026-03-31');
  });
});
