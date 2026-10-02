/** Customer list: search, filters and sorting (in memory, after decrypting). */
import type { ContractStatus, LifePhase, ProductLine } from '@/data/domain';
import type { Customer } from '@/data/schemas';
import { searchScore } from '../search';
import { ageInfo, daysUntilBirthday } from './age';
import { hasMarketingConsent } from './consent';

export interface CustomerFilter {
  /** Empty: all phases. */
  lifePhases: LifePhase[];
  /** Customers whose contract for the line has one of the statuses. */
  product?: { line: ProductLine; statuses: ContractStatus[] };
  marketing: 'any' | 'granted' | 'missing';
  /** Only minors (also "maybe" with only the birth year known). */
  minors: boolean;
  openPoints: boolean;
  demo: 'any' | 'only' | 'hide';
  /** Show the archive instead of the active customers. */
  archived: boolean;
}

export const EMPTY_FILTER: CustomerFilter = {
  lifePhases: [],
  marketing: 'any',
  minors: false,
  openPoints: false,
  demo: 'any',
  archived: false,
};

export const CUSTOMER_SORTS = ['number', 'name', 'age', 'birthday', 'updated'] as const;
export type CustomerSort = (typeof CUSTOMER_SORTS)[number];

/** Number of active filter criteria (the archive switch counts as one). */
export function activeFilterCount(filter: CustomerFilter): number {
  return (
    (filter.lifePhases.length > 0 ? 1 : 0) +
    (filter.product ? 1 : 0) +
    (filter.marketing !== 'any' ? 1 : 0) +
    (filter.minors ? 1 : 0) +
    (filter.openPoints ? 1 : 0) +
    (filter.demo !== 'any' ? 1 : 0) +
    (filter.archived ? 1 : 0)
  );
}

const digitsOf = (text: string) => text.replace(/\D/g, '');

function matchesPhone(phone: string | undefined, query: string): boolean {
  if (!phone || !/^[\d\s+/()-]+$/.test(query)) return false;
  const digits = digitsOf(query);
  if (digits.length < 3) return false;
  const stored = digitsOf(phone);
  // "0151…" typed, "+49 151…" stored.
  const national = query.trim().startsWith('0') ? digits.slice(1) : digits;
  return stored.includes(digits) || stored.includes(national);
}

function matchesNumber(number: string, query: string): boolean {
  const match = /^k-?\s*0*(\d+)$/i.exec(query.trim());
  return match !== null && Number(match[1]) === Number(number.slice(2));
}

/** Search in first and last name, customer number, occupation and phone number. */
export function matchesQuery(customer: Customer, query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;
  if (matchesNumber(customer.number, trimmed) || matchesPhone(customer.phone, trimmed)) {
    return true;
  }
  return (
    searchScore(
      {
        title: [customer.firstName, customer.lastName].filter(Boolean).join(' '),
        aliases: [customer.number],
        text: customer.occupation ? [customer.occupation] : [],
      },
      trimmed,
    ) > 0
  );
}

export function matchesFilter(customer: Customer, filter: CustomerFilter, today: string): boolean {
  if (customer.archived !== filter.archived) return false;
  if (filter.lifePhases.length > 0) {
    if (!customer.lifePhase || !filter.lifePhases.includes(customer.lifePhase)) return false;
  }
  if (
    filter.product &&
    !filter.product.statuses.includes(customer.contracts[filter.product.line])
  ) {
    return false;
  }
  if (filter.marketing !== 'any') {
    const granted = hasMarketingConsent(customer, today);
    if (granted !== (filter.marketing === 'granted')) return false;
  }
  if (filter.minors) {
    const { minor } = ageInfo(customer, today);
    if (minor !== 'yes' && minor !== 'maybe') return false;
  }
  if (filter.openPoints && customer.openPoints.length === 0) return false;
  if (filter.demo === 'only' && !customer.demo) return false;
  if (filter.demo === 'hide' && customer.demo) return false;
  return true;
}

const collator = new Intl.Collator('de', { sensitivity: 'base', numeric: true });

const fullName = (c: Customer) => [c.firstName, c.lastName].filter(Boolean).join(' ');

function compare(sort: CustomerSort, today: string): (a: Customer, b: Customer) => number {
  const byNumber = (a: Customer, b: Customer) => collator.compare(a.number, b.number);
  switch (sort) {
    case 'number':
      return byNumber;
    case 'name':
      return (a, b) => collator.compare(fullName(a), fullName(b)) || byNumber(a, b);
    case 'age': {
      // Youngest first; unknown ages last.
      const age = (c: Customer) => ageInfo(c, today).age ?? Number.POSITIVE_INFINITY;
      return (a, b) => age(a) - age(b) || byNumber(a, b);
    }
    case 'birthday': {
      const days = (c: Customer) =>
        c.birthDate ? daysUntilBirthday(c.birthDate, today) : Number.POSITIVE_INFINITY;
      return (a, b) => days(a) - days(b) || byNumber(a, b);
    }
    case 'updated':
      return (a, b) => b.updatedAt.localeCompare(a.updatedAt) || byNumber(a, b);
  }
}

export interface ListOptions {
  query: string;
  filter: CustomerFilter;
  sort: CustomerSort;
  /** Today as "JJJJ-MM-TT". */
  today: string;
}

export function filterCustomers(customers: readonly Customer[], options: ListOptions): Customer[] {
  const { query, filter, sort, today } = options;
  return customers
    .filter((c) => matchesFilter(c, filter, today) && matchesQuery(c, query))
    .sort(compare(sort, today));
}
