/** Due dates of reminders: groups, postponing, next reminder per customer. */
import { addDays, addMonths, daysBetween } from '@/core/dates';
import type { Reminder } from '@/data/schemas';

export const REMINDER_BUCKETS = ['overdue', 'today', 'next30', 'next90', 'later'] as const;
export type ReminderBucket = (typeof REMINDER_BUCKETS)[number];

export function reminderBucket(dueDate: string, today: string): ReminderBucket {
  const days = daysBetween(today, dueDate);
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  if (days <= 30) return 'next30';
  if (days <= 90) return 'next90';
  return 'later';
}

/** Open and due today or earlier (badge on the tab). */
export function isDue(reminder: Reminder, today: string): boolean {
  return !reminder.done && reminder.dueDate <= today;
}

export type PostponeStep = 'week' | 'month';

/** Postpones from the due date – or from today if it is already overdue. */
export function postponedDate(dueDate: string, step: PostponeStep, today: string): string {
  const base = dueDate < today ? today : dueDate;
  return step === 'week' ? addDays(base, 7) : addMonths(base, 1);
}

/** Open reminders by due date (then title). */
export function byDueDate(a: Reminder, b: Reminder): number {
  return a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title, 'de');
}

/** The earliest open reminder of each customer. */
export function nextReminders(reminders: readonly Reminder[]): Map<string, Reminder> {
  const next = new Map<string, Reminder>();
  for (const reminder of reminders) {
    if (reminder.done) continue;
    const current = next.get(reminder.customerId);
    if (!current || byDueDate(reminder, current) < 0) next.set(reminder.customerId, reminder);
  }
  return next;
}
