/**
 * Working with reminders: complete (optional note, follow-up), reopen, postpone, manual
 * reminders, and the automatic sync with the facts (src/core/reminders). Every change gets
 * a history entry; a completion with follow-up is one transaction.
 */
import { diffRecords } from '@/core/history';
import { deriveReminders } from '@/core/reminders/derive';
import { isEmptyPlan, planReminderSync } from '@/core/reminders/sync';
import { nextTimestamp } from '@/core/time';
import type { Conversation, LifeEvent, Reminder } from '../schemas';
import { reminderInputSchema } from '../schemas';
import { useDataStore } from '../store';
import { createLinkedRepo, historyWrite, requireRecord, validateRecord } from './recordsRepo';
import { commit, type PendingDelete, type PendingWrite } from './rows';

const remindersRepo = createLinkedRepo('reminders', reminderInputSchema);

export interface ManualReminder {
  dueDate: string;
  title: string;
  todo?: string;
}

export interface Completion {
  note?: string;
  /** Follow-up reminder of the same customer. */
  followUp?: ManualReminder;
}

/** Thrown for actions that only manual reminders allow (deleting). */
export class AutomaticReminderError extends Error {
  constructor() {
    super('Automatic reminders cannot be deleted.');
    this.name = 'AutomaticReminderError';
  }
}

function newManual(customerId: string, input: ManualReminder, at: string): Reminder {
  return validateRecord('reminders', {
    kind: 'manual',
    dueDate: input.dueDate,
    title: input.title,
    todo: input.todo,
    id: crypto.randomUUID(),
    customerId,
    createdAt: at,
    updatedAt: at,
  });
}

function changeWrites(current: Reminder, record: Reminder): PendingWrite[] {
  const changes = diffRecords(current, record);
  if (changes.length === 0) return [];
  return [
    { table: 'reminders', record },
    historyWrite(record.customerId, 'reminders', record.id, 'updated', changes, record.updatedAt),
  ];
}

function groupBy<T extends { customerId: string }>(records: readonly T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const record of records) {
    groups.set(record.customerId, [...(groups.get(record.customerId) ?? []), record]);
  }
  return groups;
}

let syncing: Promise<number> | null = null;
let syncAgain = false;

async function runSync(today: string): Promise<number> {
  const state = useDataStore.getState();
  const lifeEvents = groupBy<LifeEvent>(Object.values(state.lifeEvents));
  const conversations = groupBy<Conversation>(Object.values(state.conversations));
  const reminders = groupBy<Reminder>(Object.values(state.reminders));
  const writes: PendingWrite[] = [];
  const deletes: PendingDelete[] = [];
  const at = nextTimestamp(undefined);
  for (const customer of Object.values(state.customers)) {
    // Archived customers stay as they are (their reminders are hidden).
    if (customer.archived) continue;
    const own = reminders.get(customer.id) ?? [];
    const candidates = deriveReminders(
      {
        customer,
        lifeEvents: lifeEvents.get(customer.id) ?? [],
        conversations: conversations.get(customer.id) ?? [],
        reminders: own,
      },
      today,
    );
    const plan = planReminderSync(candidates, own);
    if (isEmptyPlan(plan)) continue;
    for (const candidate of plan.create) {
      const record = validateRecord('reminders', {
        dueDate: candidate.dueDate,
        kind: candidate.kind,
        event: candidate.event,
        title: candidate.title,
        todo: candidate.todo,
        dateToCheck: candidate.dateToCheck,
        ruleKey: candidate.ruleKey,
        id: crypto.randomUUID(),
        customerId: customer.id,
        createdAt: at,
        updatedAt: at,
      });
      writes.push(
        { table: 'reminders', record },
        historyWrite(customer.id, 'reminders', record.id, 'created', diffRecords({}, record), at),
      );
    }
    for (const reminder of plan.remove) {
      writes.push(
        historyWrite(
          customer.id,
          'reminders',
          reminder.id,
          'deleted',
          diffRecords(reminder, {}),
          at,
        ),
      );
    }
    if (plan.remove.length > 0) {
      deletes.push({ table: 'reminders', ids: plan.remove.map((reminder) => reminder.id) });
    }
  }
  if (writes.length === 0) return 0;
  await commit(writes, deletes);
  return writes.length;
}

export const reminderActionsRepo = {
  createManual(customerId: string, input: ManualReminder): Promise<Reminder> {
    return remindersRepo.create(customerId, { kind: 'manual', ...input });
  },

  /** Title, to-do and date of a reminder (automatic ones keep their rule). */
  edit(id: string, input: ManualReminder): Promise<Reminder> {
    return remindersRepo.update(id, { ...input, todo: input.todo ?? '' });
  },

  async complete(id: string, completion: Completion = {}): Promise<Reminder> {
    const current = requireRecord('reminders', id);
    const updatedAt = nextTimestamp(current.updatedAt);
    const record = validateRecord('reminders', {
      ...current,
      done: true,
      doneAt: updatedAt,
      doneNote: completion.note,
      updatedAt,
    });
    const writes = changeWrites(current, record);
    if (completion.followUp) {
      const followUp = newManual(current.customerId, completion.followUp, updatedAt);
      writes.push(
        { table: 'reminders', record: followUp },
        historyWrite(
          followUp.customerId,
          'reminders',
          followUp.id,
          'created',
          diffRecords({}, followUp),
          updatedAt,
        ),
      );
    }
    await commit(writes);
    return record;
  },

  /** Undo a completion. */
  async reopen(id: string): Promise<Reminder> {
    const current = requireRecord('reminders', id);
    const updatedAt = nextTimestamp(current.updatedAt);
    const record = validateRecord('reminders', {
      ...current,
      done: false,
      doneAt: undefined,
      doneNote: undefined,
      updatedAt,
    });
    await commit(changeWrites(current, record));
    return record;
  },

  postpone(id: string, dueDate: string): Promise<Reminder> {
    return remindersRepo.update(id, { dueDate });
  },

  /** Only manual reminders; automatic ones would come back with the next sync. */
  async remove(id: string): Promise<void> {
    if (requireRecord('reminders', id).ruleKey) throw new AutomaticReminderError();
    await remindersRepo.remove(id);
  },

  /**
   * Brings the automatic reminders of all active customers in line with the facts. Runs one
   * at a time; a call during a run schedules one more run. Returns the number of writes.
   */
  async sync(today: string): Promise<number> {
    if (syncing) {
      syncAgain = true;
      return syncing;
    }
    let total = 0;
    try {
      do {
        syncAgain = false;
        syncing = runSync(today);
        total += await syncing;
      } while (syncAgain);
    } finally {
      syncing = null;
    }
    return total;
  },
};
