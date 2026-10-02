/** The facts the need engine works with, derived from a customer and their life events. */
import type {
  ContractStatus,
  Employment,
  Housing,
  LifeEventKind,
  LifePhase,
  MaritalStatus,
  ProductLine,
} from '@/data/domain';
import type { Customer, LifeEvent } from '@/data/schemas';
import { ageInfo, type MinorStatus } from '../customers/age';
import { addMonths, daysBetween } from '../dates';

export interface DatedEvent {
  kind: LifeEventKind;
  /** "JJJJ-MM" or "JJJJ-MM-TT"; events without a date are known but undated. */
  date?: string;
}

export interface NeedFacts {
  /** "JJJJ-MM-TT" */
  today: string;
  age?: number;
  minor: MinorStatus;
  lifePhase?: LifePhase;
  employment?: Employment;
  housing?: Housing;
  maritalStatus?: MaritalStatus;
  children: number;
  netIncome?: number;
  employerVl?: boolean;
  employerBav?: boolean;
  contracts: Record<ProductLine, ContractStatus>;
  events: DatedEvent[];
  /** Free-text answers of the question catalogue that rules look at. */
  sport?: string;
  reserves?: string;
}

export function needFacts(
  customer: Customer,
  lifeEvents: readonly LifeEvent[],
  today: string,
): NeedFacts {
  const { age, minor } = ageInfo(customer, today);
  const events: DatedEvent[] = lifeEvents
    .filter((event) => event.customerId === customer.id)
    .map((event) => ({ kind: event.kind, date: event.date }));
  // Planned start/end of training count like the events, if those are not recorded.
  for (const [kind, date] of [
    ['trainingStart', customer.trainingStart],
    ['trainingEnd', customer.trainingEnd],
  ] as const) {
    if (date && !events.some((event) => event.kind === kind)) events.push({ kind, date });
  }
  // Minors: the 18th birthday (with only the year known: 1 January).
  if (
    (minor === 'yes' || minor === 'maybe') &&
    !events.some((e) => e.kind === 'eighteenthBirthday')
  ) {
    const date = customer.birthDate
      ? addMonths(customer.birthDate, 18 * 12)
      : customer.birthYear
        ? `${customer.birthYear + 18}-01-01`
        : undefined;
    if (date) events.push({ kind: 'eighteenthBirthday', date });
  }
  return {
    today,
    age,
    minor,
    lifePhase: customer.lifePhase,
    employment: customer.employment,
    housing: customer.housing,
    maritalStatus: customer.maritalStatus,
    children: customer.children ?? 0,
    netIncome: customer.netIncome,
    employerVl: customer.employerVl,
    employerBav: customer.employerBav,
    contracts: customer.contracts,
    events,
    sport: customer.answers.sport,
    reserves: customer.answers.reserves,
  };
}

/** Months from today to the event (negative = in the past); months count from the 15th. */
export function monthsUntil(today: string, date: string): number {
  const day = date.length === 7 ? `${date}-15` : date;
  return daysBetween(today, day) / 30.44;
}

/** The nearest dated event of the kinds within the window (past: -months … 0). */
export function recentEvent(
  facts: NeedFacts,
  kinds: readonly LifeEventKind[],
  months: number,
): DatedEvent | undefined {
  return facts.events
    .filter((e) => e.date && kinds.includes(e.kind))
    .map((e) => ({ e, m: monthsUntil(facts.today, e.date ?? '') }))
    .filter(({ m }) => m <= 0 && m >= -months)
    .sort((a, b) => b.m - a.m)[0]?.e;
}

/** The nearest dated future event of the kinds within the window. */
export function upcomingEvent(
  facts: NeedFacts,
  kinds: readonly LifeEventKind[],
  months: number,
): DatedEvent | undefined {
  return facts.events
    .filter((e) => e.date && kinds.includes(e.kind))
    .map((e) => ({ e, m: monthsUntil(facts.today, e.date ?? '') }))
    .filter(({ m }) => m > 0 && m <= months)
    .sort((a, b) => a.m - b.m)[0]?.e;
}

/** Any dated event of the kind in the past. */
export function pastEvent(facts: NeedFacts, kind: LifeEventKind): DatedEvent | undefined {
  return facts.events.find(
    (e) => e.kind === kind && e.date !== undefined && monthsUntil(facts.today, e.date) <= 0,
  );
}

/** Answers like "nein", "keine", "-" say there is nothing. */
export function meaningful(answer: string | undefined): answer is string {
  return answer !== undefined && !/^\s*(nein|keine?n?|nichts|-|–)\s*[.!]?\s*$/i.test(answer);
}

export function saysNo(answer: string | undefined): boolean {
  return answer !== undefined && /^\s*(nein|keine?)\b/i.test(answer);
}
