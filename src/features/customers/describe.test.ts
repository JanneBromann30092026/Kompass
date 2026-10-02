import { describe, expect, it } from 'vitest';
import { describeChange, fieldLabel } from './describe';

describe('history descriptions', () => {
  it('names fields and values in German', () => {
    expect(
      describeChange('customer', { path: 'contracts.bu', from: 'offered', to: 'concluded' }),
    ).toEqual({
      label: 'Vertrag BU',
      from: 'angeboten',
      to: 'abgeschlossen',
    });
    expect(describeChange('customer', { path: 'lifePhase', to: 'training' }).to).toBe('Ausbildung');
    expect(describeChange('customer', { path: 'netIncome', to: 1200 }).to.replace(/\s/g, ' ')).toBe(
      '1.200 €',
    );
    expect(describeChange('customer', { path: 'birthDate', to: '2007-10-05' }).to).toBe(
      '05.10.2007',
    );
    expect(describeChange('customer', { path: 'consents.marketing.granted', to: true }).to).toBe(
      'erteilt',
    );
    expect(fieldLabel('customer', 'consents.marketing.date')).toBe(
      'Werbung / Seminar-Einladung (Datum)',
    );
    expect(fieldLabel('customer', 'answers.sport')).toBe('Sport');
    expect(describeChange('lifeEvent', { path: 'kind', to: 'move' })).toMatchObject({
      label: 'Art',
      to: 'Umzug',
    });
  });

  it('shows only removed and added list items', () => {
    const change = describeChange('customer', {
      path: 'openPoints',
      from: ['Person: Kinder', 'Eltern anrufen'],
      to: ['Eltern anrufen', 'Termin machen'],
    });
    expect(change.diff).toBe('− Person: Kinder · + Termin machen');
  });
});
