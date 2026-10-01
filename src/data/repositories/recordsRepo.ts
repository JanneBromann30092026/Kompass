/**
 * Writing decrypted records: validation, timestamps, history entries and the encrypted
 * commit. Every change to a customer or to a record of a customer gets a dated history
 * entry (what changed, old → new).
 */
import type { z } from 'zod';
import { diffRecords, type FieldChange } from '@/core/history';
import { nextTimestamp } from '@/core/time';
import type { DataTable } from '../db';
import { parseOrThrow, RecordNotFoundError } from '../errors';
import type { HistoryEntity, HistoryEntry } from '../schemas';
import { dataStore, useDataStore, type DataRecords } from '../store';
import { commit, recordSchema, type PendingWrite } from './rows';

export type LinkedTable = 'needs' | 'reminders' | 'lifeEvents' | 'conversations';

const HISTORY_ENTITY: Record<'customers' | LinkedTable, HistoryEntity> = {
  customers: 'customer',
  needs: 'need',
  reminders: 'reminder',
  lifeEvents: 'lifeEvent',
  conversations: 'conversation',
};

export function historyWrite(
  customerId: string,
  table: 'customers' | LinkedTable,
  entityId: string,
  action: HistoryEntry['action'],
  changes: FieldChange[],
  at: string,
): PendingWrite {
  const entry: HistoryEntry = {
    id: crypto.randomUUID(),
    customerId,
    updatedAt: at,
    entity: HISTORY_ENTITY[table],
    entityId,
    action,
    changes,
  };
  return { table: 'history', record: entry };
}

/** Validates a full record against the table schema (throws ValidationError). */
export function validateRecord<T extends DataTable>(table: T, record: unknown): DataRecords[T] {
  return parseOrThrow(recordSchema(table), record);
}

export function requireRecord<T extends DataTable>(table: T, id: string): DataRecords[T] {
  const record = dataStore.get(table, id);
  if (!record) throw new RecordNotFoundError(table, id);
  return record;
}

/** Repository for records that belong to a customer (needs, reminders, events, conversations). */
export function createLinkedRepo<T extends LinkedTable, S extends z.ZodType>(
  table: T,
  inputSchema: S,
) {
  type Item = DataRecords[T];
  return {
    list(customerId?: string): Item[] {
      const all = Object.values(useDataStore.getState()[table]) as Item[];
      return customerId ? all.filter((item) => item.customerId === customerId) : all;
    },

    async create(customerId: string, input: z.input<S>): Promise<Item> {
      requireRecord('customers', customerId);
      const fields = parseOrThrow(inputSchema, input) as object;
      const now = nextTimestamp(undefined);
      const record = validateRecord(table, {
        ...fields,
        id: crypto.randomUUID(),
        customerId,
        createdAt: now,
        updatedAt: now,
      });
      await commit([
        { table, record },
        historyWrite(customerId, table, record.id, 'created', diffRecords({}, record), now),
      ]);
      return record;
    },

    async update(id: string, patch: Partial<z.input<S>>): Promise<Item> {
      const current = requireRecord(table, id);
      const updatedAt = nextTimestamp(current.updatedAt);
      const record = validateRecord(table, { ...current, ...patch, updatedAt });
      const changes = diffRecords(current, record);
      if (changes.length === 0) return current;
      await commit([
        { table, record },
        historyWrite(record.customerId, table, id, 'updated', changes, updatedAt),
      ]);
      return record;
    },

    async remove(id: string): Promise<void> {
      const current = requireRecord(table, id);
      const at = nextTimestamp(undefined);
      await commit(
        [historyWrite(current.customerId, table, id, 'deleted', diffRecords(current, {}), at)],
        [{ table, ids: [id] }],
      );
    },
  };
}
