/**
 * Conversation preparation on one screen: open needs by priority, three hooks, possible
 * objections to the most pressing needs, open points and the reminders that are due soon.
 */
import { addDays } from '@/core/dates';
import type { NeedView } from '@/core/needs/decisions';
import type { Hook } from '@/core/needs/hooks';
import { byDueDate } from '@/core/reminders/schedule';
import type { ProductLine } from '@/data/domain';
import { NEED_RULES } from '@/data/reference';
import type { NeedRule } from '@/data/reference/schemas';
import type { Conversation, Customer, Reminder } from '@/data/schemas';

export const PREPARATION_LIMITS = {
  needs: 6,
  hooks: 3,
  objectionLines: 3,
  objectionsPerLine: 2,
  /** Reminders due up to this many days ahead (overdue ones always). */
  reminderDays: 30,
} as const;

export interface ObjectionGroup {
  line: ProductLine;
  items: NeedRule['objections'];
}

export interface Preparation {
  /** Open needs: "now" before "later", each by priority. */
  needs: NeedView[];
  hooks: Hook[];
  objections: ObjectionGroup[];
  openPoints: string[];
  reminders: Reminder[];
  lastConversation?: Conversation;
}

export interface PreparationInput {
  customer: Customer;
  views: readonly NeedView[];
  hooks: readonly Hook[];
  reminders: readonly Reminder[];
  conversations: readonly Conversation[];
  today: string;
}

const OPEN_GROUPS = new Set(['now', 'later']);

export function buildPreparation(input: PreparationInput): Preparation {
  const { customer, today } = input;
  const own = <T extends { customerId: string }>(records: readonly T[]) =>
    records.filter((record) => record.customerId === customer.id);

  // The views come sorted by group and priority (needViews).
  const needs = input.views
    .filter((view) => OPEN_GROUPS.has(view.group))
    .slice(0, PREPARATION_LIMITS.needs);

  const objections = needs
    .filter((view) => view.group === 'now')
    .slice(0, PREPARATION_LIMITS.objectionLines)
    .map((view) => ({
      line: view.line,
      items: NEED_RULES[view.line].objections.slice(0, PREPARATION_LIMITS.objectionsPerLine),
    }))
    .filter((group) => group.items.length > 0);

  const horizon = addDays(today, PREPARATION_LIMITS.reminderDays);
  const reminders = own(input.reminders)
    .filter((reminder) => !reminder.done && reminder.dueDate <= horizon)
    .sort(byDueDate);

  const lastConversation = own(input.conversations)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .at(0);

  return {
    needs,
    hooks: input.hooks.slice(0, PREPARATION_LIMITS.hooks),
    objections,
    openPoints: customer.openPoints,
    reminders,
    lastConversation,
  };
}
