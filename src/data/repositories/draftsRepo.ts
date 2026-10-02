/** Drafts of multi-step forms; encrypted, so they survive locking and reloading. */
import { deterministicUuid } from '@/core/deterministicId';
import { nextTimestamp } from '@/core/time';
import type { Draft } from '../schemas';
import { dataStore } from '../store';
import { validateRecord } from './recordsRepo';
import { commit } from './rows';

/** There is one draft for a new customer at a time. */
export const NEW_CUSTOMER_DRAFT_ID = deterministicUuid('kompass:draft:newCustomer');

export const draftsRepo = {
  get(id: string): Draft | undefined {
    return dataStore.get('drafts', id);
  },

  async save(id: string, kind: Draft['kind'], step: number, data: Record<string, unknown>) {
    const current = dataStore.get('drafts', id);
    const now = nextTimestamp(current?.updatedAt);
    const record = validateRecord('drafts', {
      id,
      kind,
      step,
      // Plain JSON only (no undefined, no class instances).
      data: JSON.parse(JSON.stringify(data)) as Record<string, unknown>,
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
    });
    await commit([{ table: 'drafts', record }]);
    return record;
  },

  async remove(id: string): Promise<void> {
    if (!dataStore.get('drafts', id)) return;
    await commit([], [{ table: 'drafts', ids: [id] }]);
  },
};
