/**
 * Automatic reminders from the facts of a customer (CLAUDE.md "Fachmodell" and the reminder
 * rules of the life events in src/data/reference). Every rule result has a stable key
 * (`ruleKey`): source plus the date the rule computes. The key changes only when the facts
 * change; then the old open reminder goes and a new one comes (see sync.ts).
 */
import { addMonths, firstOfMonth, localIsoDate } from '@/core/dates';
import type { LifeEventKind, ReminderKind } from '@/data/domain';
import { LIFE_EVENT_INFO } from '@/data/reference';
import type { Conversation, Customer, LifeEvent, Reminder } from '@/data/schemas';

/** Reminders whose date lies further back are not created any more (only kept). */
export const STALE_MONTHS = 6;

export interface ReminderCandidate {
  ruleKey: string;
  kind: ReminderKind;
  /** Life event behind the reminder (kind "lifeEvent"). */
  event?: LifeEventKind;
  dueDate: string;
  title: string;
  todo: string;
  /** Only the birth year is known: the date is an estimate. */
  dateToCheck: boolean;
  /** False if the rule date lies too far back to create a new reminder. */
  creatable: boolean;
}

export interface ReminderFacts {
  customer: Customer;
  /** Records of this customer (others are ignored). */
  lifeEvents: readonly LifeEvent[];
  conversations: readonly Conversation[];
  reminders: readonly Reminder[];
}

/** A date "JJJJ-MM-TT" for "JJJJ-MM" (1st of the month) or an exact date. */
const dayOf = (date: string) => (date.length === 7 ? `${date}-01` : date);

function talkingPoints(kind: LifeEventKind): string {
  return LIFE_EVENT_INFO[kind].talkingPoints.join(', ');
}

interface DatedSource {
  key: string;
  kind: LifeEventKind;
  date?: string;
  /** When the fact became known ("immediately" rules). */
  known: string;
}

/** Due date of an event reminder by its rule; undefined if the rule needs a missing date. */
function eventDueDate(source: DatedSource): string | undefined {
  const rule = LIFE_EVENT_INFO[source.kind].reminder;
  switch (rule.anchor) {
    case 'eventDate': {
      if (!source.date) return undefined;
      const due = addMonths(dayOf(source.date), rule.offsetMonths);
      return rule.firstOfMonth ? firstOfMonth(due) : due;
    }
    case 'immediately': {
      const date = source.date ? dayOf(source.date) : undefined;
      return date && date > source.known ? date : source.known;
    }
    // A recorded 18th birthday or annual review: on the recorded date.
    case 'birthday':
    case 'lastConversation':
      return source.date ? dayOf(source.date) : undefined;
  }
}

function creatableEvent(source: DatedSource, due: string, today: string): boolean {
  const rule = LIFE_EVENT_INFO[source.kind].reminder;
  // Preparing for an event makes no sense once it has passed.
  if (rule.anchor === 'eventDate' && rule.offsetMonths < 0 && source.date) {
    return dayOf(source.date) >= firstOfMonth(today);
  }
  return due >= addMonths(today, -STALE_MONTHS);
}

function eighteenthBirthday(customer: Customer): { due: string; toCheck: boolean } | undefined {
  // 29 February: addMonths clamps to 28 February in common years.
  if (customer.birthDate) return { due: addMonths(customer.birthDate, 18 * 12), toCheck: false };
  if (customer.birthYear) return { due: `${customer.birthYear + 18}-01-01`, toCheck: true };
  return undefined;
}

/** All rule results for one customer (archived customers get none). */
export function deriveReminders(facts: ReminderFacts, today: string): ReminderCandidate[] {
  const { customer } = facts;
  if (customer.archived) return [];
  const own = <T extends { customerId: string }>(records: readonly T[]) =>
    records.filter((record) => record.customerId === customer.id);
  const lifeEvents = own(facts.lifeEvents);
  const conversations = own(facts.conversations);
  const reminders = own(facts.reminders);
  const stale = addMonths(today, -STALE_MONTHS);
  const result: ReminderCandidate[] = [];

  // Start and end of training from the customer fields win over the same recorded event.
  const fieldEvents: DatedSource[] = (['trainingStart', 'trainingEnd'] as const).flatMap((kind) => {
    const date = customer[kind];
    return date ? [{ key: kind, kind, date, known: today }] : [];
  });
  const sameAsField = (event: LifeEvent) =>
    fieldEvents.some(
      (field) => field.kind === event.kind && event.date?.slice(0, 7) === field.date?.slice(0, 7),
    );
  const birthday = eighteenthBirthday(customer);
  const recorded: DatedSource[] = lifeEvents
    .filter((event) => !sameAsField(event))
    .filter((event) => !(event.kind === 'eighteenthBirthday' && birthday))
    .map((event) => ({
      key: `event:${event.id}:${event.kind}`,
      kind: event.kind,
      date: event.date,
      known: localIsoDate(new Date(event.createdAt)),
    }));

  for (const source of [...fieldEvents, ...recorded]) {
    const due = eventDueDate(source);
    if (!due) continue;
    const info = LIFE_EVENT_INFO[source.kind];
    const trainingEnd = source.kind === 'trainingEnd';
    result.push({
      ruleKey: `${source.key}:${due}`,
      kind: trainingEnd ? 'trainingEnd' : 'lifeEvent',
      event: trainingEnd ? undefined : source.kind,
      dueDate: due,
      title:
        trainingEnd && customer.lifePhase === 'studies'
          ? (info.aliases[0] ?? info.name)
          : info.name,
      todo: talkingPoints(source.kind),
      dateToCheck: false,
      creatable: creatableEvent(source, due, today),
    });
  }

  if (birthday) {
    result.push({
      ruleKey: `eighteenthBirthday:${birthday.due}`,
      kind: 'eighteenthBirthday',
      dueDate: birthday.due,
      title: LIFE_EVENT_INFO.eighteenthBirthday.name,
      todo: talkingPoints('eighteenthBirthday'),
      dateToCheck: birthday.toCheck,
      creatable: birthday.due >= stale,
    });
  }

  // Annual review: 12 months after the last contact (conversation, completed annual review
  // or the first contact). Always created – an overdue review is still due. The key names
  // the kind of contact, so completing a review on the day of the previous contact still
  // yields a new key (and thus the next review).
  const rule = LIFE_EVENT_INFO.annualReview.reminder;
  const months = rule.anchor === 'lastConversation' ? rule.offsetMonths : 12;
  const contacts = [
    { date: localIsoDate(new Date(customer.createdAt)), source: 'contact' },
    ...conversations.map((conversation) => ({ date: conversation.date, source: 'contact' })),
    ...reminders
      .filter((reminder) => reminder.kind === 'annualReview' && reminder.done && reminder.doneAt)
      .map((reminder) => ({
        date: localIsoDate(new Date(reminder.doneAt ?? '')),
        source: 'review',
      })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.source.localeCompare(b.source));
  const lastContact = contacts.at(-1);
  if (lastContact) {
    const due = addMonths(lastContact.date, months);
    result.push({
      ruleKey: `annualReview:${lastContact.source}:${due}`,
      kind: 'annualReview',
      dueDate: due,
      title: LIFE_EVENT_INFO.annualReview.name,
      todo: talkingPoints('annualReview'),
      dateToCheck: false,
      creatable: true,
    });
  }
  return result;
}
