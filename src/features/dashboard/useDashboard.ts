import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useToday } from '@/app/hooks/useToday';
import { EMPTY_FILTER, type CustomerFilter } from '@/core/customers/list';
import { buildDashboard, type Dashboard } from '@/core/dashboard/dashboard';
import { useDataStore } from '@/data/store';
import { useCustomerList } from '../customers/listStore';

/** Key figures of the start page from the decrypted store (recomputed on every change). */
export function useDashboard(): { dashboard: Dashboard; today: string } {
  const today = useToday();
  const customers = useDataStore((state) => state.customers);
  const lifeEvents = useDataStore((state) => state.lifeEvents);
  const needs = useDataStore((state) => state.needs);
  const reminders = useDataStore((state) => state.reminders);
  const dashboard = useMemo(
    () =>
      buildDashboard({
        customers: Object.values(customers),
        lifeEvents: Object.values(lifeEvents),
        needs: Object.values(needs),
        reminders: Object.values(reminders),
        today,
      }),
    [customers, lifeEvents, needs, reminders, today],
  );
  return { dashboard, today };
}

/** Opens the customer list with exactly this filter (search and other filters cleared). */
export function useShowCustomers(): (filter: Partial<CustomerFilter>) => void {
  const navigate = useNavigate();
  return useCallback(
    (filter) => {
      useCustomerList.setState({ query: '', filter: { ...EMPTY_FILTER, ...filter } });
      void navigate('/customers');
    },
    [navigate],
  );
}
