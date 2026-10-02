/**
 * Key figures of the start page: customers, consents, reminders, product coverage per line,
 * open needs by priority, pipeline and birthdays. Archived customers do not count.
 */
import { ageInfo, nextBirthday, daysUntilBirthday } from '@/core/customers/age';
import { hasMarketingConsent } from '@/core/customers/consent';
import { addDays, ageOn } from '@/core/dates';
import { needViews, type NeedView } from '@/core/needs/decisions';
import { assessNeeds } from '@/core/needs/engine';
import { needFacts } from '@/core/needs/facts';
import { byDueDate, nextReminders } from '@/core/reminders/schedule';
import {
  PRODUCT_LINES,
  type ContractStatus,
  type Potential,
  type Priority,
  type ProductLine,
} from '@/data/domain';
import { PRODUCT_LINE_INFO } from '@/data/reference';
import type { Customer, LifeEvent, Need, Reminder } from '@/data/schemas';

export const DASHBOARD_LIMITS = {
  /** Customers in "open needs by priority". */
  openNeeds: 10,
  /** Reminders due up to this many days ahead count as "due soon". */
  dueDays: 30,
  /** Birthdays up to this many days ahead. */
  birthdayDays: 30,
  birthdayWeek: 7,
} as const;

export interface DashboardInput {
  customers: readonly Customer[];
  lifeEvents: readonly LifeEvent[];
  needs: readonly Need[];
  reminders: readonly Reminder[];
  today: string;
}

export interface Metrics {
  customers: number;
  /** Demo or synthetic customers among them. */
  demo: number;
  /** Marketing consent (minors also with the parents' consent). */
  invitable: number;
  /** Minors and possible minors (only the birth year known). */
  minors: number;
  overdue: number;
  dueToday: number;
  /** Due from today up to 30 days ahead (today included). */
  dueSoon: number;
}

export interface CoverageRow {
  line: ProductLine;
  priority: Priority;
  concluded: number;
  /** Planned or offered. */
  pipeline: number;
  viaParents: number;
  /** Need "now" without a concluded contract. */
  needWithoutContract: number;
  /** Customers for whom the line is relevant (not "not relevant", not "via parents"). */
  relevant: number;
  /** concluded ÷ relevant (0–1); undefined without relevant customers. */
  quote?: number;
}

export interface OpenNeedLine {
  line: ProductLine;
  /** The customer has the contract; it needs an adjustment. */
  adjust: boolean;
}

export interface OpenNeedsEntry {
  customer: Customer;
  /** Highest priority of the open needs. */
  priority: Priority;
  lines: OpenNeedLine[];
}

export interface PipelineEntry {
  customer: Customer;
  line: ProductLine;
  status: Extract<ContractStatus, 'planned' | 'offered'>;
  nextReminder?: Reminder;
}

export interface PipelineLine {
  line: ProductLine;
  planned: number;
  offered: number;
  entries: PipelineEntry[];
}

export interface BirthdayEntry {
  customer: Customer;
  date: string;
  /** 0 = today. */
  days: number;
  /** The new age on that day. */
  age: number;
  /** Greetings count as marketing: only with consent. */
  canGreet: boolean;
}

export interface Birthdays {
  today: BirthdayEntry[];
  /** In 1–7 days. */
  week: BirthdayEntry[];
  /** In 8–30 days. */
  month: BirthdayEntry[];
}

export interface Dashboard {
  /** Active customers by number. */
  customers: Customer[];
  /** Need views per active customer (for lists behind the figures). */
  views: Map<string, NeedView[]>;
  metrics: Metrics;
  coverage: CoverageRow[];
  /** Open needs "now" per priority (all active customers). */
  needsByPriority: Record<Priority, number>;
  /** Customers with open needs: priority first, potential only on a tie (top 10). */
  openNeeds: OpenNeedsEntry[];
  /** Customers with open needs in total (the list shows the top 10). */
  openNeedsCustomers: number;
  pipeline: PipelineLine[];
  /** Open reminders due today or earlier, by due date. */
  due: Reminder[];
  birthdays: Birthdays;
}

const POTENTIAL_RANK: Record<Potential, number> = { high: 3, medium: 2, low: 1 };
const potentialRank = (customer: Customer) =>
  customer.potential ? POTENTIAL_RANK[customer.potential] : 0;

const byNumber = (a: Customer, b: Customer) =>
  a.number.localeCompare(b.number, 'de', { numeric: true });

function groupBy<T extends { customerId: string }>(records: readonly T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const record of records) {
    const group = groups.get(record.customerId);
    if (group) group.push(record);
    else groups.set(record.customerId, [record]);
  }
  return groups;
}

/** Need views of every active customer (engine suggestion merged with the decisions). */
export function allNeedViews(input: Omit<DashboardInput, 'reminders'>): Map<string, NeedView[]> {
  const events = groupBy(input.lifeEvents);
  const needs = groupBy(input.needs);
  const views = new Map<string, NeedView[]>();
  for (const customer of input.customers) {
    if (customer.archived) continue;
    const facts = needFacts(customer, events.get(customer.id) ?? [], input.today);
    views.set(customer.id, needViews(assessNeeds(facts), needs.get(customer.id) ?? []));
  }
  return views;
}

function coverageRows(customers: readonly Customer[], views: Map<string, NeedView[]>) {
  return PRODUCT_LINES.map((line): CoverageRow => {
    const count = (status: ContractStatus) =>
      customers.filter((customer) => customer.contracts[line] === status).length;
    const concluded = count('concluded');
    const viaParents = count('viaParents');
    const relevant = customers.length - count('notRelevant') - viaParents;
    const needWithoutContract = customers.filter(
      (customer) =>
        customer.contracts[line] !== 'concluded' &&
        views.get(customer.id)?.some((view) => view.line === line && view.group === 'now'),
    ).length;
    return {
      line,
      priority: PRODUCT_LINE_INFO[line].priority,
      concluded,
      pipeline: count('planned') + count('offered'),
      viaParents,
      needWithoutContract,
      relevant,
      quote: relevant > 0 ? concluded / relevant : undefined,
    };
  });
}

function openNeedsEntries(customers: readonly Customer[], views: Map<string, NeedView[]>) {
  const entries: OpenNeedsEntry[] = [];
  for (const customer of customers) {
    const open = (views.get(customer.id) ?? [])
      .filter((view) => view.group === 'now')
      .sort(
        (a, b) =>
          a.priority - b.priority || PRODUCT_LINES.indexOf(a.line) - PRODUCT_LINES.indexOf(b.line),
      );
    const first = open[0];
    if (!first) continue;
    entries.push({
      customer,
      priority: first.priority,
      lines: open.map((view) => ({ line: view.line, adjust: view.assessment.kind === 'adjust' })),
    });
  }
  // Need before potential: the potential only decides between equal priorities.
  return entries.sort(
    (a, b) =>
      a.priority - b.priority ||
      potentialRank(b.customer) - potentialRank(a.customer) ||
      b.lines.length - a.lines.length ||
      byNumber(a.customer, b.customer),
  );
}

function pipelineLines(customers: readonly Customer[], reminders: readonly Reminder[]) {
  const next = nextReminders(reminders);
  return PRODUCT_LINES.map((line): PipelineLine => {
    const entries = customers
      .filter((c) => c.contracts[line] === 'planned' || c.contracts[line] === 'offered')
      .sort(byNumber)
      .map((customer): PipelineEntry => ({
        customer,
        line,
        status: customer.contracts[line] === 'planned' ? 'planned' : 'offered',
        nextReminder: next.get(customer.id),
      }));
    return {
      line,
      planned: entries.filter((entry) => entry.status === 'planned').length,
      offered: entries.filter((entry) => entry.status === 'offered').length,
      entries,
    };
  }).filter((group) => group.entries.length > 0);
}

/** Birthdays in the next 30 days (only with a known birth date). */
export function upcomingBirthdays(customers: readonly Customer[], today: string): Birthdays {
  const entries: BirthdayEntry[] = [];
  for (const customer of customers) {
    if (customer.archived || !customer.birthDate) continue;
    const days = daysUntilBirthday(customer.birthDate, today);
    if (days > DASHBOARD_LIMITS.birthdayDays) continue;
    const date = nextBirthday(customer.birthDate, today);
    entries.push({
      customer,
      date,
      days,
      age: ageOn(customer.birthDate, date),
      canGreet: hasMarketingConsent(customer, today),
    });
  }
  entries.sort((a, b) => a.days - b.days || byNumber(a.customer, b.customer));
  return {
    today: entries.filter((entry) => entry.days === 0),
    week: entries.filter((entry) => entry.days > 0 && entry.days <= DASHBOARD_LIMITS.birthdayWeek),
    month: entries.filter((entry) => entry.days > DASHBOARD_LIMITS.birthdayWeek),
  };
}

export function buildDashboard(input: DashboardInput): Dashboard {
  const { today } = input;
  const customers = input.customers.filter((customer) => !customer.archived).sort(byNumber);
  const active = new Set(customers.map((customer) => customer.id));
  const open = input.reminders.filter((r) => !r.done && active.has(r.customerId));
  const soon = addDays(today, DASHBOARD_LIMITS.dueDays);
  const views = allNeedViews({ ...input, customers });

  const needsByPriority: Record<Priority, number> = { 1: 0, 2: 0, 3: 0 };
  for (const list of views.values()) {
    for (const view of list) if (view.group === 'now') needsByPriority[view.priority] += 1;
  }
  const openNeeds = openNeedsEntries(customers, views);

  return {
    customers,
    views,
    metrics: {
      customers: customers.length,
      demo: customers.filter((customer) => customer.demo).length,
      invitable: customers.filter((customer) => hasMarketingConsent(customer, today)).length,
      minors: customers.filter((customer) => {
        const { minor } = ageInfo(customer, today);
        return minor === 'yes' || minor === 'maybe';
      }).length,
      overdue: open.filter((r) => r.dueDate < today).length,
      dueToday: open.filter((r) => r.dueDate === today).length,
      dueSoon: open.filter((r) => r.dueDate >= today && r.dueDate <= soon).length,
    },
    coverage: coverageRows(customers, views),
    needsByPriority,
    openNeeds: openNeeds.slice(0, DASHBOARD_LIMITS.openNeeds),
    openNeedsCustomers: openNeeds.length,
    pipeline: pipelineLines(customers, open),
    due: open.filter((r) => r.dueDate <= today).sort(byDueDate),
    birthdays: upcomingBirthdays(customers, today),
  };
}
