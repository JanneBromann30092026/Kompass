/**
 * Pseudonymised calendar entries: only the customer number and the occasion. Never names,
 * contact data, free text (titles and to-dos of reminders may contain them) or anything
 * that reveals the birth date (the 18th birthday gets a neutral occasion).
 */
import type { LifeEventKind, ReminderKind } from '@/data/domain';
import type { Customer, Reminder } from '@/data/schemas';
import type { IcsEvent } from './ics';

export interface CalendarLabels {
  kinds: Readonly<Record<Exclude<ReminderKind, 'lifeEvent'>, string>>;
  events: Readonly<Record<LifeEventKind, string>>;
  description: (number: string) => string;
}

export function calendarOccasion(reminder: Reminder, labels: CalendarLabels): string {
  if (reminder.kind !== 'lifeEvent') return labels.kinds[reminder.kind];
  if (reminder.event === 'eighteenthBirthday') return labels.kinds.eighteenthBirthday;
  return reminder.event ? labels.events[reminder.event] : labels.kinds.manual;
}

export function calendarEvents(
  reminders: readonly Reminder[],
  customers: Readonly<Record<string, Customer>>,
  labels: CalendarLabels,
): IcsEvent[] {
  return reminders.flatMap((reminder) => {
    const customer = customers[reminder.customerId];
    if (!customer) return [];
    return [
      {
        uid: reminder.id,
        date: reminder.dueDate,
        summary: `${customer.number} · ${calendarOccasion(reminder, labels)}`,
        description: labels.description(customer.number),
      },
    ];
  });
}
