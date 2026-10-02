import { describe, expect, it } from 'vitest';
import { QUESTIONNAIRE } from '@/data/reference';
import { customerSchema, type Customer, type CustomerInput } from '@/data/schemas';
import {
  ageInfo,
  birthdayInYear,
  daysUntilBirthday,
  needsParentalConsent,
  nextBirthday,
} from './age';
import { consentIssues, hasMarketingConsent } from './consent';
import { EMPTY_FILTER, activeFilterCount, filterCustomers, matchesQuery } from './list';
import { mailtoHref, normalizePhone, telHref, whatsappHref } from './phone';
import {
  isQuestionAnswered,
  mergeOpenPoints,
  resolveOpenPoints,
  unansweredOpenPoints,
  valueAt,
} from './questionnaire';

const TODAY = '2026-10-02';
let sequence = 0;

function customer(input: CustomerInput, extra: Partial<Customer> = {}): Customer {
  sequence += 1;
  return {
    ...customerSchema.parse({
      ...input,
      id: crypto.randomUUID(),
      number: `K-${String(sequence).padStart(4, '0')}`,
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: `2026-0${(sequence % 9) + 1}-01T10:00:00.000Z`,
    }),
    ...extra,
  };
}

describe('age and minority', () => {
  it('uses the exact birth date', () => {
    expect(ageInfo({ birthDate: '2008-10-02' }, TODAY)).toEqual({
      age: 18,
      approximate: false,
      minor: 'no',
    });
    expect(ageInfo({ birthDate: '2008-10-03' }, TODAY).minor).toBe('yes');
  });

  it('falls back to the birth year', () => {
    expect(ageInfo({ birthYear: 2009 }, TODAY)).toEqual({
      age: 17,
      approximate: true,
      minor: 'yes',
    });
    // Turns 18 this year – the exact date decides.
    expect(ageInfo({ birthYear: 2008 }, TODAY).minor).toBe('maybe');
    expect(ageInfo({ birthYear: 2007 }, TODAY).minor).toBe('no');
    expect(ageInfo({}, TODAY)).toEqual({ approximate: false, minor: 'unknown' });
    expect(needsParentalConsent({ birthYear: 2008 }, TODAY)).toBe(true);
    expect(needsParentalConsent({ birthYear: 2007 }, TODAY)).toBe(false);
  });

  it('handles 29 February', () => {
    // Legally 18 with the end of 28 February in a common year.
    expect(ageInfo({ birthDate: '2008-02-29' }, '2026-02-28').age).toBe(17);
    expect(ageInfo({ birthDate: '2008-02-29' }, '2026-03-01').age).toBe(18);
    expect(birthdayInYear('2008-02-29', 2027)).toBe('2027-02-28');
    expect(birthdayInYear('2008-02-29', 2028)).toBe('2028-02-29');
    expect(nextBirthday('2008-02-29', '2027-03-01')).toBe('2028-02-29');
    expect(nextBirthday('1990-10-02', TODAY)).toBe('2026-10-02');
    expect(daysUntilBirthday('1990-10-05', TODAY)).toBe(3);
    expect(daysUntilBirthday('1990-10-01', TODAY)).toBe(364);
  });
});

describe('phone numbers', () => {
  it('normalises to the international format', () => {
    expect(normalizePhone('0151 123 4567')).toBe('+49 151 123 4567');
    expect(normalizePhone('0151/1234567')).toBe('+49 151 1234567');
    expect(normalizePhone('0049 30 123456')).toBe('+49 30 123456');
    expect(normalizePhone('+49 (0)30 12-34-56')).toBe('+49 30 12 34 56');
    expect(normalizePhone('(030) 1234')).toBe('+49 30 1234');
    expect(normalizePhone('+43 664 1234567')).toBe('+43 664 1234567');
    expect(normalizePhone('  ')).toBe('');
    expect(normalizePhone('1234567')).toBe('1234567');
  });

  it('builds call and WhatsApp links', () => {
    expect(telHref('+49 151 123 4567')).toBe('tel:+491511234567');
    expect(whatsappHref('+49 151 123 4567')).toBe('https://wa.me/491511234567');
    expect(whatsappHref('1234567')).toBeNull();
    expect(whatsappHref('+49 151 123 4567', 'Alles Gute & viel Glück!')).toBe(
      'https://wa.me/491511234567?text=Alles%20Gute%20%26%20viel%20Gl%C3%BCck!',
    );
    expect(mailtoHref(' ben@example.com ')).toBe('mailto:ben@example.com');
    expect(
      mailtoHref('ben@example.com', { subject: 'Alles Gute', body: 'Hallo Ben,\nviel Glück' }),
    ).toBe('mailto:ben@example.com?subject=Alles%20Gute&body=Hallo%20Ben%2C%0Aviel%20Gl%C3%BCck');
  });
});

describe('consent', () => {
  it('requires the parents for marketing to minors', () => {
    const marketing = { marketing: { granted: true, date: TODAY } };
    expect(consentIssues({ birthDate: '2010-01-01', consents: marketing }, TODAY)).toEqual([
      'parentalConsentMissing',
    ]);
    const withParents = {
      birthDate: '2010-01-01',
      consents: marketing,
      parentalConsent: { granted: true, date: TODAY },
    };
    expect(consentIssues(withParents, TODAY)).toEqual([]);
    expect(hasMarketingConsent(withParents, TODAY)).toBe(true);
    expect(hasMarketingConsent({ birthYear: 1990, consents: {} }, TODAY)).toBe(false);
  });
});

describe('question catalogue', () => {
  it('reads values at paths', () => {
    expect(
      valueAt({ consents: { marketing: { granted: true } } }, 'consents.marketing.granted'),
    ).toBe(true);
    expect(valueAt({}, 'answers.sport')).toBeUndefined();
  });

  it('turns unanswered questions into open points', () => {
    const bare = customer({ firstName: 'Mia' });
    const points = unansweredOpenPoints(bare, QUESTIONNAIRE);
    expect(points).toContain('Person: Geburtsdatum (oder Jahrgang)');
    expect(points).toContain('Bestehende Verträge: Eigene Verträge');
    // Phase unknown: questions limited to some phases are asked too.
    expect(points).toContain('Beruf: Übernahme?');

    const retired = customer({
      firstName: 'Lars',
      lifePhase: 'retirement',
      children: 0,
      employerVl: false,
      contracts: { liability: 'concluded' },
      answers: { sport: 'Radfahren' },
    });
    const left = unansweredOpenPoints(retired, QUESTIONNAIRE);
    expect(left).not.toContain('Person: Kinder');
    expect(left).not.toContain('Beruf: Übernahme?');
    expect(left).not.toContain('Beruf: Zahlt der Arbeitgeber VL oder bAV?');
    expect(left).not.toContain('Bestehende Verträge: Eigene Verträge');
    expect(left).not.toContain('Risiken & Hobbys: Sport');
    expect(left).toContain('Risiken & Hobbys: Haustiere');
  });

  it('counts false and 0 as answers, "open" contracts not', () => {
    const question = QUESTIONNAIRE.sections[1]!.questions[3]!;
    expect(isQuestionAnswered(question, { employerBav: false })).toBe(true);
    expect(isQuestionAnswered(question, {})).toBe(false);
    const contracts = QUESTIONNAIRE.sections[4]!.questions[0]!;
    expect(isQuestionAnswered(contracts, customer({ firstName: 'X' }))).toBe(false);
  });

  it('removes generated open points once answered, keeps own ones', () => {
    const own = 'Termin mit den Eltern vereinbaren';
    const points = mergeOpenPoints([own], ['Person: Kinder', 'Finanzen: Netto-Einkommen', own]);
    expect(points).toEqual([own, 'Person: Kinder', 'Finanzen: Netto-Einkommen']);
    expect(resolveOpenPoints({ children: 2, openPoints: points } as never, QUESTIONNAIRE)).toEqual([
      own,
      'Finanzen: Netto-Einkommen',
    ]);
    // Changing the phase settles questions that no longer apply.
    expect(
      resolveOpenPoints(
        { lifePhase: 'retirement', openPoints: ['Beruf: Übernahme?'] },
        QUESTIONNAIRE,
      ),
    ).toEqual([]);
  });
});

describe('customer list', () => {
  const ben = customer(
    {
      firstName: 'Ben',
      lastName: 'Hartmann',
      phone: '+49 000 5550102',
      occupation: 'Azubi Mechatroniker',
      birthDate: '2007-10-05',
      lifePhase: 'training',
      contracts: { bu: 'concluded' },
      consents: { marketing: { granted: true, date: TODAY } },
    },
    { number: 'K-0003', updatedAt: '2026-09-30T10:00:00.000Z' },
  );
  const finn = customer(
    { firstName: 'Finn', birthYear: 2009, lifePhase: 'school', demo: true },
    { number: 'K-0002', updatedAt: '2026-05-01T10:00:00.000Z' },
  );
  const emma = customer(
    {
      firstName: 'Emma',
      birthDate: '1995-10-07',
      lifePhase: 'careerStart',
      openPoints: ['Netto-Einkommen fehlt'],
    },
    { number: 'K-0001', updatedAt: '2026-06-01T10:00:00.000Z' },
  );
  const old = customer(
    { firstName: 'Anton', birthYear: 1950 },
    { number: 'K-0004', archived: true },
  );
  const all = [emma, old, finn, ben];
  const list = (patch: Partial<typeof EMPTY_FILTER> = {}, query = '', sort = 'number' as const) =>
    filterCustomers(all, { query, filter: { ...EMPTY_FILTER, ...patch }, sort, today: TODAY }).map(
      (c) => c.firstName,
    );

  it('searches names, number, occupation and phone', () => {
    expect(matchesQuery(ben, 'hartm')).toBe(true);
    expect(matchesQuery(ben, 'ben hartmann')).toBe(true);
    expect(matchesQuery(ben, ben.number.toLowerCase())).toBe(true);
    expect(matchesQuery(ben, `K${Number(ben.number.slice(2))}`)).toBe(true);
    expect(matchesQuery(ben, 'mechatron')).toBe(true);
    expect(matchesQuery(ben, '0000 555')).toBe(true);
    expect(matchesQuery(ben, '5550102')).toBe(true);
    expect(matchesQuery(ben, 'emma')).toBe(false);
  });

  it('filters and hides the archive', () => {
    expect(list()).toEqual(['Emma', 'Finn', 'Ben']);
    expect(list({ archived: true })).toEqual(['Anton']);
    expect(list({ lifePhases: ['school', 'training'] })).toEqual(['Finn', 'Ben']);
    expect(list({ product: { line: 'bu', statuses: ['concluded'] } })).toEqual(['Ben']);
    expect(list({ marketing: 'granted' })).toEqual(['Ben']);
    expect(list({ marketing: 'missing' })).toEqual(['Emma', 'Finn']);
    expect(list({ minors: true })).toEqual(['Finn']);
    expect(list({ openPoints: true })).toEqual(['Emma']);
    expect(list({ demo: 'only' })).toEqual(['Finn']);
    expect(list({ demo: 'hide' })).toEqual(['Emma', 'Ben']);
    expect(activeFilterCount({ ...EMPTY_FILTER, minors: true, lifePhases: ['school'] })).toBe(2);
    const selection = { label: 'BU: Bedarf ohne Vertrag', ids: [ben.id, emma.id] };
    expect(list({ selection })).toEqual(['Emma', 'Ben']);
    expect(list({ selection, lifePhases: ['training'] })).toEqual(['Ben']);
    expect(activeFilterCount({ ...EMPTY_FILTER, selection })).toBe(1);
  });

  it('sorts', () => {
    const sorted = (sort: 'name' | 'age' | 'birthday' | 'updated') =>
      filterCustomers(all, { query: '', filter: EMPTY_FILTER, sort, today: TODAY }).map(
        (c) => c.firstName,
      );
    expect(sorted('name')).toEqual(['Ben', 'Emma', 'Finn']);
    expect(sorted('age')).toEqual(['Finn', 'Ben', 'Emma']);
    // Ben on 5 October, Emma on 7 October, Finn without date last.
    expect(sorted('birthday')).toEqual(['Ben', 'Emma', 'Finn']);
    expect(sorted('updated')[0]).toBe('Ben');
  });
});
