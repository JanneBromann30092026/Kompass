import { useEffect, useMemo } from 'react';
import { useToday } from '@/app/hooks/useToday';
import { daysBetween } from '@/core/dates';
import { isDue } from '@/core/reminders/schedule';
import { reminderActionsRepo } from '@/data/repositories';
import type { Reminder } from '@/data/schemas';
import { useDataStore } from '@/data/store';
import { de } from '@/i18n/de';

const t = de.reminders;

/** Reminders of active (not archived) customers. */
export function useActiveReminders(): Reminder[] {
  const reminders = useDataStore((state) => state.reminders);
  const customers = useDataStore((state) => state.customers);
  return useMemo(
    () =>
      Object.values(reminders).filter((reminder) => {
        const customer = customers[reminder.customerId];
        return customer !== undefined && !customer.archived;
      }),
    [reminders, customers],
  );
}

/** Open reminders due today or earlier (badge on the navigation). */
export function useDueCount(): number {
  const today = useToday();
  const reminders = useActiveReminders();
  return useMemo(
    () => reminders.filter((reminder) => isDue(reminder, today)).length,
    [reminders, today],
  );
}

/** "heute", "morgen", "in 5 Tagen", "vor 3 Tagen". */
export function dueLabel(dueDate: string, today: string): string {
  const days = daysBetween(today, dueDate);
  if (days === 0) return t.due.today;
  if (days === 1) return t.due.tomorrow;
  if (days === -1) return t.due.yesterday;
  return days > 0 ? t.due.inDays(days) : t.due.daysAgo(-days);
}

const SYNC_DELAY_MS = 300;

/**
 * Keeps the automatic reminders in line with the facts while the app is unlocked: after
 * unlocking, at midnight and shortly after every change of customers, events,
 * conversations or reminders (a completed annual review moves the next one).
 */
export function useReminderSync(): void {
  const today = useToday();
  const ready = useDataStore((state) => state.ready);
  useEffect(() => {
    if (!ready) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = () => {
      reminderActionsRepo.sync(today).catch(() => {
        // Locked meanwhile or a storage error: the next change tries again.
      });
    };
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(run, SYNC_DELAY_MS);
    };
    schedule();
    const unsubscribe = useDataStore.subscribe((state, previous) => {
      if (
        state.customers !== previous.customers ||
        state.lifeEvents !== previous.lifeEvents ||
        state.conversations !== previous.conversations ||
        state.reminders !== previous.reminders
      ) {
        schedule();
      }
    });
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [ready, today]);
}
