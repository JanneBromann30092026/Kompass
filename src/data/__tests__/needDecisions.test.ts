import { beforeEach, describe, expect, it } from 'vitest';
import { assessLine } from '@/core/needs/engine';
import { needFacts } from '@/core/needs/facts';
import { needViews } from '@/core/needs/decisions';
import { customersRepo, needDecisionsRepo, needsRepo } from '@/data/repositories';
import type { ProductLine } from '@/data/domain';
import type { Customer } from '@/data/schemas';
import { useDataStore } from '@/data/store';
import { vault } from '@/services/vault';
import { resetDb } from './testDb';

const TODAY = '2026-10-01';

beforeEach(async () => {
  vault.lock();
  await resetDb();
  await vault.init(true);
  await vault.setup('Kompass-Test-2026!');
  vault.finishOpening();
});

const current = (id: string) => useDataStore.getState().customers[id] as Customer;
const assess = (customer: Customer, line: ProductLine) =>
  assessLine(line, needFacts(customer, [], TODAY));
const decisions = (customerId: string) =>
  needsRepo.list(customerId).filter((need) => need.status !== 'open');
const viewOf = (customer: Customer, line: ProductLine) =>
  needViews([assess(customer, line)], needsRepo.list(customer.id))[0];

async function employee(): Promise<Customer> {
  return customersRepo.create({
    firstName: 'Mia',
    birthDate: '1998-04-02',
    lifePhase: 'careerStart',
    employment: 'employee',
    netIncome: 2_400,
  });
}

describe('needDecisionsRepo', () => {
  it('keeps one decision per line and records the history', async () => {
    const customer = await employee();
    const bu = assess(customer, 'bu');
    expect(bu.timing).toBe('now');

    await needDecisionsRepo.accept(customer.id, bu);
    expect(viewOf(customer, 'bu')).toMatchObject({ state: 'accepted', group: 'now' });

    await needDecisionsRepo.dismiss(customer.id, bu, 'hat schon einen Vertrag woanders');
    expect(decisions(customer.id)).toHaveLength(1);
    expect(viewOf(customer, 'bu')).toMatchObject({ state: 'dismissed', group: 'dismissed' });
    expect(decisions(customer.id)[0]?.reason).toBe('hat schon einen Vertrag woanders');

    await needDecisionsRepo.adjust(customer.id, bu, { timing: 'later', priority: 2, reason: ' ' });
    const view = viewOf(customer, 'bu');
    expect(view).toMatchObject({ state: 'adjusted', group: 'later', priority: 2 });
    expect(view?.decision?.reason).toBeUndefined();

    const history = Object.values(useDataStore.getState().history).filter(
      (entry) => entry.entity === 'need',
    );
    expect(history.map((entry) => entry.action).sort()).toEqual(['created', 'updated', 'updated']);

    await needDecisionsRepo.reset(customer.id, 'bu');
    expect(decisions(customer.id)).toHaveLength(0);
    expect(viewOf(customer, 'bu')?.state).toBe('suggested');
  });

  it('flags a decision when the facts change and keeps it on request', async () => {
    const customer = await employee();
    await needDecisionsRepo.accept(customer.id, assess(customer, 'capitalFormation'));
    expect(viewOf(customer, 'capitalFormation')?.recheck).toBe(false);

    await customersRepo.update(customer.id, { employerVl: true });
    const changed = viewOf(current(customer.id), 'capitalFormation');
    expect(changed?.recheck).toBe(true);

    await needDecisionsRepo.keep(changed!.decision!, changed!.assessment);
    expect(viewOf(current(customer.id), 'capitalFormation')?.recheck).toBe(false);
  });

  it('refuses decisions on covered lines', async () => {
    const customer = await customersRepo.create({
      firstName: 'Ole',
      contracts: { bu: 'concluded' },
    });
    expect(() => needDecisionsRepo.accept(customer.id, assess(customer, 'bu'))).toThrow();
  });
});
