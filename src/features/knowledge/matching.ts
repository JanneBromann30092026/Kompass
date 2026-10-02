/** Which (active) customers a knowledge entry applies to. */
import { useMemo } from 'react';
import { formatCalendarDate } from '@/core/format';
import { CONTRACT_STATUSES, type ContractStatus } from '@/data/domain';
import {
  CONTRACT_STATUS_LABELS,
  PRODUCT_LINE_INFO,
  TOPIC_INFO,
  type KnowledgeRef,
} from '@/data/reference';
import type { Customer, LifeEvent } from '@/data/schemas';
import { useDataStore } from '@/data/store';
import type { MatchingCustomer } from './parts';

/** Contract states that say nothing about a customer's relation to the line. */
const UNRELATED: ContractStatus[] = ['open', 'notRelevant', 'no'];

const nameOf = (c: Customer) => [c.firstName, c.lastName].filter(Boolean).join(' ');
const entry = (c: Customer, detail?: string): MatchingCustomer => ({
  id: c.id,
  number: c.number,
  name: nameOf(c),
  detail,
});
const byNumber = (a: Customer, b: Customer) =>
  a.number.localeCompare(b.number, 'de', { numeric: true });

export function matchingCustomers(
  ref: KnowledgeRef,
  customers: readonly Customer[],
  lifeEvents: readonly LifeEvent[],
): MatchingCustomer[] {
  const active = customers.filter((c) => !c.archived).sort(byNumber);
  switch (ref.kind) {
    case 'product':
      return active
        .filter((c) => !UNRELATED.includes(c.contracts[ref.key]))
        .sort(
          (a, b) =>
            CONTRACT_STATUSES.indexOf(a.contracts[ref.key]) -
            CONTRACT_STATUSES.indexOf(b.contracts[ref.key]),
        )
        .map((c) => entry(c, CONTRACT_STATUS_LABELS[c.contracts[ref.key]]));
    case 'phase':
      return active.filter((c) => c.lifePhase === ref.key).map((c) => entry(c, c.occupation));
    case 'event': {
      const dates = new Map<string, string | undefined>();
      for (const event of lifeEvents) {
        if (event.kind === ref.key) dates.set(event.customerId, event.date);
      }
      return active
        .filter((c) => dates.has(c.id))
        .map((c) => {
          const date = dates.get(c.id);
          return entry(c, date ? formatCalendarDate(date) : undefined);
        });
    }
    case 'topic': {
      const lines = TOPIC_INFO[ref.key].products;
      return active
        .map((c) => ({ c, concluded: lines.filter((line) => c.contracts[line] === 'concluded') }))
        .filter(({ concluded }) => concluded.length > 0)
        .map(({ c, concluded }) =>
          entry(c, concluded.map((line) => PRODUCT_LINE_INFO[line].name).join(', ')),
        );
    }
  }
}

export function useMatchingCustomers(ref: KnowledgeRef): MatchingCustomer[] {
  const customers = useDataStore((s) => s.customers);
  const lifeEvents = useDataStore((s) => s.lifeEvents);
  return useMemo(
    () => matchingCustomers(ref, Object.values(customers), Object.values(lifeEvents)),
    // The ref is a new object per render; its kind and key identify it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ref.kind, ref.key, customers, lifeEvents],
  );
}
