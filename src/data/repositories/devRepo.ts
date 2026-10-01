/** Developer tools: look at what is really stored (counts, ciphertext preview). */
import { bytesToHex } from '@/core/crypto/format';
import { db, DATA_TABLES } from '../db';
import { metaRepo } from './metaRepo';

export interface RawPreview {
  id: string;
  updatedAt: string;
  iv: string;
  ciphertext: string;
  bytes: number;
}

export const devRepo = {
  async counts(): Promise<Record<string, number>> {
    const entries = await Promise.all(
      DATA_TABLES.map(async (table) => [table, await db.table(table).count()] as const),
    );
    return Object.fromEntries(entries);
  },

  /** The stored row of the newest customer, as it lies in IndexedDB. */
  async newestCustomerRow(): Promise<RawPreview | null> {
    const row = await db.customers.orderBy('updatedAt').last();
    if (!row) return null;
    return {
      id: row.id,
      updatedAt: row.updatedAt,
      iv: bytesToHex(row.payload.iv),
      ciphertext: bytesToHex(row.payload.ct, 24),
      bytes: row.payload.ct.length,
    };
  },

  lastCustomerSequence: () => metaRepo.lastCustomerSequence(),
};
