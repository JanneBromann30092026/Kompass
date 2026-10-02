import { beforeEach, describe, expect, it } from 'vitest';
import { customersRepo, metaRepo, needsRepo } from '@/data/repositories';
import { db } from '@/data/db';
import { useDataStore } from '@/data/store';
import { hasSessionKey } from '@/services/crypto/session';
import { useVault, vault } from '@/services/vault';
import { rawDump, resetDb } from './testDb';

const PASSWORD = 'Kompass-Test-2026!';

async function freshVault() {
  vault.lock();
  await resetDb();
  await vault.init(true);
  await vault.setup(PASSWORD);
  vault.finishOpening();
}

describe('vault', () => {
  beforeEach(freshVault);

  it('sets up, locks and unlocks with the right password only', async () => {
    expect(useVault.getState().status).toBe('unlocked');
    await customersRepo.create({ firstName: 'Lena', birthYear: 2004 });

    vault.lock();
    expect(useVault.getState().status).toBe('locked');
    expect(hasSessionKey()).toBe(false);
    expect(useDataStore.getState().customers).toEqual({});
    expect(() => customersRepo.list()).not.toThrow();
    expect(customersRepo.list()).toEqual([]);

    expect(await vault.unlock('falsch')).toMatchObject({ ok: false, reason: 'wrongPassword' });
    expect(useVault.getState().failures?.count).toBe(1);
    expect(await vault.unlock(PASSWORD)).toEqual({ ok: true });
    expect(useVault.getState().status).toBe('opening');
    expect(useVault.getState().failures).toBeNull();
    expect(customersRepo.list().map((c) => c.firstName)).toEqual(['Lena']);
  });

  it('makes you wait after the third wrong password', async () => {
    vault.lock();
    await vault.unlock('falsch 1');
    await vault.unlock('falsch 2');
    expect(await vault.unlock('falsch 3')).toEqual({
      ok: false,
      reason: 'wrongPassword',
      waitMs: 5_000,
    });
    expect(await vault.unlock(PASSWORD)).toMatchObject({ ok: false, reason: 'wait' });
    expect((await metaRepo.getUnlockFailures())?.count).toBe(3);
  });

  it('stores no plaintext anywhere', async () => {
    const customer = await customersRepo.create({
      firstName: 'Lena',
      lastName: 'Musterfrau',
      phone: '+49 170 1234567',
      email: 'lena@example.org',
      occupation: 'Bankkauffrau',
      tags: ['azubi'],
    });
    await needsRepo.create(customer.id, {
      productLine: 'bu',
      timing: 'now',
      priority: 1,
      reason: 'Arbeitskraft absichern',
    });
    const dump = await rawDump();
    for (const text of ['Lena', 'Musterfrau', '1234567', 'example.org', 'Bankkauffrau', 'azubi']) {
      expect(dump).not.toContain(text);
    }
    expect(dump).toContain(customer.id);
  });

  it('refuses a second setup', async () => {
    await expect(vault.setup('noch ein Passwort')).rejects.toThrow('Vault already exists');
  });

  it('changes the password and re-encrypts every row', async () => {
    const lena = await customersRepo.create({ firstName: 'Lena' });
    await needsRepo.create(lena.id, { productLine: 'liability', timing: 'later', priority: 1 });
    const before = (await db.customers.get(lena.id))?.payload.ct;

    expect(await vault.changePassword('falsch', 'Neues-Passwort-2026')).toBe(false);
    expect(await vault.changePassword(PASSWORD, 'Neues-Passwort-2026')).toBe(true);
    const after = (await db.customers.get(lena.id))?.payload.ct;
    expect(Array.from(after ?? [])).not.toEqual(Array.from(before ?? []));
    // The session keeps working with the new key.
    await customersRepo.update(lena.id, { occupation: 'Azubi' });

    vault.lock();
    expect(await vault.unlock(PASSWORD)).toMatchObject({ ok: false });
    expect(await vault.unlock('Neues-Passwort-2026')).toEqual({ ok: true });
    expect(customersRepo.get(lena.id)?.occupation).toBe('Azubi');
    expect(Object.values(useDataStore.getState().needs)).toHaveLength(1);
    expect((await metaRepo.getVault())?.passwordChangedAt).toBeDefined();
  });

  it('resets everything', async () => {
    await customersRepo.create({ firstName: 'Lena' });
    await vault.resetAll();
    expect(useVault.getState().status).toBe('setup');
    await db.open();
    expect(await db.customers.count()).toBe(0);
    expect(await metaRepo.getVault()).toBeNull();
  });
});
