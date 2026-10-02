import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  addDays,
  addMonths,
  ageOn,
  daysBetween,
  firstOfMonth,
  localIsoDate,
  shiftYearMonth,
} from './dates';
import { deterministicUuid } from './deterministicId';

describe('calendar dates', () => {
  it('adds days across months, years and DST changes', () => {
    expect(addDays('2026-10-01', 30)).toBe('2026-10-31');
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(daysBetween('2026-10-01', '2027-10-01')).toBe(365);
    expect(daysBetween('2026-10-02', '2026-10-01')).toBe(-1);
  });

  it('adds months with clamping and finds the 1st', () => {
    expect(addMonths('2027-01-31', 1)).toBe('2027-02-28');
    expect(addMonths('2027-01-15', -3)).toBe('2026-10-15');
    expect(firstOfMonth('2027-01-15')).toBe('2027-01-01');
    expect(shiftYearMonth('2027-01', 0)).toBe('2027-01');
    expect(shiftYearMonth('2027-01', 20)).toBe('2027-02');
    expect(shiftYearMonth('2027-01', -14)).toBe('2027-01');
  });

  it('computes ages', () => {
    expect(ageOn('2010-03-14', '2026-10-01')).toBe(16);
    expect(ageOn('2008-10-01', '2026-10-01')).toBe(18);
    expect(ageOn('2008-10-02', '2026-10-01')).toBe(17);
  });

  it('formats the local date', () => {
    expect(localIsoDate(new Date(2026, 9, 2, 23, 30))).toBe('2026-10-02');
  });
});

describe('deterministicUuid', () => {
  it('is stable, distinct and a valid UUID', () => {
    const a = deterministicUuid('demo:customer:k01');
    expect(deterministicUuid('demo:customer:k01')).toBe(a);
    expect(deterministicUuid('demo:customer:k02')).not.toBe(a);
    expect(z.uuid().safeParse(a).success).toBe(true);
  });
});
