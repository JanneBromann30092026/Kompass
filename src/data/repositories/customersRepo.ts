import { formatCustomerNumber } from '@/core/customerNumber';
import { diffRecords } from '@/core/history';
import { nextTimestamp } from '@/core/time';
import { parseOrThrow } from '../errors';
import { customerInputSchema, type Customer, type CustomerInput } from '../schemas';
import { useDataStore } from '../store';
import { metaRepo } from './metaRepo';
import { historyWrite, requireRecord, validateRecord, type LinkedTable } from './recordsRepo';
import { commit } from './rows';

const LINKED: LinkedTable[] = ['needs', 'reminders', 'lifeEvents', 'conversations'];

export const customersRepo = {
  /** Decrypted customers, ordered by customer number. */
  list(): Customer[] {
    return Object.values(useDataStore.getState().customers).sort((a, b) =>
      a.number.localeCompare(b.number, 'de', { numeric: true }),
    );
  },

  get(id: string): Customer | undefined {
    return useDataStore.getState().customers[id];
  },

  async create(input: CustomerInput): Promise<Customer> {
    const fields = parseOrThrow(customerInputSchema, input);
    const sequence = await metaRepo.reserveCustomerSequence();
    const now = nextTimestamp(undefined);
    const record = validateRecord('customers', {
      ...fields,
      id: crypto.randomUUID(),
      number: formatCustomerNumber(sequence),
      createdAt: now,
      updatedAt: now,
    });
    await commit([
      { table: 'customers', record },
      historyWrite(record.id, 'customers', record.id, 'created', diffRecords({}, record), now),
    ]);
    return record;
  },

  async update(id: string, patch: Partial<CustomerInput>): Promise<Customer> {
    const current = requireRecord('customers', id);
    const updatedAt = nextTimestamp(current.updatedAt);
    // The number is assigned once and never changes.
    const record = validateRecord('customers', {
      ...current,
      ...patch,
      id,
      number: current.number,
      updatedAt,
    });
    const changes = diffRecords(current, record);
    if (changes.length === 0) return current;
    await commit([
      { table: 'customers', record },
      historyWrite(id, 'customers', id, 'updated', changes, updatedAt),
    ]);
    return record;
  },

  /**
   * Deletes the customer with everything that belongs to them, including the history
   * (right to erasure). The customer number is not reused.
   */
  async remove(id: string): Promise<void> {
    requireRecord('customers', id);
    await customersRepo.removeMany([id]);
  },

  /** Deletes several customers with everything that belongs to them in one transaction. */
  async removeMany(ids: readonly string[]): Promise<void> {
    if (ids.length === 0) return;
    const doomed = new Set(ids);
    const state = useDataStore.getState();
    const owned = (table: LinkedTable | 'history') =>
      Object.values<{ id: string; customerId: string }>(state[table])
        .filter((item) => doomed.has(item.customerId))
        .map((item) => item.id);
    await commit(
      [],
      [
        { table: 'customers', ids: [...doomed] },
        ...LINKED.map((table) => ({ table, ids: owned(table) })),
        { table: 'history', ids: owned('history') },
      ],
    );
  },
};
