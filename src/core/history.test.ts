import { describe, expect, it } from 'vitest';
import { formatCustomerNumber, parseCustomerNumber } from './customerNumber';
import { applyFieldChanges, diffRecords } from './history';
import { nextTimestamp } from './time';

describe('diffRecords', () => {
  it('lists changed, added and removed fields with old and new value', () => {
    const before = { id: '1', firstName: 'Lena', occupation: 'Azubi', phone: '0170', tags: ['a'] };
    const after = { id: '1', firstName: 'Lena', occupation: 'Bankkauffrau', tags: ['a', 'b'] };
    expect(diffRecords(before, { ...after, email: 'l@example.org' })).toEqual([
      { path: 'email', to: 'l@example.org' },
      { path: 'occupation', from: 'Azubi', to: 'Bankkauffrau' },
      { path: 'phone', from: '0170' },
      { path: 'tags', from: ['a'], to: ['a', 'b'] },
    ]);
  });

  it('compares nested objects field by field', () => {
    const before = { contracts: { bu: 'open', car: 'open' }, consents: {} };
    const after = {
      contracts: { bu: 'concluded', car: 'open' },
      consents: { marketing: { granted: true, date: '2026-10-01' } },
    };
    expect(diffRecords(before, after)).toEqual([
      { path: 'consents.marketing.date', to: '2026-10-01' },
      { path: 'consents.marketing.granted', to: true },
      { path: 'contracts.bu', from: 'open', to: 'concluded' },
    ]);
  });

  it('ignores technical fields', () => {
    expect(
      diffRecords(
        { id: 'a', createdAt: 'x', updatedAt: 'y', note: 'n' },
        { id: 'b', createdAt: 'z', updatedAt: 'w', note: 'n' },
      ),
    ).toEqual([]);
  });
});

describe('customer numbers', () => {
  it('formats and parses K-0001', () => {
    expect(formatCustomerNumber(1)).toBe('K-0001');
    expect(formatCustomerNumber(123)).toBe('K-0123');
    expect(formatCustomerNumber(12345)).toBe('K-12345');
    expect(parseCustomerNumber('K-0042')).toBe(42);
    expect(parseCustomerNumber('K-42')).toBeNull();
    expect(() => formatCustomerNumber(0)).toThrow(RangeError);
  });
});

describe('nextTimestamp', () => {
  it('always moves forward', () => {
    const now = Date.parse('2026-10-01T10:00:00.000Z');
    expect(nextTimestamp(undefined, now)).toBe('2026-10-01T10:00:00.000Z');
    expect(nextTimestamp('2026-10-01T10:00:00.000Z', now)).toBe('2026-10-01T10:00:00.001Z');
    expect(nextTimestamp('2026-10-01T11:00:00.000Z', now)).toBe('2026-10-01T11:00:00.001Z');
  });
});

describe('applyFieldChanges', () => {
  it('undoes and replays nested changes without touching the original', () => {
    const record = { contracts: { bu: 'concluded' }, occupation: 'Azubi', phone: '0170' };
    const changes = [
      { path: 'contracts.bu', from: 'open', to: 'concluded' },
      { path: 'occupation', from: 'Schüler', to: 'Azubi' },
      { path: 'phone', to: '0170' },
    ];
    const before = applyFieldChanges(record, changes, 'from');
    expect(before).toEqual({ contracts: { bu: 'open' }, occupation: 'Schüler' });
    expect(applyFieldChanges(before, changes, 'to')).toEqual(record);
    expect(record.contracts.bu).toBe('concluded');
    expect(diffRecords(before, record)).toEqual(changes);
  });
});
