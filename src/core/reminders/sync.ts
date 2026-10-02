/**
 * Keeps the automatic reminders in line with the facts: creates missing ones, removes open
 * ones whose rule no longer applies and duplicates of the same key (e.g. created in two tabs
 * at once). Completed reminders are never removed; manual reminders (no key) are untouched.
 */
import type { Reminder } from '@/data/schemas';
import type { ReminderCandidate } from './derive';

export interface ReminderSyncPlan {
  create: ReminderCandidate[];
  remove: Reminder[];
}

/** Completed first, then the oldest – the record that survives among duplicates. */
function keepOrder(a: Reminder, b: Reminder): number {
  return (
    Number(b.done) - Number(a.done) ||
    a.createdAt.localeCompare(b.createdAt) ||
    a.id.localeCompare(b.id)
  );
}

export function planReminderSync(
  candidates: readonly ReminderCandidate[],
  existing: readonly Reminder[],
): ReminderSyncPlan {
  const byKey = new Map<string, Reminder[]>();
  for (const reminder of existing) {
    if (!reminder.ruleKey) continue;
    byKey.set(reminder.ruleKey, [...(byKey.get(reminder.ruleKey) ?? []), reminder]);
  }
  const wanted = new Set(candidates.map((candidate) => candidate.ruleKey));
  const remove: Reminder[] = [];
  for (const [key, group] of byKey) {
    const [keep, ...rest] = [...group].sort(keepOrder);
    remove.push(...rest.filter((reminder) => !reminder.done));
    if (keep && !keep.done && !wanted.has(key)) remove.push(keep);
  }
  const create = candidates.filter(
    (candidate, index) =>
      candidate.creatable &&
      !byKey.has(candidate.ruleKey) &&
      candidates.findIndex((other) => other.ruleKey === candidate.ruleKey) === index,
  );
  return { create, remove };
}

export function isEmptyPlan(plan: ReminderSyncPlan): boolean {
  return plan.create.length === 0 && plan.remove.length === 0;
}
