import { vaultMetaSchema, type VaultMeta } from '@/core/crypto/format';
import type { UnlockFailures } from '@/core/lock';
import { db } from '../db';

const KEYS = {
  vault: 'vault',
  customerSequence: 'customerSequence',
  unlockFailures: 'unlockFailures',
  schema: 'schema',
} as const;

/** The vault already exists (e.g. created in another tab meanwhile). */
export class VaultExistsError extends Error {
  override readonly name = 'VaultExistsError';
}

/** Technical metadata: vault parameters, customer counter, failed unlock attempts. */
export const metaRepo = {
  async getVault(): Promise<VaultMeta | null> {
    const entry = await db.meta.get(KEYS.vault);
    if (!entry) return null;
    return vaultMetaSchema.parse(entry.value);
  },

  /** Stores the vault of a first setup; refuses to overwrite an existing one. */
  async createVault(vault: VaultMeta, appVersion: string): Promise<void> {
    await db.transaction('rw', db.meta, async () => {
      if (await db.meta.get(KEYS.vault)) throw new VaultExistsError('Vault already exists');
      await db.meta.put({ key: KEYS.vault, value: vault });
      await db.meta.put({
        key: KEYS.schema,
        value: { dbVersion: db.verno, createdWith: appVersion, createdAt: vault.createdAt },
      });
    });
  },

  async getUnlockFailures(): Promise<UnlockFailures | null> {
    const entry = await db.meta.get(KEYS.unlockFailures);
    const value = entry?.value as Partial<UnlockFailures> | undefined;
    if (typeof value?.count !== 'number' || typeof value.lastFailedAt !== 'number') return null;
    return { count: value.count, lastFailedAt: value.lastFailedAt };
  },

  async recordUnlockFailure(now: number): Promise<UnlockFailures> {
    return db.transaction('rw', db.meta, async () => {
      const previous = await metaRepo.getUnlockFailures();
      const failures = { count: (previous?.count ?? 0) + 1, lastFailedAt: now };
      await db.meta.put({ key: KEYS.unlockFailures, value: failures });
      return failures;
    });
  },

  async clearUnlockFailures(): Promise<void> {
    await db.meta.delete(KEYS.unlockFailures);
  },

  /**
   * Reserves the next customer sequence number. Numbers are never reused: a number stays
   * taken even if creating the customer fails or the customer is deleted later.
   */
  async reserveCustomerSequence(): Promise<number> {
    return metaRepo.reserveCustomerSequences(1);
  },

  /** Reserves `count` consecutive numbers at once; returns the first one. */
  async reserveCustomerSequences(count: number): Promise<number> {
    return db.transaction('rw', db.meta, async () => {
      const entry = await db.meta.get(KEYS.customerSequence);
      const last = typeof entry?.value === 'number' ? entry.value : 0;
      await db.meta.put({ key: KEYS.customerSequence, value: last + count });
      return last + 1;
    });
  },

  async lastCustomerSequence(): Promise<number> {
    const entry = await db.meta.get(KEYS.customerSequence);
    return typeof entry?.value === 'number' ? entry.value : 0;
  },
};

export const META_KEYS = KEYS;
