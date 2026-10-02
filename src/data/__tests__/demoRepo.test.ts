import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/data/db';
import { DEMO_CUSTOMERS } from '@/data/demo/demoCustomers';
import { customersRepo, metaRepo } from '@/data/repositories';
import { demoRepo } from '@/data/repositories/demoRepo';
import { useDataStore } from '@/data/store';
import { vault } from '@/services/vault';
import { rawDump, resetDb } from './testDb';

const NOW = new Date('2026-10-01T10:00:00.000Z');

beforeEach(async () => {
  vault.lock();
  await resetDb();
  await vault.init(true);
  await vault.setup('Kompass-Test-2026!');
  vault.finishOpening();
});

const count = (table: 'customers' | 'reminders' | 'conversations' | 'history' | 'lifeEvents') =>
  Object.keys(useDataStore.getState()[table]).length;

describe('demoRepo', () => {
  it('loads the 12 demo customers once (idempotent)', async () => {
    expect(await demoRepo.loadDemoData(NOW)).toEqual({ created: 12, skipped: 0 });
    const counts = {
      reminders: count('reminders'),
      conversations: count('conversations'),
      history: count('history'),
    };
    expect(counts.reminders).toBeGreaterThanOrEqual(12);
    expect(counts.conversations).toBeGreaterThanOrEqual(12);
    expect(counts.history).toBeGreaterThan(counts.reminders + counts.conversations);

    expect(await demoRepo.loadDemoData(NOW)).toEqual({ created: 0, skipped: 12 });
    expect(count('customers')).toBe(12);
    expect(count('reminders')).toBe(counts.reminders);
    expect(await db.customers.count()).toBe(12);
    expect(await metaRepo.lastCustomerSequence()).toBe(12);
    expect(customersRepo.list().map((c) => c.number)).toContain('K-0001');
    expect(demoRepo.stats()).toEqual({ customers: 12, demo: 12, synthetic: 0 });
  });

  it('stores everything encrypted', async () => {
    await demoRepo.loadDemoData(NOW);
    const dump = await rawDump();
    for (const { customer } of DEMO_CUSTOMERS) {
      expect(dump).not.toContain(customer.firstName);
      if (customer.lastName) expect(dump).not.toContain(customer.lastName);
      if (customer.phone) expect(dump).not.toContain(customer.phone);
      if (customer.email) expect(dump).not.toContain(customer.email);
    }
    expect(dump).not.toContain('Jahresgespräch');
    expect(dump).not.toContain('Jahresgespr');
  });

  it('only loads missing customers and removes nothing but demo data', async () => {
    const own = await customersRepo.create({ firstName: 'Echt' });
    await demoRepo.loadDemoData(NOW);
    const first = customersRepo.list().find((c) => c.firstName === 'Leon');
    await customersRepo.remove(first!.id);
    expect(await demoRepo.loadDemoData(NOW)).toEqual({ created: 1, skipped: 11 });
    // Numbers are never reused: the reloaded customer gets a new one.
    expect(customersRepo.list().find((c) => c.firstName === 'Leon')?.number).toBe('K-0014');

    expect(await demoRepo.removeDemoData()).toBe(12);
    expect(customersRepo.list().map((c) => c.id)).toEqual([own.id]);
    const ownHistory = Object.values(useDataStore.getState().history);
    expect(ownHistory.every((entry) => entry.customerId === own.id)).toBe(true);
    expect(count('reminders')).toBe(0);
    expect(count('conversations')).toBe(0);
    expect(count('lifeEvents')).toBe(0);
    expect(await db.history.count()).toBe(ownHistory.length);
  });

  it('adds and removes synthetic customers separately', async () => {
    await demoRepo.loadDemoData(NOW);
    const result = await demoRepo.addSynthetic(60, NOW);
    expect(result.created).toBe(60);
    expect(demoRepo.stats()).toEqual({ customers: 72, demo: 12, synthetic: 60 });
    expect(await db.customers.count()).toBe(72);
    expect(customersRepo.list().map((c) => c.number)).toContain('K-0072');

    expect(await demoRepo.removeSynthetic()).toBe(60);
    expect(demoRepo.stats()).toEqual({ customers: 12, demo: 12, synthetic: 0 });
    expect(await db.reminders.count()).toBe(count('reminders'));
  });
});
