import { describe, expect, it } from 'vitest';
import { formatBytes, formatCalendarDate, formatDateTime, formatMoney } from './format';

describe('formatBytes', () => {
  it('formats bytes without decimals', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(999)).toBe('999 B');
  });

  it('uses decimal units and a German decimal comma', () => {
    expect(formatBytes(1000)).toBe('1 KB');
    expect(formatBytes(1500)).toBe('1,5 KB');
    expect(formatBytes(2_340_000)).toBe('2,3 MB');
    expect(formatBytes(1_000_000_000)).toBe('1 GB');
  });

  it('drops decimals for values of 100 and above', () => {
    expect(formatBytes(123_456_789)).toBe('123 MB');
  });

  it('caps at the largest unit', () => {
    expect(formatBytes(5e15)).toBe('5.000 TB');
  });

  it('returns a dash for invalid input', () => {
    expect(formatBytes(-1)).toBe('–');
    expect(formatBytes(Number.NaN)).toBe('–');
    expect(formatBytes(Number.POSITIVE_INFINITY)).toBe('–');
  });
});

describe('calendar and money formats', () => {
  it('formats dates, months, timestamps and euros', () => {
    expect(formatCalendarDate('2007-10-05')).toBe('05.10.2007');
    expect(formatCalendarDate('2026-08')).toBe('08/2026');
    expect(formatDateTime('2026-10-02T07:15:00.000Z')).toMatch(/^02\.10\.2026, \d{2}:15$/);
    expect(formatMoney(1200).replace(/\s/g, ' ')).toBe('1.200 €');
  });
});
