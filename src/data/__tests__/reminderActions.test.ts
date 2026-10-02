import { beforeEach, describe, expect, it } from 'vitest';
import {
  AutomaticReminderError,
  customersRepo,
  lifeEventsRepo,
  reminderActionsRepo,
  remindersRepo,
} from '@/data/repositories';
import type { Reminder } from '@/data/schemas';
import { useDataStore } from '@/data/store';
import { vault } from '@/services/vault';
import { rawDump, resetDb } from './testDb';

const TODAY = '2026-10-01';

beforeEach(async () => {
  vault.lock();
  await resetDb();
  await vault.init(true);
  await vault.setup('Kompass-Test-2026!');
  vault.finishOpening();
});

const remindersOf = (customerId: string) =>
  remindersRepo.list(customerId).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
const summary = (reminders: Reminder[]) =>
  reminders.map((r) => `${r.kind} ${r.dueDate}${r.done ? ' done' : ''}`);
const historyOf = (entityId: string) =>
  Object.values(useDataStore.getState().history)
    .filter((entry) => entry.entityId === entityId)
    .map((entry) => entry.action);

describe('reminderActionsRepo.sync', () => {
  it('derives once, without duplicates, and follows fact changes', async () => {
    const customer = await customersRepo.create({
      firstName: 'Ben',
      birthDate: '2010-03-14',
      trainingEnd: '2027-01',
    });
    expect(await reminderActionsRepo.sync(TODAY)).toBeGreaterThan(0);
    const first = remindersOf(customer.id);
    expect(summary(first).map((s) => s.split(' ')[0])).toEqual([
      'trainingEnd',
      'annualReview',
      'eighteenthBirthday',
    ]);
    expect(historyOf(first[0]?.id ?? '')).toEqual(['created']);

    // A second run changes nothing.
    expect(await reminderActionsRepo.sync(TODAY)).toBe(0);
    expect(remindersOf(customer.id)).toHaveLength(3);

    // Training ends later: the open reminder moves, a completed one would stay.
    await customersRepo.update(customer.id, { trainingEnd: '2027-06' });
    await reminderActionsRepo.sync(TODAY);
    expect(summary(remindersOf(customer.id))).toContain('trainingEnd 2027-03-01');
    expect(summary(remindersOf(customer.id))).not.toContain('trainingEnd 2026-10-01');

    // A recorded event with a date gets its reminder.
    await lifeEventsRepo.create(customer.id, { kind: 'move', date: '2026-11-15' });
    await reminderActionsRepo.sync(TODAY);
    expect(remindersOf(customer.id).find((r) => r.event === 'move')?.dueDate).toBe('2026-11-15');

    // Encrypted: the rule key (with dates) is not readable.
    expect(await rawDump()).not.toContain('trainingEnd:2027');
  });

  it('runs one at a time', async () => {
    await customersRepo.create({ firstName: 'Ida' });
    const [a, b] = await Promise.all([
      reminderActionsRepo.sync(TODAY),
      reminderActionsRepo.sync(TODAY),
    ]);
    expect(a).toBeGreaterThan(0);
    expect(b).toBeGreaterThanOrEqual(0);
    expect(remindersRepo.list()).toHaveLength(1);
  });

  it('leaves archived customers alone', async () => {
    const customer = await customersRepo.create({ firstName: 'Ole', archived: true });
    expect(await reminderActionsRepo.sync(TODAY)).toBe(0);
    expect(remindersOf(customer.id)).toEqual([]);
  });
});

describe('reminderActionsRepo', () => {
  it('completes with note and follow-up, reopens, postpones', async () => {
    const customer = await customersRepo.create({ firstName: 'Mia' });
    await reminderActionsRepo.sync(TODAY);
    const [review] = remindersOf(customer.id);
    expect(review?.kind).toBe('annualReview');

    await reminderActionsRepo.complete(review?.id ?? '', {
      note: 'Termin gemacht',
      followUp: { dueDate: '2026-11-01', title: 'Angebot nachfassen' },
    });
    const done = useDataStore.getState().reminders[review?.id ?? ''];
    expect(done).toMatchObject({ done: true, doneNote: 'Termin gemacht' });
    expect(done?.doneAt).toBeDefined();
    const followUp = remindersOf(customer.id).find((r) => r.kind === 'manual');
    expect(followUp).toMatchObject({ dueDate: '2026-11-01', title: 'Angebot nachfassen' });
    expect(historyOf(review?.id ?? '')).toEqual(['created', 'updated']);

    // The completed annual review counts as contact: the next one follows in 12 months.
    await reminderActionsRepo.sync(TODAY);
    const next = remindersOf(customer.id).filter((r) => r.kind === 'annualReview' && !r.done);
    expect(next).toHaveLength(1);
    expect(next[0]?.dueDate.slice(0, 4)).toBe(String(new Date().getFullYear() + 1));

    // Undo: the follow-up review goes again.
    await reminderActionsRepo.reopen(review?.id ?? '');
    await reminderActionsRepo.sync(TODAY);
    const reviews = remindersOf(customer.id).filter((r) => r.kind === 'annualReview');
    expect(summary(reviews)).toEqual([`annualReview ${review?.dueDate}`]);

    await reminderActionsRepo.postpone(review?.id ?? '', '2027-02-01');
    await reminderActionsRepo.sync(TODAY);
    expect(useDataStore.getState().reminders[review?.id ?? '']?.dueDate).toBe('2027-02-01');
  });

  it('deletes only manual reminders', async () => {
    const customer = await customersRepo.create({ firstName: 'Lea' });
    await reminderActionsRepo.sync(TODAY);
    const [automatic] = remindersOf(customer.id);
    await expect(reminderActionsRepo.remove(automatic?.id ?? '')).rejects.toBeInstanceOf(
      AutomaticReminderError,
    );
    const manual = await reminderActionsRepo.createManual(customer.id, {
      dueDate: '2026-10-10',
      title: 'Rückruf',
    });
    await reminderActionsRepo.edit(manual.id, {
      dueDate: '2026-10-12',
      title: 'Rückruf',
      todo: '',
    });
    expect(useDataStore.getState().reminders[manual.id]?.dueDate).toBe('2026-10-12');
    await reminderActionsRepo.remove(manual.id);
    expect(remindersOf(customer.id)).toHaveLength(1);
  });
});
