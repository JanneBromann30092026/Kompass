import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/data/db';
import { customersRepo } from '@/data/repositories';
import { encryptRow } from '@/data/repositories/rows';
import { customerSchema } from '@/data/schemas';
import { useDataStore } from '@/data/store';
import { vault } from '@/services/vault';
import { resetDb } from './testDb';

async function waitFor(check: () => boolean) {
  for (let i = 0; i < 100 && !check(); i += 1) await new Promise((r) => setTimeout(r, 10));
  expect(check()).toBe(true);
}

beforeEach(async () => {
  vault.lock();
  await resetDb();
  await vault.init(true);
  await vault.setup('Kompass-Test-2026!');
  vault.finishOpening();
});

describe('sync with other tabs', () => {
  it('picks up rows written directly to the database (as another tab would)', async () => {
    const lena = await customersRepo.create({ firstName: 'Lena' });
    const now = new Date(Date.now() + 1000).toISOString();
    const other = customerSchema.parse({
      id: crypto.randomUUID(),
      number: 'K-0002',
      firstName: 'Ben',
      createdAt: now,
      updatedAt: now,
    });
    await db.customers.put(await encryptRow('customers', other));
    await waitFor(() => useDataStore.getState().customers[other.id]?.firstName === 'Ben');

    const renamed = { ...lena, firstName: 'Lena Marie', updatedAt: now };
    await db.customers.put(await encryptRow('customers', renamed));
    await waitFor(() => useDataStore.getState().customers[lena.id]?.firstName === 'Lena Marie');

    await db.customers.delete(other.id);
    await waitFor(() => !useDataStore.getState().customers[other.id]);
  });

  it('keeps local writes made right after a change', async () => {
    const created = await Promise.all(
      ['A', 'B', 'C', 'D'].map((firstName) => customersRepo.create({ firstName })),
    );
    await new Promise((r) => setTimeout(r, 50));
    expect(Object.keys(useDataStore.getState().customers).sort()).toEqual(
      created.map((c) => c.id).sort(),
    );
  });
});
