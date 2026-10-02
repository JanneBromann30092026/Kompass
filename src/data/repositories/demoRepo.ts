/**
 * Demo and synthetic data (developer mode). Everything is written through the normal
 * encrypted path and marked as demo, so it can be removed in one go.
 */
import { formatCustomerNumber } from '@/core/customerNumber';
import { localIsoDate } from '@/core/dates';
import { DATA_TABLES } from '../db';
import { buildDemoCustomer, demoCustomerId, type DemoBuild } from '../demo/buildDemo';
import { DEMO_CUSTOMERS } from '../demo/demoCustomers';
import { buildSyntheticCustomers, SYNTHETIC_TAG } from '../demo/synthetic';
import type { Customer } from '../schemas';
import { useDataStore } from '../store';
import { customersRepo } from './customersRepo';
import { metaRepo } from './metaRepo';
import { validateRecord } from './recordsRepo';
import { commit, loadAllData, type PendingWrite } from './rows';

/** Customers per transaction when importing many at once. */
const BATCH = 50;

export function isSynthetic(customer: Customer): boolean {
  return customer.demo && customer.tags.includes(SYNTHETIC_TAG);
}

function writesOf(build: DemoBuild): PendingWrite[] {
  return [
    { table: 'customers', record: validateRecord('customers', build.customer) },
    ...build.lifeEvents.map((r) => ({
      table: 'lifeEvents' as const,
      record: validateRecord('lifeEvents', r),
    })),
    ...build.reminders.map((r) => ({
      table: 'reminders' as const,
      record: validateRecord('reminders', r),
    })),
    ...build.conversations.map((r) => ({
      table: 'conversations' as const,
      record: validateRecord('conversations', r),
    })),
    ...build.history.map((r) => ({
      table: 'history' as const,
      record: validateRecord('history', r),
    })),
  ];
}

async function importBuilds(builds: DemoBuild[]): Promise<void> {
  for (let start = 0; start < builds.length; start += BATCH) {
    await commit(builds.slice(start, start + BATCH).flatMap(writesOf));
  }
}

export interface DemoStats {
  customers: number;
  demo: number;
  synthetic: number;
}

export const demoRepo = {
  stats(): DemoStats {
    const customers = Object.values(useDataStore.getState().customers);
    return {
      customers: customers.length,
      demo: customers.filter((c) => c.demo && !isSynthetic(c)).length,
      synthetic: customers.filter(isSynthetic).length,
    };
  },

  /**
   * Loads the 12 demo customers. Idempotent: customers that already exist (stable ids) are
   * skipped; only missing ones are created and get the next customer numbers.
   */
  async loadDemoData(now: Date = new Date()): Promise<{ created: number; skipped: number }> {
    const existing = useDataStore.getState().customers;
    const missing = DEMO_CUSTOMERS.filter((source) => !existing[demoCustomerId(source.key)]);
    if (missing.length === 0) return { created: 0, skipped: DEMO_CUSTOMERS.length };
    const first = await metaRepo.reserveCustomerSequences(missing.length);
    const options = { today: localIsoDate(now), now: now.toISOString() };
    const builds = missing.map((source, index) =>
      buildDemoCustomer(source, { ...options, number: formatCustomerNumber(first + index) }),
    );
    await importBuilds(builds);
    return { created: builds.length, skipped: DEMO_CUSTOMERS.length - builds.length };
  },

  /** Removes the demo customers (not the synthetic ones) with all their records. */
  async removeDemoData(): Promise<number> {
    const ids = Object.values(useDataStore.getState().customers)
      .filter((c) => c.demo && !isSynthetic(c))
      .map((c) => c.id);
    await customersRepo.removeMany(ids);
    return ids.length;
  },

  /** Adds `count` synthetic customers for performance tests; returns the time taken. */
  async addSynthetic(
    count: number,
    now: Date = new Date(),
  ): Promise<{ created: number; ms: number }> {
    const started = performance.now();
    const first = await metaRepo.reserveCustomerSequences(count);
    const builds = buildSyntheticCustomers(count, {
      today: localIsoDate(now),
      now: now.toISOString(),
      firstSequence: first,
    });
    await importBuilds(builds);
    return { created: count, ms: Math.round(performance.now() - started) };
  },

  async removeSynthetic(): Promise<number> {
    const ids = Object.values(useDataStore.getState().customers)
      .filter(isSynthetic)
      .map((c) => c.id);
    await customersRepo.removeMany(ids);
    return ids.length;
  },

  /** Decrypts all data again (like unlocking) and measures how long it takes. */
  async measureDecrypt(): Promise<{ rows: number; ms: number }> {
    const started = performance.now();
    await loadAllData();
    const ms = Math.round(performance.now() - started);
    const state = useDataStore.getState();
    const rows = DATA_TABLES.reduce((sum, table) => sum + Object.keys(state[table]).length, 0);
    return { rows, ms };
  },
};
