/** Search, filters and sorting of the customer list (UI state; reset when locking). */
import { create } from 'zustand';
import { EMPTY_FILTER, type CustomerFilter, type CustomerSort } from '@/core/customers/list';
import { useVault } from '@/services/vault';

interface ListState {
  query: string;
  filter: CustomerFilter;
  sort: CustomerSort;
  setQuery: (query: string) => void;
  setFilter: (patch: Partial<CustomerFilter>) => void;
  setSort: (sort: CustomerSort) => void;
  resetFilter: () => void;
}

const INITIAL = { query: '', filter: EMPTY_FILTER, sort: 'number' as CustomerSort };

export const useCustomerList = create<ListState>((set) => ({
  ...INITIAL,
  setQuery: (query) => set({ query }),
  setFilter: (patch) => set((state) => ({ filter: { ...state.filter, ...patch } })),
  setSort: (sort) => set({ sort }),
  resetFilter: () => set({ filter: EMPTY_FILTER }),
}));

// A search can contain a name: forget it together with the decrypted data.
useVault.subscribe((state) => {
  if (state.status !== 'unlocked') useCustomerList.setState(INITIAL);
});
