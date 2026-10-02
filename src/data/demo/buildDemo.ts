/**
 * Turns the demo source into complete records, shifted from DEMO_REFERENCE_DATE to today:
 * due dates, birthdays and ages stay realistic whenever the demo is loaded. Pure – the
 * import (src/data/repositories/demoRepo.ts) encrypts and stores the result.
 */
import { addDays, daysBetween, shiftYearMonth } from '@/core/dates';
import { deterministicUuid } from '@/core/deterministicId';
import { applyFieldChanges, diffRecords, type FieldChange } from '@/core/history';
import { deriveReminders, type ReminderFacts } from '@/core/reminders/derive';
import { LIFE_EVENT_KINDS, type LifeEventKind } from '../domain';
import { LIFE_EVENT_INFO } from '../reference';
import { customerSchema } from '../schemas';
import type {
  Conversation,
  Customer,
  CustomerInput,
  HistoryEntity,
  HistoryEntry,
  LifeEvent,
  Reminder,
} from '../schemas';
import { DEMO_REFERENCE_DATE, type DemoCustomer } from './demoCustomers';

/** Everything that belongs to one demo customer. */
export interface DemoBuild {
  customer: Customer;
  lifeEvents: LifeEvent[];
  reminders: Reminder[];
  conversations: Conversation[];
  history: HistoryEntry[];
}

export interface BuildOptions {
  /** Today as "JJJJ-MM-TT" (local). */
  today: string;
  /** Current time (ISO); no timestamp lies after it. */
  now: string;
  /** Customer number from the counter, e.g. "K-0001". */
  number: string;
}

export function demoCustomerId(key: string): string {
  return deterministicUuid(`kompass-demo:customer:${key}`);
}

/** Shifts dates of the form "MM/JJJJ" inside free text ("Elternzeit bis 03/2027"). */
export function shiftTextDates(text: string, days: number): string {
  if (days === 0) return text;
  return text.replace(/\b(0[1-9]|1[0-2])\/(\d{4})\b/g, (_match, month: string, year: string) => {
    const [y, m] = shiftYearMonth(`${year}-${month}`, days).split('-');
    return `${m}/${y}`;
  });
}

function shiftDate(date: string, days: number): string {
  return date.length === 7 ? shiftYearMonth(date, days) : addDays(date, days);
}

/** A time on a (shifted) day, never after `now`. */
function timestamp(day: string, minuteOfDay: number, now: string): string {
  const base = Date.parse(`${day}T00:00:00.000Z`) + minuteOfDay * 60_000;
  return new Date(Math.min(base, Date.parse(now) - 60_000)).toISOString();
}

function shiftCustomer(
  input: DemoCustomer['customer'],
  days: number,
  years: number,
): CustomerInput {
  const consent = <T extends { date: string }>(value: T | undefined) =>
    value ? { ...value, date: addDays(value.date, days) } : undefined;
  const shifted: CustomerInput = {
    ...input,
    demo: true,
    occupation: input.occupation ? shiftTextDates(input.occupation, days) : undefined,
    birthDate: input.birthDate ? addDays(input.birthDate, days) : undefined,
    // Only the year known: move by calendar years so "this year minus birth year" stays.
    birthYear: input.birthYear ? input.birthYear + years : undefined,
    trainingStart: input.trainingStart ? shiftYearMonth(input.trainingStart, days) : undefined,
    trainingEnd: input.trainingEnd ? shiftYearMonth(input.trainingEnd, days) : undefined,
    consents: {
      dataStorage: consent(input.consents?.dataStorage),
      marketing: consent(input.consents?.marketing),
      contactChannel: consent(input.consents?.contactChannel),
    },
    parentalConsent: consent(input.parentalConsent),
    openPoints: input.openPoints?.map((point) => shiftTextDates(point, days)),
    answers: input.answers
      ? Object.fromEntries(
          Object.entries(input.answers).map(([key, text]) => [
            key,
            text ? shiftTextDates(text, days) : text,
          ]),
        )
      : undefined,
  };
  return JSON.parse(JSON.stringify(shifted)) as CustomerInput;
}

function historyEntry(
  customerId: string,
  entity: HistoryEntity,
  entityId: string,
  action: HistoryEntry['action'],
  changes: FieldChange[],
  at: string,
): HistoryEntry {
  return {
    id: deterministicUuid(`kompass-demo:history:${entityId}:${action}:${at}`),
    customerId,
    updatedAt: at,
    entity,
    entityId,
    action,
    changes,
  };
}

type ReminderFields = Omit<Reminder, 'id' | 'customerId' | 'createdAt' | 'updatedAt'>;

/** The life event a demo reminder of kind "lifeEvent" refers to (by its title). */
function eventByTitle(title: string): LifeEventKind | undefined {
  return LIFE_EVENT_KINDS.find((kind) => LIFE_EVENT_INFO[kind].name === title);
}

/**
 * Reminders as the rules derive them (src/core/reminders). An explicit demo reminder of the
 * same rule replaces the generic one (own to-do, possibly postponed) but keeps its key, so
 * the automatic sync creates no duplicate.
 */
function demoReminders(
  explicit: ReminderFields[],
  facts: Omit<ReminderFacts, 'reminders'>,
  today: string,
): ReminderFields[] {
  const candidates = deriveReminders({ ...facts, reminders: [] }, today);
  const used = new Set<string>();
  const result: ReminderFields[] = explicit.map((reminder) => {
    const match = candidates.find(
      (candidate) =>
        !used.has(candidate.ruleKey) &&
        candidate.kind === reminder.kind &&
        candidate.event === reminder.event,
    );
    if (!match) return reminder;
    used.add(match.ruleKey);
    return { ...reminder, ruleKey: match.ruleKey, dateToCheck: match.dateToCheck };
  });
  for (const candidate of candidates) {
    if (used.has(candidate.ruleKey) || !candidate.creatable) continue;
    result.push({
      dueDate: candidate.dueDate,
      kind: candidate.kind,
      event: candidate.event,
      title: candidate.title,
      todo: candidate.todo,
      dateToCheck: candidate.dateToCheck,
      done: false,
      ruleKey: candidate.ruleKey,
    });
  }
  return result;
}

export function buildDemoCustomer(source: DemoCustomer, options: BuildOptions): DemoBuild {
  const { today, now } = options;
  const days = daysBetween(DEMO_REFERENCE_DATE, today);
  const id = demoCustomerId(source.key);
  const since = addDays(source.since, days);
  const createdAt = timestamp(since, 8 * 60, now);
  const changes = source.changes.map((change, index) => ({
    at: timestamp(addDays(change.date, days), 9 * 60 + index, now),
    changes: change.changes,
  }));
  const updatedAt = changes.at(-1)?.at ?? createdAt;

  // Parsed: complete record with all defaults (as stored by the repository).
  const customer = customerSchema.parse({
    ...shiftCustomer(
      source.customer,
      days,
      Number(today.slice(0, 4)) - Number(DEMO_REFERENCE_DATE.slice(0, 4)),
    ),
    id,
    number: options.number,
    createdAt,
    updatedAt,
  });
  // State at the first contact: the later changes undone.
  const initial = changes.reduceRight(
    (record, change) => applyFieldChanges(record, change.changes, 'from'),
    customer,
  );

  const history: HistoryEntry[] = [
    historyEntry(id, 'customer', id, 'created', diffRecords({}, initial), createdAt),
    ...changes.map((change) =>
      historyEntry(id, 'customer', id, 'updated', change.changes, change.at),
    ),
  ];
  const linked = (kind: string, index: number) =>
    deterministicUuid(`kompass-demo:${kind}:${source.key}:${index}`);

  const lifeEvents: LifeEvent[] = source.lifeEvents.map((event, index) => {
    const record: LifeEvent = {
      id: linked('event', index),
      customerId: id,
      kind: event.kind,
      date: event.date ? shiftDate(event.date, days) : undefined,
      note: event.note ? shiftTextDates(event.note, days) : undefined,
      createdAt: timestamp(since, 8 * 60 + 1 + index, now),
      updatedAt: timestamp(since, 8 * 60 + 1 + index, now),
    };
    return JSON.parse(JSON.stringify(record)) as LifeEvent;
  });

  const conversations: Conversation[] = source.conversations.map((conversation, index) => {
    const day = addDays(conversation.date, days);
    return {
      id: linked('conversation', index),
      customerId: id,
      date: day,
      title: conversation.title,
      notes: shiftTextDates(conversation.notes, days),
      createdAt: timestamp(day, 10 * 60 + index, now),
      updatedAt: timestamp(day, 10 * 60 + index, now),
    };
  });

  const lastContact = [since, ...conversations.map((c) => c.date)].sort().at(-1) ?? since;
  const reminderBase = demoReminders(
    source.reminders.map((reminder) => ({
      dueDate: addDays(reminder.dueDate, days),
      kind: reminder.kind,
      event: reminder.kind === 'lifeEvent' ? eventByTitle(reminder.title) : undefined,
      title: reminder.title,
      todo: shiftTextDates(reminder.todo, days),
      dateToCheck: false,
      done: false,
    })),
    { customer, lifeEvents, conversations },
    today,
  );
  const reminders: Reminder[] = reminderBase.map((reminder, index) => ({
    ...reminder,
    id: linked('reminder', index),
    customerId: id,
    createdAt: timestamp(lastContact, 11 * 60 + index, now),
    updatedAt: timestamp(lastContact, 11 * 60 + index, now),
  }));

  for (const [entity, records] of [
    ['lifeEvent', lifeEvents],
    ['conversation', conversations],
    ['reminder', reminders],
  ] as const) {
    for (const record of records) {
      history.push(
        historyEntry(
          id,
          entity,
          record.id,
          'created',
          diffRecords({}, record, ['id', 'customerId', 'createdAt', 'updatedAt']),
          record.createdAt,
        ),
      );
    }
  }

  return { customer, lifeEvents, reminders, conversations, history };
}
