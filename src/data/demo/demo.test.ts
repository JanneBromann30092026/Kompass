import { describe, expect, it } from 'vitest';
import { addDays, ageOn, daysBetween } from '@/core/dates';
import { formatCustomerNumber } from '@/core/customerNumber';
import {
  conversationSchema,
  customerSchema,
  historyEntrySchema,
  lifeEventSchema,
  reminderSchema,
} from '../schemas';
import { buildDemoCustomer, shiftTextDates, type DemoBuild } from './buildDemo';
import { DEMO_CUSTOMERS, DEMO_REFERENCE_DATE } from './demoCustomers';
import { buildSyntheticCustomers, SYNTHETIC_TAG } from './synthetic';

const buildAll = (today: string): DemoBuild[] =>
  DEMO_CUSTOMERS.map((source, index) =>
    buildDemoCustomer(source, {
      today,
      now: `${today}T12:00:00.000Z`,
      number: formatCustomerNumber(index + 1),
    }),
  );

function expectValid(build: DemoBuild, now: string) {
  expect(() => customerSchema.parse(build.customer)).not.toThrow();
  for (const record of build.lifeEvents) lifeEventSchema.parse(record);
  for (const record of build.reminders) reminderSchema.parse(record);
  for (const record of build.conversations) conversationSchema.parse(record);
  for (const record of build.history) historyEntrySchema.parse(record);
  const stamps = [
    build.customer.createdAt,
    build.customer.updatedAt,
    ...build.history.map((h) => h.updatedAt),
  ];
  for (const stamp of stamps) expect(stamp <= now).toBe(true);
}

describe('demo customers', () => {
  it('are 12 fictional customers with obviously invented contact data', () => {
    expect(DEMO_CUSTOMERS).toHaveLength(12);
    const names = DEMO_CUSTOMERS.map((d) => d.customer.firstName);
    expect(new Set(names).size).toBe(12);
    expect(names).not.toContain('Ala');
    for (const { customer } of DEMO_CUSTOMERS) {
      if (customer.phone) expect(customer.phone).toMatch(/^\+49 000 /);
      if (customer.email) expect(customer.email).toMatch(/@example\.com$/);
    }
    expect(DEMO_CUSTOMERS.filter((d) => d.customer.lastName).length).toBeGreaterThanOrEqual(3);
    expect(DEMO_CUSTOMERS.filter((d) => d.customer.phone).length).toBeGreaterThanOrEqual(3);
  });

  it('build valid records on the reference date', () => {
    for (const build of buildAll(DEMO_REFERENCE_DATE)) {
      expectValid(build, `${DEMO_REFERENCE_DATE}T12:00:00.000Z`);
      expect(build.customer.demo).toBe(true);
      expect(build.history[0]?.action).toBe('created');
    }
  });

  it('keep ids stable and shift all dates relative to today', () => {
    const base = buildAll(DEMO_REFERENCE_DATE);
    const today = '2027-05-20';
    const days = daysBetween(DEMO_REFERENCE_DATE, today);
    const shifted = buildAll(today);
    shifted.forEach((build, index) => {
      const original = base[index]!;
      expectValid(build, `${today}T12:00:00.000Z`);
      expect(build.customer.id).toBe(original.customer.id);
      if (original.customer.birthDate) {
        expect(build.customer.birthDate).toBe(addDays(original.customer.birthDate, days));
      }
      const explicit = DEMO_CUSTOMERS[index]!.reminders.length;
      build.reminders.slice(0, explicit).forEach((reminder, i) => {
        expect(reminder.dueDate).toBe(addDays(original.reminders[i]!.dueDate, days));
      });
      // Derived reminders fall on the first of a month (or 1 January). Event reminders may
      // differ: a month-only event date ("2026-09") counts as passed only after its month.
      for (const derived of original.reminders.slice(explicit)) {
        if (derived.kind === 'lifeEvent') continue;
        const expected = addDays(derived.dueDate, days);
        const match = build.reminders
          .slice(explicit)
          .find((reminder) => reminder.kind === derived.kind);
        expect(match, derived.kind).toBeDefined();
        expect(Math.abs(daysBetween(expected, match!.dueDate))).toBeLessThanOrEqual(366);
      }
    });
  });

  it('keep minors minor and have birthdays in the next 7 days', () => {
    for (const today of [DEMO_REFERENCE_DATE, '2027-02-11', '2031-07-30']) {
      const builds = buildAll(today);
      const minors = builds.filter(({ customer }) =>
        customer.birthDate
          ? ageOn(customer.birthDate, today) < 18
          : Number(today.slice(0, 4)) - (customer.birthYear ?? 0) < 18,
      );
      expect(minors.length).toBeGreaterThanOrEqual(2);
      for (const minor of minors) {
        expect(minor.customer.parentalConsent?.granted).toBe(true);
        expect(minor.reminders.some((r) => r.kind === 'eighteenthBirthday')).toBe(true);
      }
      const soon = builds.filter((b) => {
        const birth = b.customer.birthDate;
        if (!birth) return false;
        const next = `${today.slice(0, 4)}${birth.slice(4)}`;
        const diff = daysBetween(today, next);
        return diff >= 0 && diff <= 7;
      });
      expect(soon.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('derive the 18th birthday on 1 January when only the year is known', () => {
    const finn = buildAll(DEMO_REFERENCE_DATE).find((b) => !b.customer.birthDate);
    expect(finn?.customer.birthYear).toBeDefined();
    const reminder = finn?.reminders.find((r) => r.kind === 'eighteenthBirthday');
    expect(reminder?.dueDate).toBe(`${(finn?.customer.birthYear ?? 0) + 18}-01-01`);
    expect(reminder?.dateToCheck).toBe(true);
  });

  it('record the first contact and later changes in the history', () => {
    const [leon] = buildAll(DEMO_REFERENCE_DATE);
    const customerHistory = leon!.history.filter((h) => h.entity === 'customer');
    expect(customerHistory.map((h) => h.action)).toEqual(['created', 'updated']);
    expect(customerHistory[0]?.changes).toContainEqual({ path: 'contracts.bu', to: 'open' });
    expect(customerHistory[1]?.changes).toContainEqual({
      path: 'contracts.bu',
      from: 'open',
      to: 'concluded',
    });
    expect(leon!.history.filter((h) => h.entity === 'conversation')).toHaveLength(1);
  });

  it('shift dates written in free text', () => {
    expect(shiftTextDates('Elternzeit bis 03/2027, dann 10/2027', 31)).toBe(
      'Elternzeit bis 04/2027, dann 11/2027',
    );
    expect(shiftTextDates('12/2026', 0)).toBe('12/2026');
  });
});

describe('synthetic customers', () => {
  const options = { today: '2026-10-01', now: '2026-10-01T12:00:00.000Z', firstSequence: 13 };

  it('are valid, numbered and marked', () => {
    const builds = buildSyntheticCustomers(200, options);
    expect(builds).toHaveLength(200);
    expect(builds[0]?.customer.number).toBe('K-0013');
    expect(builds[199]?.customer.number).toBe('K-0212');
    for (const build of builds) {
      expectValid(build, options.now);
      expect(build.customer.demo).toBe(true);
      expect(build.customer.tags).toContain(SYNTHETIC_TAG);
      if (ageOn(build.customer.birthDate!, options.today) < 18) {
        expect(build.customer.parentalConsent?.granted).toBe(true);
      }
    }
    expect(new Set(builds.map((b) => b.customer.id)).size).toBe(200);
  });

  it('are deterministic for the same start', () => {
    expect(buildSyntheticCustomers(5, options)).toEqual(buildSyntheticCustomers(5, options));
  });
});
