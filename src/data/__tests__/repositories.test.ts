import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/data/db';
import { ValidationError } from '@/data/errors';
import {
  campaignsRepo,
  conversationsRepo,
  customersRepo,
  lifeEventsRepo,
  metaRepo,
  needsRepo,
  remindersRepo,
} from '@/data/repositories';
import { decryptRow } from '@/data/repositories/rows';
import { useDataStore } from '@/data/store';
import { vault } from '@/services/vault';
import { resetDb } from './testDb';

beforeEach(async () => {
  vault.lock();
  await resetDb();
  await vault.init(true);
  await vault.setup('Kompass-Test-2026!');
  vault.finishOpening();
});

const historyOf = (customerId: string) =>
  Object.values(useDataStore.getState().history)
    .filter((entry) => entry.customerId === customerId)
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));

describe('customersRepo', () => {
  it('assigns sequential numbers that are never reused', async () => {
    const a = await customersRepo.create({ firstName: 'Ala' });
    const b = await customersRepo.create({ firstName: 'Ben' });
    expect([a.number, b.number]).toEqual(['K-0001', 'K-0002']);
    await customersRepo.remove(b.id);
    const c = await customersRepo.create({ firstName: 'Cem' });
    expect(c.number).toBe('K-0003');
    expect(await metaRepo.lastCustomerSequence()).toBe(3);
    expect(customersRepo.list().map((x) => x.number)).toEqual(['K-0001', 'K-0003']);
  });

  it('fills defaults and validates input', async () => {
    const customer = await customersRepo.create({ firstName: '  Lena ', lastName: '' });
    expect(customer.firstName).toBe('Lena');
    expect(customer.lastName).toBeUndefined();
    expect(customer.contracts.bu).toBe('open');
    expect(customer.contracts.household).toBe('open');
    expect(customer.tags).toEqual([]);
    expect(customer.demo).toBe(false);
    await expect(customersRepo.create({ firstName: ' ' })).rejects.toBeInstanceOf(ValidationError);
    await expect(
      customersRepo.create({ firstName: 'X', birthDate: '2004-05-06', birthYear: 2005 }),
    ).rejects.toMatchObject({ field: 'birthYear' });
    await expect(
      customersRepo.create({ firstName: 'X', email: 'kein-mail' }),
    ).rejects.toMatchObject({ field: 'email' });
  });

  it('writes encrypted rows with only technical fields readable', async () => {
    const customer = await customersRepo.create({ firstName: 'Lena', birthDate: '2004-05-06' });
    const row = await db.customers.get(customer.id);
    expect(Object.keys(row ?? {}).sort()).toEqual(['id', 'payload', 'updatedAt']);
    expect(row?.payload.v).toBe(1);
    expect(await decryptRow('customers', row!)).toEqual(customer);
  });

  it('records every change in the history (old → new)', async () => {
    const customer = await customersRepo.create({ firstName: 'Lena', occupation: 'Schülerin' });
    await customersRepo.update(customer.id, {
      occupation: 'Azubi Bankkauffrau',
      contracts: { ...customer.contracts, bu: 'concluded' },
    });
    // No change, no entry.
    await customersRepo.update(customer.id, { occupation: 'Azubi Bankkauffrau' });

    const history = historyOf(customer.id);
    expect(history.map((entry) => entry.action)).toEqual(['created', 'updated']);
    expect(history[0]?.changes).toContainEqual({ path: 'firstName', to: 'Lena' });
    expect(history[1]?.changes).toEqual([
      { path: 'contracts.bu', from: 'open', to: 'concluded' },
      { path: 'occupation', from: 'Schülerin', to: 'Azubi Bankkauffrau' },
    ]);
    expect(Date.parse(history[1]!.updatedAt)).toBeGreaterThan(Date.parse(history[0]!.updatedAt));
    // History rows are encrypted and linked to the customer.
    expect(await db.history.where('customerId').equals(customer.id).count()).toBe(2);
  });

  it('keeps the number when updating', async () => {
    const customer = await customersRepo.create({ firstName: 'Lena' });
    const updated = await customersRepo.update(customer.id, {
      firstName: 'Lena Marie',
      number: 'K-9999',
    } as never);
    expect(updated.number).toBe('K-0001');
  });

  it('deletes a customer with all their records and history', async () => {
    const lena = await customersRepo.create({ firstName: 'Lena' });
    const ben = await customersRepo.create({ firstName: 'Ben' });
    await needsRepo.create(lena.id, { productLine: 'bu', timing: 'now', priority: 1 });
    await remindersRepo.create(lena.id, {
      dueDate: '2027-05-01',
      kind: 'trainingEnd',
      title: 'Ausbildungsende',
    });
    await lifeEventsRepo.create(lena.id, { kind: 'driversLicense', date: '2026-11' });
    await conversationsRepo.create(lena.id, { date: '2026-10-01', notes: 'Erstgespräch' });
    await customersRepo.remove(lena.id);
    for (const table of [
      'customers',
      'needs',
      'reminders',
      'lifeEvents',
      'conversations',
    ] as const) {
      expect(await db.table(table).where('id').notEqual(ben.id).count()).toBe(0);
    }
    expect(await db.history.where('customerId').equals(lena.id).count()).toBe(0);
    expect(await db.history.where('customerId').equals(ben.id).count()).toBe(1);
  });
});

describe('linked records', () => {
  it('create, update and remove with history entries', async () => {
    const customer = await customersRepo.create({ firstName: 'Lena' });
    const reminder = await remindersRepo.create(customer.id, {
      dueDate: '2027-05-01',
      kind: 'trainingEnd',
      title: 'Ausbildungsende',
    });
    expect(reminder).toMatchObject({ customerId: customer.id, done: false, dateToCheck: false });
    const done = await remindersRepo.update(reminder.id, { done: true });
    expect(done.done).toBe(true);
    await remindersRepo.remove(reminder.id);
    expect(remindersRepo.list(customer.id)).toEqual([]);
    const reminderHistory = historyOf(customer.id).filter((e) => e.entity === 'reminder');
    expect(reminderHistory.map((e) => e.action)).toEqual(['created', 'updated', 'deleted']);
    expect(reminderHistory[1]?.changes).toEqual([{ path: 'done', from: false, to: true }]);
  });

  it('refuses records for unknown customers and invalid input', async () => {
    await expect(
      needsRepo.create(crypto.randomUUID(), { productLine: 'bu', timing: 'now', priority: 1 }),
    ).rejects.toMatchObject({ name: 'RecordNotFoundError' });
    const customer = await customersRepo.create({ firstName: 'Lena' });
    await expect(
      needsRepo.create(customer.id, { productLine: 'bu', timing: 'now', priority: 4 as 1 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('stores campaigns without history', async () => {
    const campaign = await campaignsRepo.create({ name: 'Azubi-Seminar', kind: 'seminar' });
    await campaignsRepo.update(campaign.id, { date: '2026-11-20' });
    expect(campaignsRepo.list()[0]?.date).toBe('2026-11-20');
    expect(Object.keys(useDataStore.getState().history)).toHaveLength(0);
  });
});
